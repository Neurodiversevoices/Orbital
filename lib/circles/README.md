# Circles

**"Air Traffic Control for empathy"** — NOT a social feed.

## What Circles IS

A minimal, safe, pairwise consent-based "live dot" system that shares ONE thing:
a current state color (cyan/amber/red) with people you explicitly choose.

- **Color only**: No text, no tags, no context, no score
- **Ephemeral**: Signals expire after 90 minutes (become "unknown")
- **Pairwise**: Direct connections only, not groups or teams
- **Bidirectional consent**: Both people must opt-in; either can revoke instantly

## What Circles is NOT

### NOT Surveillance
- A partner cannot use Circles to monitor someone
- A manager cannot use Circles to track employee status
- There is no "check-in" history or attendance tracking

### NOT History
- No timeline view
- No "last week" charts
- No "most often red" analytics
- Expired signals are deleted, not archived

### NOT Analytics
- No dashboards
- No team insights
- No cohort analysis
- No trend detection
- No aggregation of any kind

### NOT Social
- No group circles
- No team circles
- No organization circles
- No feed or stream
- No likes, comments, or reactions
- Maximum 25 connections (prevents social network drift)

### NOT Connected to Other Orbital Data
- Cannot see WHY someone is red (no tags/reasons)
- Cannot be joined with capacity logs
- Cannot be exported to Clinical Brief
- Cannot access Pattern history
- Completely isolated storage namespace (`circles:*`)

## The Six Laws (Enforced by Runtime Guards)

These are not policy guidelines—they are enforced in code with **hard-stop exceptions**.
Guards THROW, they do not return boolean. Violations abort transactions immediately.

### L1: NO AGGREGATION
```typescript
assertNoAggregation(26); // THROWS: "SECURITY_VIOLATION [Law 5]"
// Max 25 connections per user, no analytics, no team views
```

### L2: NO HISTORY
```typescript
assertNoHistory({ history: [] }); // THROWS: "History Persistence Prohibited"
assertNoHistory([1, 2, 3]); // THROWS: Arrays are history
assertNoHistory({ events: [{ timestamp: 123 }] }); // THROWS: Time-series detected
// No timelines, no archives, no trend data
```

### L3: BIDIRECTIONAL CONSENT
```typescript
// Viral handshake protocol:
const { invite, qrPayload, displayCode, pin } = await createInvite();
// Step 1: Creator shares QR or code+PIN

const result = await redeemViaQR(qrPayload); // or redeemViaCode(code, pin)
// Step 2: Invitee redeems → invite becomes LOCKED

await confirmInvite(invite.inviteId);
// Step 3: Creator confirms → connection becomes ACTIVE
// Invite is destroyed (single-use)

await circlesRevokeConnection(connId); // Either party can revoke instantly
```

### L4: SOCIAL FIREWALL
```typescript
// All Circles data lives in circles:* namespace ONLY
// Attempting to access forbidden namespaces throws:
// "orbital:", "neuro-logs:", "logs:", "patterns:", "vault:", "clinical:", "capacity:", "energy:"
```

### L5: NO HIERARCHY
```typescript
// No roles, no admins, no managers
// Every connection is peer-to-peer
// No "owner" of relationships
```

### L6: SYMMETRICAL VISIBILITY
```typescript
assertSymmetry('UNIDIRECTIONAL'); // THROWS: "Asymmetric Surveillance Prohibited"
assertSymmetry('BIDIRECTIONAL'); // PASSES
// If A sees B, then B sees A. Always.
```

## Runtime Guardrails (Hard Stop Enforcement)

```typescript
import {
  assertNoHistory,
  assertNoAggregation,
  assertSymmetry,
  assertViewerSafe,
  toViewerPayload,
} from '@/lib/circles';

// Viewer payload MUST contain ONLY these fields:
// { connectionId, peerDisplayName?, color }
assertViewerSafe({
  connectionId: 'conn_123',
  color: 'cyan',
  timestamp: 123, // THROWS: Forbidden field "timestamp"
});

// Create viewer-safe payload:
const payload = toViewerPayload('conn_123', 'cyan', 'Partner');
// Returns: { connectionId: 'conn_123', color: 'cyan', peerDisplayName: 'Partner' }
```

