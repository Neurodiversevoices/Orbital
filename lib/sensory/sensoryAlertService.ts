import { Platform } from 'react-native';
import {
  SensoryAlertConfig,
  SensoryAlertEvent,
  AlertSeverity,
  SensoryAlertType,
} from '../../types';
import {
  getSensoryConfig,
  saveSensoryConfig,
  logSensoryEvent,
  getSensoryEvents,
  acknowledgeSensoryEvent,
} from '../storage';

// Sound level thresholds in dB
const SEVERITY_THRESHOLDS = {
  notice: 60,    // Moderate noise
  moderate: 75,  // Loud (e.g., busy restaurant)
  high: 85,      // Very loud (potential hearing risk after prolonged exposure)
};

interface SensoryAlertServiceState {
  isMonitoring: boolean;
  currentLevel: number;
  sustainedHighStart: number | null;
  lastAlertTime: number;
}

let serviceState: SensoryAlertServiceState = {
  isMonitoring: false,
  currentLevel: 0,
  sustainedHighStart: null,
  lastAlertTime: 0,
};

let monitoringInterval: NodeJS.Timeout | null = null;

export async function startSensoryMonitoring(): Promise<boolean> {
  const config = await getSensoryConfig();

  if (!config.enabled) {
    if (__DEV__) console.log('[Orbital Sensory] Monitoring disabled in config');
    return false;
  }

  if (serviceState.isMonitoring) {
    if (__DEV__) console.log('[Orbital Sensory] Already monitoring');
    return true;
  }

  serviceState.isMonitoring = true;

  // Start monitoring loop
  monitoringInterval = setInterval(async () => {
    await checkAmbientNoise(config);
  }, 5000); // Check every 5 seconds

  if (__DEV__) console.log('[Orbital Sensory] Monitoring started');
  return true;
}

export async function stopSensoryMonitoring(): Promise<void> {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  serviceState = {
    isMonitoring: false,
    currentLevel: 0,
    sustainedHighStart: null,
    lastAlertTime: 0,
  };

  if (__DEV__) console.log('[Orbital Sensory] Monitoring stopped');
}

export function isMonitoring(): boolean {
  return serviceState.isMonitoring;
}

export function getCurrentLevel(): number {
  return serviceState.currentLevel;
}

async function checkAmbientNoise(config: SensoryAlertConfig): Promise<void> {
  try {
    // Get current noise level
    // In a real implementation, this would use expo-av or native audio metering
    const currentDb = await getAmbientNoiseLevel();
    serviceState.currentLevel = currentDb;

    const now = Date.now();

    // Check if above threshold
    if (currentDb >= config.noiseThresholdDb) {
      if (!serviceState.sustainedHighStart) {
        serviceState.sustainedHighStart = now;
      }

      // Check if sustained for required duration
      const sustainedMs = now - serviceState.sustainedHighStart;
      const sustainedMinutes = sustainedMs / (60 * 1000);

      if (sustainedMinutes >= config.sustainedNoiseMinutes) {
        // Check cooldown
        const timeSinceLastAlert = now - serviceState.lastAlertTime;
        const cooldownMs = config.alertCooldownMinutes * 60 * 1000;

        if (timeSinceLastAlert >= cooldownMs) {
          // Trigger alert
          const severity = determineSeverity(currentDb);
          await triggerSensoryAlert({
            type: 'ambient_noise',
            severity,
            durationMinutes: sustainedMinutes,
            peakValue: currentDb,
          });
          serviceState.lastAlertTime = now;
          serviceState.sustainedHighStart = null; // Reset
        }
      }
    } else {
      // Below threshold, reset sustained timer
      serviceState.sustainedHighStart = null;
    }
  } catch (error) {
    if (__DEV__) console.error('[Orbital Sensory] Error checking ambient noise:', error);
  }
}

async function getAmbientNoiseLevel(): Promise<number> {
  // Platform-specific implementation
  // This is a stub that should be replaced with actual audio metering

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // In a real implementation, use expo-av or react-native-audio-api
    // For now, return a simulated value for testing
    // Real implementation would use:
    // - expo-av: Audio.Recording with metering enabled
    // - react-native-audio-api: AudioAnalyser node
    return simulateNoiseLevel();
  }

  // Web fallback - could use Web Audio API
  return 0;
}

function simulateNoiseLevel(): number {
  // Simulate realistic ambient noise levels for testing
  // In production, this would be replaced with actual microphone data
  // Returns value between 30-90 dB
  const baseLevel = 45; // Typical quiet room
  const variation = Math.random() * 20 - 10; // +/- 10 dB variation
  return Math.round(baseLevel + variation);
}

function determineSeverity(dB: number): AlertSeverity {
  if (dB >= SEVERITY_THRESHOLDS.high) return 'high';
  if (dB >= SEVERITY_THRESHOLDS.moderate) return 'moderate';
  return 'notice';
}

async function triggerSensoryAlert(params: {
  type: SensoryAlertType;
  severity: AlertSeverity;
  durationMinutes?: number;
  peakValue?: number;
}): Promise<SensoryAlertEvent> {
  const event = await logSensoryEvent({
    type: params.type,
    severity: params.severity,
    triggeredAt: Date.now(),
    durationMinutes: params.durationMinutes,
    peakValue: params.peakValue,
    acknowledged: false,
  });

  if (__DEV__) console.log(`[Orbital Sensory] Alert triggered: ${params.severity} (${params.peakValue}dB)`);

  // In a real implementation, this would trigger:
  // - Local notification
  // - Haptic feedback
  // - Optional sound (if not in quiet hours)

  return event;
}

export async function configureQuietHours(
  start: string,
  end: string
): Promise<void> {
  await saveSensoryConfig({
    quietHoursStart: start,
    quietHoursEnd: end,
  });
}

export function isQuietHours(config: SensoryAlertConfig): boolean {
  if (!config.quietHoursStart || !config.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Simple comparison - works for same-day quiet hours
  // For overnight quiet hours (e.g., 22:00-07:00), need more complex logic
  if (config.quietHoursEnd > config.quietHoursStart) {
    return currentTime >= config.quietHoursStart && currentTime <= config.quietHoursEnd;
  } else {
    // Overnight quiet hours
    return currentTime >= config.quietHoursStart || currentTime <= config.quietHoursEnd;
  }
}

export {
  getSensoryConfig,
  saveSensoryConfig,
  getSensoryEvents,
  acknowledgeSensoryEvent,
};
