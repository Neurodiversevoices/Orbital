import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SensorProxyEvent,
  SensorProxyProfile,
  SensorProxyType,
  SensorEventLevel,
  SensorConsentConfig,
} from '../../types';
import { hasActiveConsent } from './researchConsent';

const SENSOR_EVENTS_KEY = '@orbital:sensor_proxy_events';
const SENSOR_CONSENT_KEY = '@orbital:sensor_consent_config';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// SENSOR CONSENT CONFIGURATION
// ============================================

export async function getSensorConsentConfig(
  userId: string
): Promise<SensorConsentConfig | null> {
  const data = await AsyncStorage.getItem(`${SENSOR_CONSENT_KEY}:${userId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function updateSensorConsentConfig(
  userId: string,
  enabledProxies: SensorProxyType[],
  preferences: SensorConsentConfig['processingPreferences']
): Promise<SensorConsentConfig> {
  const existing = await getSensorConsentConfig(userId);
  const now = Date.now();

  const config: SensorConsentConfig = {
    userId,
    enabledProxies,
    consentedAt: existing?.consentedAt || now,
    lastModifiedAt: now,
    processingPreferences: preferences,
  };

  await AsyncStorage.setItem(`${SENSOR_CONSENT_KEY}:${userId}`, JSON.stringify(config));
  return config;
}

export async function isSensorProxyEnabled(
  userId: string,
  proxyType: SensorProxyType
): Promise<boolean> {
  const config = await getSensorConsentConfig(userId);
  if (!config) return false;
  return config.enabledProxies.includes(proxyType);
}

// ============================================
// SENSOR PROXY EVENT RECORDING
// ============================================

async function getAllSensorEvents(): Promise<SensorProxyEvent[]> {
  const data = await AsyncStorage.getItem(SENSOR_EVENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveSensorEvents(events: SensorProxyEvent[]): Promise<void> {
  await AsyncStorage.setItem(SENSOR_EVENTS_KEY, JSON.stringify(events));
}

function getTimeOfDay(timestamp: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export async function recordSensorProxyEvent(
  userId: string,
  proxyType: SensorProxyType,
  eventLevel: SensorEventLevel,
  durationMs?: number
): Promise<SensorProxyEvent | null> {
  // Check if this proxy is enabled for this user
  const isEnabled = await isSensorProxyEnabled(userId, proxyType);
  if (!isEnabled) return null;

  const now = Date.now();
  const date = new Date(now);

  const event: SensorProxyEvent = {
    id: generateId('sens'),
    userId,
    proxyType,
    eventLevel,
    occurredAt: now,
    durationMs,
    metadata: {
      timeOfDay: getTimeOfDay(now),
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    },
  };

  const events = await getAllSensorEvents();
  events.push(event);

  // Apply retention policy
  const config = await getSensorConsentConfig(userId);
  const retentionDays = config?.processingPreferences.retentionDays || 90;
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  const filteredEvents = events.filter((e) => e.occurredAt >= cutoff);

  await saveSensorEvents(filteredEvents);
  return event;
}

// ============================================
// SENSOR EVENT RETRIEVAL
// ============================================

export async function getUserSensorEvents(
  userId: string,
  proxyType?: SensorProxyType
): Promise<SensorProxyEvent[]> {
  const events = await getAllSensorEvents();
  let filtered = events.filter((e) => e.userId === userId);

  if (proxyType) {
    filtered = filtered.filter((e) => e.proxyType === proxyType);
  }

  return filtered.sort((a, b) => b.occurredAt - a.occurredAt);
}

export async function getSensorEventsInRange(
  userId: string,
  startDate: number,
  endDate: number,
  proxyType?: SensorProxyType
): Promise<SensorProxyEvent[]> {
  const events = await getUserSensorEvents(userId, proxyType);
  return events.filter((e) => e.occurredAt >= startDate && e.occurredAt <= endDate);
}

// ============================================
// SENSOR PROXY PROFILE GENERATION
// ============================================

export async function generateSensorProxyProfile(
  cohortParticipantId: string,
  userId: string,
  proxyType: SensorProxyType,
  periodDays: number = 30
): Promise<SensorProxyProfile> {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

  const events = await getSensorEventsInRange(userId, periodStart, now, proxyType);

  const eventCounts: Record<SensorEventLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    very_high: 0,
  };

  const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let weekdayCount = 0;
  let weekendCount = 0;

  for (const event of events) {
    eventCounts[event.eventLevel]++;
    if (event.metadata) {
      timeOfDayCounts[event.metadata.timeOfDay]++;
      if (event.metadata.isWeekend) weekendCount++;
      else weekdayCount++;
    }
  }

  // Find dominant time of day
  const dominantTimeOfDay = (Object.entries(timeOfDayCounts) as [typeof timeOfDayCounts extends Record<infer K, number> ? K : never, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning';

  // Calculate weekday vs weekend ratio (normalized to account for 5 weekdays vs 2 weekend days)
  const normalizedWeekday = weekdayCount / 5;
  const normalizedWeekend = weekendCount / 2;
  const weekdayVsWeekendRatio = normalizedWeekend > 0
    ? Math.round((normalizedWeekday / normalizedWeekend) * 100) / 100
    : normalizedWeekday > 0 ? 999 : 0;

  return {
    cohortParticipantId,
    proxyType,
    periodStart,
    periodEnd: now,
    eventCounts,
    averageEventsPerDay: Math.round((events.length / periodDays) * 100) / 100,
    dominantTimeOfDay,
    weekdayVsWeekendRatio,
  };
}

// ============================================
// RESEARCH EXPORT (De-Identified)
// ============================================

export async function getResearchEligibleSensorData(
  userId: string
): Promise<{
  profiles: SensorProxyProfile[];
  eventCounts: Record<SensorProxyType, number>;
} | null> {
  // Check research consent
  const hasConsent = await hasActiveConsent(userId, 'sensor_data');
  if (!hasConsent) return null;

  // Check sensor consent
  const config = await getSensorConsentConfig(userId);
  if (!config || !config.processingPreferences.includeInResearch) return null;

  // Get cohort participant ID (would be passed from cohort context)
  const cohortParticipantId = `P-SENSOR-${userId.substring(0, 8)}`;

  const profiles: SensorProxyProfile[] = [];
  const eventCounts: Record<SensorProxyType, number> = {
    noise_level: 0,
    sleep_proxy: 0,
    activity_proxy: 0,
    screen_time_proxy: 0,
    location_stability: 0,
  };

  for (const proxyType of config.enabledProxies) {
    const profile = await generateSensorProxyProfile(cohortParticipantId, userId, proxyType);
    profiles.push(profile);

    const events = await getUserSensorEvents(userId, proxyType);
    eventCounts[proxyType] = events.length;
  }

  return { profiles, eventCounts };
}

// ============================================
// NOISE LEVEL HELPERS
// ============================================

export function categorizeNoiseLevel(decibels: number): SensorEventLevel {
  if (decibels < 40) return 'low';
  if (decibels < 60) return 'moderate';
  if (decibels < 80) return 'high';
  return 'very_high';
}

// ============================================
// SLEEP PROXY HELPERS
// ============================================

export function categorizeSleepQuality(
  hoursSlept: number,
  interruptions: number
): SensorEventLevel {
  if (hoursSlept >= 7 && interruptions <= 1) return 'low'; // Good sleep = low load
  if (hoursSlept >= 6 && interruptions <= 2) return 'moderate';
  if (hoursSlept >= 5 && interruptions <= 3) return 'high';
  return 'very_high'; // Poor sleep = high load
}

// ============================================
// ACTIVITY PROXY HELPERS
// ============================================

export function categorizeActivityLevel(
  stepsOrMinutes: number,
  type: 'steps' | 'active_minutes'
): SensorEventLevel {
  if (type === 'steps') {
    if (stepsOrMinutes >= 10000) return 'very_high';
    if (stepsOrMinutes >= 7000) return 'high';
    if (stepsOrMinutes >= 3000) return 'moderate';
    return 'low';
  } else {
    if (stepsOrMinutes >= 60) return 'very_high';
    if (stepsOrMinutes >= 30) return 'high';
    if (stepsOrMinutes >= 15) return 'moderate';
    return 'low';
  }
}

// ============================================
// AGGREGATE SENSOR METRICS
// ============================================

export async function aggregateSensorProfiles(
  profiles: SensorProxyProfile[]
): Promise<{
  byProxyType: Record<SensorProxyType, {
    count: number;
    averageEventsPerDay: number;
    levelDistribution: Record<SensorEventLevel, number>;
  }>;
  timeOfDayDistribution: Record<'morning' | 'afternoon' | 'evening' | 'night', number>;
}> {
  const byProxyType: Record<SensorProxyType, {
    count: number;
    averageEventsPerDay: number;
    levelDistribution: Record<SensorEventLevel, number>;
  }> = {
    noise_level: { count: 0, averageEventsPerDay: 0, levelDistribution: { low: 0, moderate: 0, high: 0, very_high: 0 } },
    sleep_proxy: { count: 0, averageEventsPerDay: 0, levelDistribution: { low: 0, moderate: 0, high: 0, very_high: 0 } },
    activity_proxy: { count: 0, averageEventsPerDay: 0, levelDistribution: { low: 0, moderate: 0, high: 0, very_high: 0 } },
    screen_time_proxy: { count: 0, averageEventsPerDay: 0, levelDistribution: { low: 0, moderate: 0, high: 0, very_high: 0 } },
    location_stability: { count: 0, averageEventsPerDay: 0, levelDistribution: { low: 0, moderate: 0, high: 0, very_high: 0 } },
  };

  const timeOfDayDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const profile of profiles) {
    const proxyData = byProxyType[profile.proxyType];
    proxyData.count++;
    proxyData.averageEventsPerDay += profile.averageEventsPerDay;

    for (const level of Object.keys(profile.eventCounts) as SensorEventLevel[]) {
      proxyData.levelDistribution[level] += profile.eventCounts[level];
    }

    timeOfDayDistribution[profile.dominantTimeOfDay]++;
  }

  // Calculate averages
  for (const proxyType of Object.keys(byProxyType) as SensorProxyType[]) {
    const data = byProxyType[proxyType];
    if (data.count > 0) {
      data.averageEventsPerDay = Math.round((data.averageEventsPerDay / data.count) * 100) / 100;
    }
  }

  return { byProxyType, timeOfDayDistribution };
}
