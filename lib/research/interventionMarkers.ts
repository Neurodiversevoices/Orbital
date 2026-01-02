import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterventionMarker, InterventionCategory } from '../../types';
import { hasActiveConsent } from './researchConsent';

const INTERVENTION_MARKERS_KEY = '@orbital:intervention_markers';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateDeidentifiedId(): string {
  return `INT-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
}

// ============================================
// INTERVENTION CATEGORY LABELS
// ============================================

export const INTERVENTION_CATEGORY_LABELS: Record<InterventionCategory, {
  label: string;
  description: string;
  examples: string[];
}> = {
  medication_start: {
    label: 'Started Medication',
    description: 'Beginning a new medication regimen',
    examples: ['Started new prescription', 'Added supplement'],
  },
  medication_stop: {
    label: 'Stopped Medication',
    description: 'Discontinuing a medication',
    examples: ['Completed course', 'Discontinued by doctor'],
  },
  dose_change: {
    label: 'Dose Adjustment',
    description: 'Change in medication dosage',
    examples: ['Increased dose', 'Reduced dose', 'Changed timing'],
  },
  therapy_start: {
    label: 'Started Therapy',
    description: 'Beginning therapeutic support',
    examples: ['Started counseling', 'Began coaching', 'Started group therapy'],
  },
  therapy_end: {
    label: 'Ended Therapy',
    description: 'Concluding therapeutic engagement',
    examples: ['Completed program', 'Graduated from therapy'],
  },
  therapy_change: {
    label: 'Therapy Change',
    description: 'Modification to therapeutic approach',
    examples: ['Changed therapist', 'New approach', 'Adjusted frequency'],
  },
  lifestyle_change: {
    label: 'Lifestyle Change',
    description: 'Significant life or habit modification',
    examples: ['New exercise routine', 'Diet change', 'Sleep schedule change'],
  },
  environmental_change: {
    label: 'Environmental Change',
    description: 'Change in surroundings or situation',
    examples: ['Moved homes', 'New job', 'Remote work started'],
  },
  support_change: {
    label: 'Support Change',
    description: 'Change in support system',
    examples: ['New caregiver', 'Support group joined', 'Care team change'],
  },
  other: {
    label: 'Other Event',
    description: 'Other significant event worth tracking',
    examples: ['Life event', 'Milestone', 'Transition'],
  },
};

// ============================================
// MARKER MANAGEMENT
// ============================================

async function getAllMarkers(): Promise<InterventionMarker[]> {
  const data = await AsyncStorage.getItem(INTERVENTION_MARKERS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveMarkers(markers: InterventionMarker[]): Promise<void> {
  await AsyncStorage.setItem(INTERVENTION_MARKERS_KEY, JSON.stringify(markers));
}

export async function getUserMarkers(userId: string): Promise<InterventionMarker[]> {
  const markers = await getAllMarkers();
  return markers.filter((m) => m.userId === userId);
}

export async function getMarker(markerId: string): Promise<InterventionMarker | null> {
  const markers = await getAllMarkers();
  return markers.find((m) => m.id === markerId) || null;
}

export async function getMarkersByCategory(
  userId: string,
  category: InterventionCategory
): Promise<InterventionMarker[]> {
  const markers = await getUserMarkers(userId);
  return markers.filter((m) => m.category === category);
}

export async function getMarkersInDateRange(
  userId: string,
  startDate: number,
  endDate: number
): Promise<InterventionMarker[]> {
  const markers = await getUserMarkers(userId);
  return markers.filter((m) => m.occurredAt >= startDate && m.occurredAt <= endDate);
}

export async function createMarker(
  userId: string,
  params: {
    category: InterventionCategory;
    label: string;
    occurredAt: number;
    notes?: string;
    isPrivate?: boolean;
  }
): Promise<InterventionMarker> {
  const marker: InterventionMarker = {
    id: generateId('mrk'),
    userId,
    category: params.category,
    label: params.label,
    occurredAt: params.occurredAt,
    createdAt: Date.now(),
    notes: params.notes,
    isPrivate: params.isPrivate ?? false,
    deidentifiedId: generateDeidentifiedId(),
  };

  const markers = await getAllMarkers();
  markers.push(marker);
  await saveMarkers(markers);

  return marker;
}

export async function updateMarker(
  markerId: string,
  updates: Partial<Pick<InterventionMarker, 'label' | 'notes' | 'occurredAt' | 'isPrivate'>>
): Promise<InterventionMarker | null> {
  const markers = await getAllMarkers();
  const index = markers.findIndex((m) => m.id === markerId);
  if (index === -1) return null;

  markers[index] = { ...markers[index], ...updates };
  await saveMarkers(markers);

  return markers[index];
}

export async function deleteMarker(markerId: string): Promise<boolean> {
  const markers = await getAllMarkers();
  const index = markers.findIndex((m) => m.id === markerId);
  if (index === -1) return false;

  markers.splice(index, 1);
  await saveMarkers(markers);

  return true;
}

export async function setMarkerPrivacy(
  markerId: string,
  isPrivate: boolean
): Promise<InterventionMarker | null> {
  return await updateMarker(markerId, { isPrivate });
}

// ============================================
// RESEARCH EXPORT (De-Identified)
// ============================================

interface DeidentifiedMarker {
  deidentifiedId: string;
  category: InterventionCategory;
  occurredAt: number;
  // No label, notes, or userId
}

export async function getResearchEligibleMarkers(
  userId: string
): Promise<DeidentifiedMarker[]> {
  // Check consent
  const hasConsent = await hasActiveConsent(userId, 'intervention_markers');
  if (!hasConsent) {
    return [];
  }

  const markers = await getUserMarkers(userId);

  // Filter out private markers and de-identify
  return markers
    .filter((m) => !m.isPrivate)
    .map((m) => ({
      deidentifiedId: m.deidentifiedId || generateDeidentifiedId(),
      category: m.category,
      occurredAt: m.occurredAt,
    }));
}

export async function getResearchMarkersByParticipant(
  cohortParticipantId: string,
  userIdMapping: Map<string, string> // participantId -> userId
): Promise<DeidentifiedMarker[]> {
  const userId = userIdMapping.get(cohortParticipantId);
  if (!userId) return [];

  return await getResearchEligibleMarkers(userId);
}

// ============================================
// MARKER STATISTICS
// ============================================

export async function getUserMarkerStats(userId: string): Promise<{
  total: number;
  byCategory: Record<InterventionCategory, number>;
  privateCount: number;
  firstMarkerAt?: number;
  lastMarkerAt?: number;
}> {
  const markers = await getUserMarkers(userId);

  const byCategory: Record<InterventionCategory, number> = {
    medication_start: 0,
    medication_stop: 0,
    dose_change: 0,
    therapy_start: 0,
    therapy_end: 0,
    therapy_change: 0,
    lifestyle_change: 0,
    environmental_change: 0,
    support_change: 0,
    other: 0,
  };

  let privateCount = 0;
  let firstMarkerAt: number | undefined;
  let lastMarkerAt: number | undefined;

  for (const marker of markers) {
    byCategory[marker.category]++;
    if (marker.isPrivate) privateCount++;

    if (!firstMarkerAt || marker.occurredAt < firstMarkerAt) {
      firstMarkerAt = marker.occurredAt;
    }
    if (!lastMarkerAt || marker.occurredAt > lastMarkerAt) {
      lastMarkerAt = marker.occurredAt;
    }
  }

  return {
    total: markers.length,
    byCategory,
    privateCount,
    firstMarkerAt,
    lastMarkerAt,
  };
}

// ============================================
// MARKER TIMELINE
// ============================================

export async function getMarkerTimeline(
  userId: string,
  options?: {
    startDate?: number;
    endDate?: number;
    categories?: InterventionCategory[];
    includePrivate?: boolean;
  }
): Promise<InterventionMarker[]> {
  let markers = await getUserMarkers(userId);

  // Filter by date range
  if (options?.startDate) {
    markers = markers.filter((m) => m.occurredAt >= options.startDate!);
  }
  if (options?.endDate) {
    markers = markers.filter((m) => m.occurredAt <= options.endDate!);
  }

  // Filter by categories
  if (options?.categories && options.categories.length > 0) {
    markers = markers.filter((m) => options.categories!.includes(m.category));
  }

  // Filter private markers
  if (!options?.includePrivate) {
    markers = markers.filter((m) => !m.isPrivate);
  }

  // Sort by occurrence date
  return markers.sort((a, b) => a.occurredAt - b.occurredAt);
}

// ============================================
// MARKER PROXIMITY
// ============================================

export async function findNearbyMarkers(
  userId: string,
  referenceDate: number,
  windowDays: number
): Promise<{
  before: InterventionMarker[];
  after: InterventionMarker[];
}> {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const markers = await getUserMarkers(userId);

  const before = markers.filter(
    (m) => m.occurredAt < referenceDate && m.occurredAt >= referenceDate - windowMs
  );
  const after = markers.filter(
    (m) => m.occurredAt >= referenceDate && m.occurredAt <= referenceDate + windowMs
  );

  return {
    before: before.sort((a, b) => b.occurredAt - a.occurredAt),
    after: after.sort((a, b) => a.occurredAt - b.occurredAt),
  };
}
