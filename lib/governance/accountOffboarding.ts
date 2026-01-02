import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OffboardingRequest,
  OffboardingStage,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';
import { performFullDataDeletion } from './dataSeparation';
import { revokeAllConsents } from './consentLifecycle';

const OFFBOARDING_KEY = '@orbital:offboarding_requests';

// Default offboarding timeline (in days)
const OFFBOARDING_TIMELINE = {
  exportWindowDays: 30,      // 30 days to download data
  deletionDelayDays: 14,     // 14 days after export window closes
};

function generateOffboardingId(): string {
  return `offboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateConfirmationArtifact(request: OffboardingRequest): string {
  const timestamp = new Date().toISOString();
  return `ORBITAL_OFFBOARD_CONFIRM_${request.orgId}_${timestamp}_${request.id}`;
}

// ============================================
// OFFBOARDING REQUEST MANAGEMENT
// ============================================

export async function getOffboardingRequests(): Promise<OffboardingRequest[]> {
  const data = await AsyncStorage.getItem(OFFBOARDING_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveOffboardingRequest(orgId: string): Promise<OffboardingRequest | null> {
  const requests = await getOffboardingRequests();
  return requests.find(
    (r) => r.orgId === orgId && r.stage !== 'completed' && r.stage !== 'cancelled'
  ) || null;
}

export async function initiateOffboarding(
  orgId: string,
  requestedBy: string
): Promise<OffboardingRequest> {
  // Check for existing active request
  const existing = await getActiveOffboardingRequest(orgId);
  if (existing) {
    throw new Error('Active offboarding request already exists');
  }

  const now = Date.now();
  const exportWindowEndsAt = now + OFFBOARDING_TIMELINE.exportWindowDays * 24 * 60 * 60 * 1000;
  const scheduledDeletionAt = exportWindowEndsAt + OFFBOARDING_TIMELINE.deletionDelayDays * 24 * 60 * 60 * 1000;

  const auditEntry = await logImmutableAuditEntry('offboarding_initiated', {
    actorType: 'org_admin',
    actorRef: requestedBy,
    action: 'Account offboarding initiated',
    scope: orgId,
    metadata: {
      exportWindowEndsAt,
      scheduledDeletionAt,
    },
  });

  const request: OffboardingRequest = {
    id: generateOffboardingId(),
    orgId,
    requestedBy,
    requestedAt: now,
    stage: 'initiated',
    stageHistory: [
      { stage: 'initiated', timestamp: now, actor: requestedBy },
    ],
    exportWindowEndsAt,
    scheduledDeletionAt,
    auditRef: auditEntry.id,
  };

  const requests = await getOffboardingRequests();
  requests.push(request);
  await AsyncStorage.setItem(OFFBOARDING_KEY, JSON.stringify(requests));

  return request;
}

export async function advanceOffboardingStage(
  requestId: string,
  newStage: OffboardingStage,
  actor: string
): Promise<OffboardingRequest | null> {
  const requests = await getOffboardingRequests();
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) return null;

  const request = requests[index];
  const now = Date.now();

  // Validate stage transition
  const validTransitions: Record<OffboardingStage, OffboardingStage[]> = {
    initiated: ['data_frozen', 'cancelled'],
    data_frozen: ['export_window', 'cancelled'],
    export_window: ['deletion_scheduled', 'cancelled'],
    deletion_scheduled: ['deletion_in_progress', 'cancelled'],
    deletion_in_progress: ['completed'],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[request.stage].includes(newStage)) {
    throw new Error(`Invalid stage transition: ${request.stage} -> ${newStage}`);
  }

  request.stage = newStage;
  request.stageHistory.push({ stage: newStage, timestamp: now, actor });

  if (newStage === 'completed') {
    request.completedAt = now;
    request.confirmationArtifact = generateConfirmationArtifact(request);
  }

  requests[index] = request;
  await AsyncStorage.setItem(OFFBOARDING_KEY, JSON.stringify(requests));

  await logImmutableAuditEntry(newStage === 'completed' ? 'offboarding_completed' : 'admin_action', {
    actorType: actor === 'system' ? 'system' : 'org_admin',
    actorRef: actor,
    action: `Offboarding stage advanced: ${newStage}`,
    targetRef: requestId,
    scope: request.orgId,
  });

  return request;
}

export async function cancelOffboarding(
  requestId: string,
  cancelledBy: string,
  reason: string
): Promise<OffboardingRequest | null> {
  const request = await advanceOffboardingStage(requestId, 'cancelled', cancelledBy);

  if (request) {
    await logImmutableAuditEntry('admin_action', {
      actorType: 'org_admin',
      actorRef: cancelledBy,
      action: `Offboarding cancelled: ${reason}`,
      targetRef: requestId,
      scope: request.orgId,
      metadata: { reason },
    });
  }

  return request;
}

// ============================================
// OFFBOARDING EXECUTION
// ============================================

export async function executeDataFreeze(requestId: string): Promise<boolean> {
  const requests = await getOffboardingRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request || request.stage !== 'initiated') return false;

  // In a real implementation, this would:
  // 1. Disable write operations for the org
  // 2. Create a snapshot of current data state
  // 3. Notify relevant parties

  await advanceOffboardingStage(requestId, 'data_frozen', 'system');
  return true;
}

export async function executeExportWindow(requestId: string): Promise<boolean> {
  const requests = await getOffboardingRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request || request.stage !== 'data_frozen') return false;

  // Export window is now active - org can download their data

  await advanceOffboardingStage(requestId, 'export_window', 'system');
  return true;
}

export async function scheduleDeletion(requestId: string): Promise<boolean> {
  const requests = await getOffboardingRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request || request.stage !== 'export_window') return false;

  // Check if export window has ended
  if (request.exportWindowEndsAt && Date.now() < request.exportWindowEndsAt) {
    return false; // Export window still active
  }

  await advanceOffboardingStage(requestId, 'deletion_scheduled', 'system');
  return true;
}

export async function executeDeletion(
  requestId: string,
  identityId: string
): Promise<{
  success: boolean;
  identityDeleted: boolean;
  patternsDeleted: number;
  consentsRevoked: number;
}> {
  const requests = await getOffboardingRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request || request.stage !== 'deletion_scheduled') {
    return { success: false, identityDeleted: false, patternsDeleted: 0, consentsRevoked: 0 };
  }

  // Check if scheduled deletion time has passed
  if (request.scheduledDeletionAt && Date.now() < request.scheduledDeletionAt) {
    return { success: false, identityDeleted: false, patternsDeleted: 0, consentsRevoked: 0 };
  }

  await advanceOffboardingStage(requestId, 'deletion_in_progress', 'system');

  // Execute deletion
  const consentsRevoked = await revokeAllConsents(identityId);
  const { identityDeleted, patternsDeleted } = await performFullDataDeletion(identityId);

  await advanceOffboardingStage(requestId, 'completed', 'system');

  return {
    success: true,
    identityDeleted,
    patternsDeleted,
    consentsRevoked,
  };
}

// ============================================
// OFFBOARDING STATUS & TIMELINE
// ============================================

export async function getOffboardingStatus(requestId: string): Promise<{
  request: OffboardingRequest | null;
  currentStage: OffboardingStage | null;
  daysInCurrentStage: number;
  exportWindowRemaining?: number;
  deletionScheduledIn?: number;
}> {
  const requests = await getOffboardingRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return { request: null, currentStage: null, daysInCurrentStage: 0 };
  }

  const now = Date.now();
  const lastStageChange = request.stageHistory[request.stageHistory.length - 1];
  const daysInCurrentStage = Math.floor((now - lastStageChange.timestamp) / (24 * 60 * 60 * 1000));

  let exportWindowRemaining: number | undefined;
  let deletionScheduledIn: number | undefined;

  if (request.exportWindowEndsAt) {
    const remaining = request.exportWindowEndsAt - now;
    if (remaining > 0) {
      exportWindowRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    }
  }

  if (request.scheduledDeletionAt) {
    const remaining = request.scheduledDeletionAt - now;
    if (remaining > 0) {
      deletionScheduledIn = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    }
  }

  return {
    request,
    currentStage: request.stage,
    daysInCurrentStage,
    exportWindowRemaining,
    deletionScheduledIn,
  };
}

export async function processOffboardingTimeline(): Promise<{
  processed: number;
  frozen: number;
  windowsOpened: number;
  deletionsScheduled: number;
}> {
  const requests = await getOffboardingRequests();
  const now = Date.now();
  let processed = 0;
  let frozen = 0;
  let windowsOpened = 0;
  let deletionsScheduled = 0;

  for (const request of requests) {
    if (request.stage === 'completed' || request.stage === 'cancelled') continue;

    processed++;

    // Auto-advance based on timeline
    if (request.stage === 'initiated') {
      // Freeze data 24 hours after initiation
      const freezeTime = request.requestedAt + 24 * 60 * 60 * 1000;
      if (now >= freezeTime) {
        await executeDataFreeze(request.id);
        frozen++;
      }
    } else if (request.stage === 'data_frozen') {
      // Open export window 48 hours after freeze
      const windowOpenTime = request.stageHistory
        .find((s) => s.stage === 'data_frozen')!.timestamp + 48 * 60 * 60 * 1000;
      if (now >= windowOpenTime) {
        await executeExportWindow(request.id);
        windowsOpened++;
      }
    } else if (request.stage === 'export_window') {
      if (request.exportWindowEndsAt && now >= request.exportWindowEndsAt) {
        await scheduleDeletion(request.id);
        deletionsScheduled++;
      }
    }
  }

  return { processed, frozen, windowsOpened, deletionsScheduled };
}