## API Reference

### Initialization
```typescript
await circlesInit("My Name"); // Initialize with display hint
const myId = await circlesGetMyId(); // Get local user ID
```

### Invites (Viral Handshake)
```typescript
// Step 1: Create invite
const {
  invite,         // Full invite record
  qrPayload,      // { inviteId, secretToken } for QR code
  displayCode,    // "ABC-123" for manual entry
  pin,            // "1234" 4-digit PIN
} = await createInvite("Partner");

// Step 2a: Redeem via QR scan
const result = await redeemViaQR(qrPayload, "My Name");
// result: { success, inviteId?, creatorDisplayHint?, error?, remainingAttempts? }

// Step 2b: OR redeem via code + PIN
const result = await redeemViaCode("ABC-123", "1234", "My Name");

// Step 3: Creator confirms (after redemption)
const confirmResult = await confirmInvite(invite.inviteId);
// confirmResult: { success, connection?, error? }

// Other actions
await rejectInvite(invite.inviteId);  // Reject a redeemed invite
await cancelInvite(invite.inviteId);  // Cancel pending invite
await extendInvite(invite.inviteId);  // Extend TTL (+30 min, max once)

// Query invites
const awaiting = await getInvitesAwaitingConfirmation(); // Redeemed, need confirm
const pending = await getMyPendingInvitesList();         // Not yet redeemed

// Cleanup
await cleanupExpiredInvites(); // Remove expired invites
```

### Connections
```typescript
const connections = await circlesGetMyConnections();
await circlesRevokeConnection(connectionId);
await circlesBlockUser(userId);
await circlesUnblockUser(userId);
```

### Signals
```typescript
// Set my signal
await circlesSetMySignal("cyan"); // or "amber" or "red"
await circlesSetMySignalFromCapacity("resourced"); // Maps capacity state
await circlesClearMySignal(); // Become "unknown"

// Get signals from connections (VIEWER-SAFE only)
const signals = await circlesGetSignalsForMe();
// Returns: { [connectionId]: { connectionId, color, peerDisplayName? } }
// NO timestamps, NO ttl, NO internal fields - viewer-safe ONLY
```

### Maintenance
```typescript
await circlesRunCleanup(); // Clean expired invites/signals
const summary = await circlesGetStorageSummary(); // Debug info
const { valid, violations } = await circlesVerifyFirewall(); // Integrity check
await circlesWipeAll(); // Nuclear option
```

## Signal Semantics

| Color | Meaning | Maps From |
|-------|---------|-----------|
| `cyan` | Resourced / available | `resourced` |
| `amber` | Stretched / limited capacity | `stretched` |
| `red` | Depleted / not available | `depleted` |
| `unknown` | Signal expired or not set | (default) |

## Storage Keys

All Circles data uses the `circles:*` namespace:

- `circles:user` — Local user identity
- `circles:signal:{userId}` — Stored signals
- `circles:connection:{id}` — Connection records
- `circles:connection:_index` — Connection ID list
- `circles:invite:{token}` — Invite records
- `circles:invite:_index` — Invite token list
- `circles:blocked:_list` — Blocked users

**Social Firewall**: Any key outside this namespace will throw `CirclesInvariantViolation`.

## Threat Model

Circles is designed to prevent:

1. **Partner surveillance**: No history, no check-in times, no "always red" detection
2. **Manager monitoring**: No team view, no performance inference, no aggregation
3. **Accidental drift**: Max connections, no groups, strict namespace isolation
4. **Reason inference**: Color only—cannot join with logs to see WHY

## When to Extend Circles

**DO extend if:**
- Adding presence ring (online/offline, not activity level)
- Adding message "I'm thinking of you" (one-shot, no history)
- Adding connection nicknames (local only)

**DO NOT extend if:**
- It creates history
- It enables aggregation
- It reveals reasons/context
- It breaks pairwise consent
- It could be used for surveillance

If you're unsure, the answer is NO.

---

*Circles exists because sometimes you just want someone to know "I see you're having a hard day" without asking them to explain.*
