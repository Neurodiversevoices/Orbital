import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Cohort,
  CohortCriteria,
  CohortMember,
  AgeBand,
  RegionBucket,
  ContextBucket,
} from '../../types';
import { hasActiveConsent } from './researchConsent';

const COHORTS_KEY = '@orbital:research_cohorts';
const COHORT_MEMBERS_KEY = '@orbital:cohort_members';
const PARTICIPANT_MAPPING_KEY = '@orbital:participant_mapping';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateOpaqueParticipantId(): string {
  // Generate a cryptographically-style random ID that cannot be traced back
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substr(2, 4).toUpperCase());
  }
  return `P-${segments.join('-')}`;
}

// ============================================
// PARTICIPANT ID MAPPING (One-Way)
// ============================================

interface ParticipantMapping {
  userId: string;
  cohortParticipantId: string;
  createdAt: number;
  // Note: This mapping is stored separately and access-controlled
  // In production, this would be in a separate secure database
}

async function getParticipantMappings(): Promise<ParticipantMapping[]> {
  const data = await AsyncStorage.getItem(PARTICIPANT_MAPPING_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function getOrCreateParticipantId(userId: string): Promise<string> {
  const mappings = await getParticipantMappings();
  const existing = mappings.find((m) => m.userId === userId);

  if (existing) {
    return existing.cohortParticipantId;
  }

  const participantId = generateOpaqueParticipantId();
  mappings.push({
    userId,
    cohortParticipantId: participantId,
    createdAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTICIPANT_MAPPING_KEY, JSON.stringify(mappings));
  return participantId;
}

// ============================================
// AGE/REGION/CONTEXT BUCKETING
// ============================================

export function calculateAgeBand(birthYear: number): AgeBand {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

export function determineRegionBucket(countryCode: string): RegionBucket {
  const northAmerica = ['US', 'CA', 'MX'];
  const europe = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL'];
  const asiaPacific = ['AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'IN'];
  const latinAmerica = ['BR', 'AR', 'CL', 'CO', 'PE'];

  if (northAmerica.includes(countryCode)) return 'north_america';
  if (europe.includes(countryCode)) return 'europe';
  if (asiaPacific.includes(countryCode)) return 'asia_pacific';
  if (latinAmerica.includes(countryCode)) return 'latin_america';
  return 'other';
}

export function inferContextBucket(
  primaryContext?: string,
  secondaryContexts?: string[]
): ContextBucket {
  const contexts = [primaryContext, ...(secondaryContexts || [])].filter(Boolean);

  if (contexts.length === 0) return 'mixed';
  if (contexts.includes('work') && contexts.length === 1) return 'work';
  if (contexts.includes('education') && contexts.length === 1) return 'education';
  if (contexts.includes('caregiving')) return 'caregiving';
  if (contexts.length === 1 && contexts[0] === 'personal') return 'personal';
  return 'mixed';
}

// ============================================
// COHORT MANAGEMENT
// ============================================

export async function getCohorts(): Promise<Cohort[]> {
  const data = await AsyncStorage.getItem(COHORTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getCohort(cohortId: string): Promise<Cohort | null> {
  const cohorts = await getCohorts();
  return cohorts.find((c) => c.id === cohortId) || null;
}

export async function getActiveCohorts(): Promise<Cohort[]> {
  const cohorts = await getCohorts();
  const now = Date.now();
  return cohorts.filter((c) => !c.expiresAt || c.expiresAt > now);
}

export async function getCohortsByStudy(studyId: string): Promise<Cohort[]> {
  const cohorts = await getCohorts();
  return cohorts.filter((c) => c.studyId === studyId);
}

export async function createCohort(
  params: {
    name: string;
    description: string;
    criteria: CohortCriteria;
    studyId?: string;
    expiresInDays?: number;
  },
  createdBy: string
): Promise<Cohort> {
  const now = Date.now();

  const cohort: Cohort = {
    id: generateId('chrt'),
    name: params.name,
    description: params.description,
    criteria: params.criteria,
    memberCount: 0,
    createdAt: now,
    createdBy,
    studyId: params.studyId,
    isLocked: false,
    expiresAt: params.expiresInDays
      ? now + params.expiresInDays * 24 * 60 * 60 * 1000
      : undefined,
  };

  const cohorts = await getCohorts();
  cohorts.push(cohort);
  await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));

  return cohort;
}

export async function updateCohortCriteria(
  cohortId: string,
  criteria: CohortCriteria
): Promise<Cohort | null> {
  const cohorts = await getCohorts();
  const index = cohorts.findIndex((c) => c.id === cohortId);
  if (index === -1) return null;

  if (cohorts[index].isLocked) {
    throw new Error('Cannot modify locked cohort');
  }

  cohorts[index].criteria = criteria;
  await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));

  return cohorts[index];
}

export async function lockCohort(cohortId: string): Promise<Cohort | null> {
  const cohorts = await getCohorts();
  const index = cohorts.findIndex((c) => c.id === cohortId);
  if (index === -1) return null;

  cohorts[index].isLocked = true;
  cohorts[index].lockedAt = Date.now();
  await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));

  return cohorts[index];
}

export async function deleteCohort(cohortId: string): Promise<boolean> {
  const cohorts = await getCohorts();
  const index = cohorts.findIndex((c) => c.id === cohortId);
  if (index === -1) return false;

  if (cohorts[index].isLocked) {
    throw new Error('Cannot delete locked cohort');
  }

  cohorts.splice(index, 1);
  await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));

  // Also remove members
  await removeCohortMembers(cohortId);

  return true;
}

// ============================================
// COHORT MEMBERS
// ============================================

async function getAllCohortMembers(): Promise<{ cohortId: string; member: CohortMember }[]> {
  const data = await AsyncStorage.getItem(COHORT_MEMBERS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveCohortMembers(
  members: { cohortId: string; member: CohortMember }[]
): Promise<void> {
  await AsyncStorage.setItem(COHORT_MEMBERS_KEY, JSON.stringify(members));
}

export async function getCohortMembers(cohortId: string): Promise<CohortMember[]> {
  const allMembers = await getAllCohortMembers();
  return allMembers.filter((m) => m.cohortId === cohortId).map((m) => m.member);
}

export async function addMemberToCohort(
  cohortId: string,
  userId: string,
  profile: {
    birthYear: number;
    countryCode: string;
    primaryContext?: string;
    signalCount: number;
    daysActive: number;
    firstSignalAt: number;
    lastSignalAt: number;
    hasInterventionMarkers: boolean;
    qualityScore: number;
  }
): Promise<CohortMember | null> {
  // Verify consent
  const hasConsent = await hasActiveConsent(userId, 'cohort_inclusion');
  if (!hasConsent) {
    return null;
  }

  const cohort = await getCohort(cohortId);
  if (!cohort || cohort.isLocked) {
    return null;
  }

  // Get or create opaque participant ID
  const cohortParticipantId = await getOrCreateParticipantId(userId);

  // Check if already a member
  const allMembers = await getAllCohortMembers();
  const existingMember = allMembers.find(
    (m) => m.cohortId === cohortId && m.member.cohortParticipantId === cohortParticipantId
  );
  if (existingMember) {
    return existingMember.member;
  }

  // Create de-identified member record
  const member: CohortMember = {
    cohortParticipantId,
    ageBand: calculateAgeBand(profile.birthYear),
    region: determineRegionBucket(profile.countryCode),
    context: inferContextBucket(profile.primaryContext),
    signalCount: profile.signalCount,
    daysActive: profile.daysActive,
    firstSignalAt: profile.firstSignalAt,
    lastSignalAt: profile.lastSignalAt,
    hasInterventionMarkers: profile.hasInterventionMarkers,
    qualityScore: profile.qualityScore,
  };

  allMembers.push({ cohortId, member });
  await saveCohortMembers(allMembers);

  // Update cohort member count
  const cohorts = await getCohorts();
  const cohortIndex = cohorts.findIndex((c) => c.id === cohortId);
  if (cohortIndex >= 0) {
    cohorts[cohortIndex].memberCount++;
    await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));
  }

  return member;
}

export async function removeMemberFromCohort(
  cohortId: string,
  cohortParticipantId: string
): Promise<boolean> {
  const cohort = await getCohort(cohortId);
  if (!cohort || cohort.isLocked) {
    return false;
  }

  const allMembers = await getAllCohortMembers();
  const index = allMembers.findIndex(
    (m) => m.cohortId === cohortId && m.member.cohortParticipantId === cohortParticipantId
  );

  if (index === -1) return false;

  allMembers.splice(index, 1);
  await saveCohortMembers(allMembers);

  // Update cohort member count
  const cohorts = await getCohorts();
  const cohortIndex = cohorts.findIndex((c) => c.id === cohortId);
  if (cohortIndex >= 0) {
    cohorts[cohortIndex].memberCount--;
    await AsyncStorage.setItem(COHORTS_KEY, JSON.stringify(cohorts));
  }

  return true;
}

async function removeCohortMembers(cohortId: string): Promise<void> {
  const allMembers = await getAllCohortMembers();
  const filtered = allMembers.filter((m) => m.cohortId !== cohortId);
  await saveCohortMembers(filtered);
}

// ============================================
// COHORT CRITERIA MATCHING
// ============================================

export function matchesCriteria(member: CohortMember, criteria: CohortCriteria): boolean {
  // Age band filter
  if (criteria.ageBands && criteria.ageBands.length > 0) {
    if (!criteria.ageBands.includes(member.ageBand)) return false;
  }

  // Region filter
  if (criteria.regions && criteria.regions.length > 0) {
    if (!criteria.regions.includes(member.region)) return false;
  }

  // Context filter
  if (criteria.contexts && criteria.contexts.length > 0) {
    if (!criteria.contexts.includes(member.context)) return false;
  }

  // Minimum signal count
  if (criteria.minSignalCount !== undefined) {
    if (member.signalCount < criteria.minSignalCount) return false;
  }

  // Minimum days active
  if (criteria.minDaysActive !== undefined) {
    if (member.daysActive < criteria.minDaysActive) return false;
  }

  // Date range filter
  if (criteria.dateRange) {
    if (member.lastSignalAt < criteria.dateRange.start) return false;
    if (member.firstSignalAt > criteria.dateRange.end) return false;
  }

  // Intervention markers requirement
  if (criteria.hasInterventionMarkers !== undefined) {
    if (member.hasInterventionMarkers !== criteria.hasInterventionMarkers) return false;
  }

  return true;
}

export async function filterCohortMembers(
  cohortId: string,
  additionalCriteria?: CohortCriteria
): Promise<CohortMember[]> {
  const cohort = await getCohort(cohortId);
  if (!cohort) return [];

  const members = await getCohortMembers(cohortId);

  // Apply cohort's base criteria
  let filtered = members.filter((m) => matchesCriteria(m, cohort.criteria));

  // Apply additional criteria if provided
  if (additionalCriteria) {
    filtered = filtered.filter((m) => matchesCriteria(m, additionalCriteria));
  }

  return filtered;
}

// ============================================
// COHORT STATISTICS
// ============================================

export async function getCohortStatistics(cohortId: string): Promise<{
  totalMembers: number;
  ageBandDistribution: Record<AgeBand, number>;
  regionDistribution: Record<RegionBucket, number>;
  contextDistribution: Record<ContextBucket, number>;
  averageSignalCount: number;
  averageDaysActive: number;
  averageQualityScore: number;
  membersWithInterventions: number;
} | null> {
  const cohort = await getCohort(cohortId);
  if (!cohort) return null;

  const members = await getCohortMembers(cohortId);

  if (members.length === 0) {
    return {
      totalMembers: 0,
      ageBandDistribution: { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 },
      regionDistribution: { north_america: 0, europe: 0, asia_pacific: 0, latin_america: 0, other: 0 },
      contextDistribution: { work: 0, education: 0, personal: 0, caregiving: 0, mixed: 0 },
      averageSignalCount: 0,
      averageDaysActive: 0,
      averageQualityScore: 0,
      membersWithInterventions: 0,
    };
  }

  const ageBandDistribution: Record<AgeBand, number> = {
    '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0,
  };
  const regionDistribution: Record<RegionBucket, number> = {
    north_america: 0, europe: 0, asia_pacific: 0, latin_america: 0, other: 0,
  };
  const contextDistribution: Record<ContextBucket, number> = {
    work: 0, education: 0, personal: 0, caregiving: 0, mixed: 0,
  };

  let totalSignals = 0;
  let totalDays = 0;
  let totalQuality = 0;
  let membersWithInterventions = 0;

  for (const member of members) {
    ageBandDistribution[member.ageBand]++;
    regionDistribution[member.region]++;
    contextDistribution[member.context]++;
    totalSignals += member.signalCount;
    totalDays += member.daysActive;
    totalQuality += member.qualityScore;
    if (member.hasInterventionMarkers) membersWithInterventions++;
  }

  return {
    totalMembers: members.length,
    ageBandDistribution,
    regionDistribution,
    contextDistribution,
    averageSignalCount: Math.round(totalSignals / members.length),
    averageDaysActive: Math.round(totalDays / members.length),
    averageQualityScore: Math.round(totalQuality / members.length),
    membersWithInterventions,
  };
}

// ============================================
// COHORT EXPORT (De-Identified)
// ============================================

export async function exportCohortManifest(cohortId: string): Promise<{
  cohort: Omit<Cohort, 'createdBy'>;
  statistics: Awaited<ReturnType<typeof getCohortStatistics>>;
  memberCount: number;
} | null> {
  const cohort = await getCohort(cohortId);
  if (!cohort) return null;

  const statistics = await getCohortStatistics(cohortId);

  // Remove createdBy to prevent identification
  const { createdBy, ...cohortWithoutCreator } = cohort;

  return {
    cohort: cohortWithoutCreator,
    statistics,
    memberCount: cohort.memberCount,
  };
}
