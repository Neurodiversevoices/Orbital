# ENGINEERING ENFORCEMENT PLAN

**Classification:** INTERNAL
**Version:** 1.0.0
**Effective Date:** 2025-01-01
**Status:** IMPLEMENTATION-READY

---

## 1. OVERVIEW

This document provides implementation-ready guidance for enforcing Orbital's governance requirements at the engineering level. All items are acceptance criteria for engineering work.

---

## 2. VOCABULARY GUARDRAILS

### 2.1 Lint Rules

Create ESLint plugin `eslint-plugin-orbital-language`:

```javascript
// eslint-plugin-orbital-language/rules/no-prohibited-terms.js
const PROHIBITED_TERMS = [
  'wellness', 'productivity', 'mental health', 'symptoms',
  'check-in', 'checkin', 'burnout', 'tracking', 'track',
  'streak', 'mood', 'stress', 'anxiety', 'depression',
  'diagnosis', 'diagnose', 'therapeutic', 'therapy',
  'reminder', 'notification', 'nudge', 'alert',
  'score', 'ranking', 'leaderboard', 'achievement',
  'badge', 'points', 'reward', 'gamif'
];

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow prohibited Orbital terms' },
    fixable: null,
    schema: []
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          const lower = node.value.toLowerCase();
          for (const term of PROHIBITED_TERMS) {
            if (lower.includes(term)) {
              context.report({
                node,
                message: `Prohibited term "${term}" found. See ORBITAL_CANON.md for alternatives.`
              });
            }
          }
        }
      },
      TemplateLiteral(node) {
        node.quasis.forEach(quasi => {
          const lower = quasi.value.raw.toLowerCase();
          for (const term of PROHIBITED_TERMS) {
            if (lower.includes(term)) {
              context.report({
                node,
                message: `Prohibited term "${term}" found. See ORBITAL_CANON.md for alternatives.`
              });
            }
          }
        });
      }
    };
  }
};
```

### 2.2 CI/CD Gate

```yaml
# .github/workflows/language-check.yml
name: Language Compliance
on: [push, pull_request]

jobs:
  language-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint --plugin orbital-language --rule 'orbital-language/no-prohibited-terms: error' 'src/**/*.{ts,tsx}' 'locales/**/*.ts'
      - name: Check export templates
        run: node scripts/validate-templates.js
```

### 2.3 UI Copy Gates

```typescript
// lib/language/validator.ts
const PROHIBITED = new Set([
  'wellness', 'productivity', 'mental health', 'symptoms',
  'check-in', 'burnout', 'tracking', 'streak', 'mood',
  'stress', 'anxiety', 'depression', 'diagnosis',
  'reminder', 'notification', 'score', 'achievement'
]);

export function validateCopy(text: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const lower = text.toLowerCase();

  for (const term of PROHIBITED) {
    if (lower.includes(term)) {
      violations.push(term);
    }
  }

  return { valid: violations.length === 0, violations };
}

// Use in development builds
if (__DEV__) {
  const originalText = Text;
  // Wrap Text component to validate in dev
}
```

### 2.4 Export Templates

All exports use pre-approved templates:

```typescript
// lib/export/templates.ts
export const ARTIFACT_TEMPLATES = {
  QUARTERLY_SUMMARY: {
    id: 'quarterly-summary-v1',
    sections: ['header', 'summary', 'distribution', 'graph', 'patterns', 'governance'],
    approved: '2025-01-01',
    hash: 'sha256:...'
  },
  ANNUAL_SUMMARY: {
    id: 'annual-summary-v1',
    sections: ['header', 'summary', 'distribution', 'quarterly-breakdown', 'graph', 'governance'],
    approved: '2025-01-01',
    hash: 'sha256:...'
  }
} as const;

// No freeform text in artifacts - all copy from approved strings
export const ARTIFACT_COPY = {
  disclaimer: 'This summary is generated from self-reported capacity signals. It contains no diagnostic, clinical, or medical information.',
  // ... all pre-approved strings
} as const;
```

---

## 3. DATA MODEL CONSTRAINTS

### 3.1 Append-Only Signals

```typescript
// types/signal.ts
interface CapacitySignal {
  readonly id: string;           // UUID, immutable
  readonly timestamp: number;    // Unix ms, immutable
  readonly state: CapacityState; // Immutable after creation
  readonly tags: readonly Category[]; // Immutable
  readonly note?: string;        // Immutable (encrypted)
  readonly _version: number;     // Schema version
  readonly _createdAt: number;   // Server timestamp
  readonly _hash: string;        // Integrity hash
}

// Signals are NEVER updated - only soft-deleted
interface SignalDeletion {
  readonly signalId: string;
  readonly deletedAt: number;
  readonly deletedBy: 'user' | 'retention-policy' | 'admin';
  readonly deletionCertificateId?: string;
}
```

### 3.2 Derived Views Only

```typescript
// lib/analytics/derived.ts
// All analytics are computed, never stored

export function computeStats(signals: CapacitySignal[], range: TimeRange): DerivedStats {
  // Computed at query time
  // Never persisted
  // Always recalculated from source signals
}

// PROHIBITED: No pre-computed analytics tables
// PROHIBITED: No cached insights
// PROHIBITED: No stored patterns
```

### 3.3 Integrity Hashing

```typescript
// lib/integrity/hash.ts
import { createHash } from 'crypto';

export function computeSignalHash(signal: Omit<CapacitySignal, '_hash'>): string {
  const payload = JSON.stringify({
    id: signal.id,
    timestamp: signal.timestamp,
    state: signal.state,
    tags: signal.tags,
    // Note excluded from hash (encrypted separately)
  });
  return createHash('sha256').update(payload).digest('hex');
}

export function verifySignalIntegrity(signal: CapacitySignal): boolean {
  const expected = computeSignalHash(signal);
  return signal._hash === expected;
}
```

---

## 4. PERMISSIONING MODEL

### 4.1 Role Definitions

```typescript
// types/roles.ts
type Role =
  | 'individual'           // Personal user
  | 'family-admin'         // Manages family members
  | 'org-member'           // Employee/student in organization
  | 'org-admin'            // Organization administrator
  | 'org-viewer'           // Read-only org dashboard
  | 'clinician'            // Healthcare provider with share
  | 'researcher'           // IRB-approved researcher
  | 'system-admin';        // Orbital operations

interface RolePermissions {
  canViewOwnData: boolean;
  canViewAggregateData: boolean;
  canViewIndividualData: boolean;  // Always false except 'individual' on own data
  canExportData: boolean;
  canShareData: boolean;
  canDeleteData: boolean;
  canManageUsers: boolean;
  canAccessAuditLog: boolean;
}

const PERMISSIONS: Record<Role, RolePermissions> = {
  'individual': {
    canViewOwnData: true,
    canViewAggregateData: false,
    canViewIndividualData: false, // Cannot view others
    canExportData: true,
    canShareData: true,
    canDeleteData: true,
    canManageUsers: false,
    canAccessAuditLog: false
  },
  'org-admin': {
    canViewOwnData: true,
    canViewAggregateData: true,
    canViewIndividualData: false,  // NEVER
    canExportData: true,
    canShareData: true,
    canDeleteData: true,
    canManageUsers: true,
    canAccessAuditLog: true
  },
  // ... other roles
};
```

### 4.2 Tenant Isolation

```typescript
// lib/data/tenant.ts
interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
  organizationId?: string;
}

// All queries MUST include tenant context
export function querySignals(ctx: TenantContext, filters: SignalFilters): CapacitySignal[] {
  // Enforced at query layer
  const baseQuery = db.signals
    .where('tenantId', '==', ctx.tenantId)
    .where('userId', '==', ctx.userId);

  // Role-based filtering
  if (ctx.role === 'org-admin') {
    // Can only see aggregate, never individual
    throw new Error('Use queryAggregate for org-admin');
  }

  return baseQuery.where(filters).get();
}
```

### 4.3 Aggregate-Only Institutional Views

```typescript
// lib/analytics/aggregate.ts
const MINIMUM_COHORT_SIZE = 10;

export function computeOrgAggregate(
  ctx: TenantContext,
  organizationId: string,
  range: TimeRange
): AggregateStats | null {
  // Verify role
  if (!['org-admin', 'org-viewer'].includes(ctx.role)) {
    throw new UnauthorizedError();
  }

  // Get user count
  const userCount = db.orgMemberships
    .where('organizationId', '==', organizationId)
    .where('hasConsented', '==', true)
    .count();

  // Enforce minimum cohort
  if (userCount < MINIMUM_COHORT_SIZE) {
    return null; // Cannot show aggregate for small cohorts
  }

  // Compute aggregate (no individual data exposed)
  return {
    userCount,
    averageCapacity: computeAverageAcrossUsers(...),
    distributionCounts: computeDistribution(...),
    // NO individual identifiers
    // NO drill-down capability
  };
}
```

---

## 5. DEMO MODE ARCHITECTURE

### 5.1 Data Isolation

```typescript
// lib/demo/isolation.ts
const DEMO_STORAGE_PREFIX = '@orbital:demo:';
const REAL_STORAGE_PREFIX = '@orbital:';

export function getDemoStorageKey(key: string): string {
  return `${DEMO_STORAGE_PREFIX}${key}`;
}

// Demo mode uses completely separate storage namespace
// Real data is NEVER touched when demo mode is active
```

### 5.2 Seed/Reseed/Reset

```typescript
// lib/demo/generator.ts
export interface DemoConfig {
  duration: '90d' | '1y';
  seed: number;  // For reproducible data
  patterns: DemoPattern[];
}

export async function seedDemoData(config: DemoConfig): Promise<void> {
  // Generate deterministic demo data
  // Store in demo namespace only
}

export async function reseedDemoData(config: DemoConfig): Promise<void> {
  // Clear demo namespace
  // Regenerate with new seed
}

export async function resetDemoData(): Promise<void> {
  // Clear demo namespace completely
}
```

### 5.3 Watermarking

```typescript
// components/DemoWatermark.tsx
export function DemoWatermark() {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <View style={styles.watermark} pointerEvents="none">
      <Text style={styles.watermarkText}>DEMO MODE</Text>
    </View>
  );
}

// Watermark appears on:
// - All screens when demo mode active
// - All exported artifacts from demo mode
// - All shared links from demo mode
```

---

## 6. ARTIFACT PIPELINE

### 6.1 PDF Generation

```typescript
// lib/artifacts/pdf.ts
import { jsPDF } from 'jspdf';

export async function generateQuarterlySummary(
  signals: CapacitySignal[],
  userId: string
): Promise<ArtifactResult> {
  // Validate eligibility
  if (signals.length < 90) {
    throw new IneligibleError('Requires 90+ signals');
  }

  // Compute stats
  const stats = computeQuarterlyStats(signals);

  // Generate PDF using approved template
  const pdf = new jsPDF();
  applyTemplate(pdf, ARTIFACT_TEMPLATES.QUARTERLY_SUMMARY, stats);

  // Add verification hash
  const hash = computeArtifactHash(pdf);
  addVerificationFooter(pdf, hash);

  // Store immutably
  const artifactId = await storeArtifact(pdf, userId, hash);

  // Log to audit
  await auditLog.append({
    action: 'artifact_generated',
    userId,
    artifactId,
    artifactType: 'quarterly-summary',
    timestamp: Date.now()
  });

  return { artifactId, hash, pdf };
}
```

### 6.2 Signatures / Verification

```typescript
// lib/artifacts/verification.ts
export function computeArtifactHash(pdf: jsPDF): string {
  const bytes = pdf.output('arraybuffer');
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export async function verifyArtifact(artifactId: string, providedHash: string): Promise<VerificationResult> {
  const stored = await getStoredArtifact(artifactId);

  if (!stored) {
    return { valid: false, reason: 'Artifact not found' };
  }

  const computedHash = computeArtifactHash(stored.pdf);

  if (computedHash !== providedHash) {
    return { valid: false, reason: 'Hash mismatch - artifact may be modified' };
  }

  return {
    valid: true,
    generatedAt: stored.generatedAt,
    generatedFor: stored.userIdHash  // Hashed, not plain
  };
}
```

### 6.3 Retention-Aware Storage

```typescript
// lib/storage/retention.ts
interface RetentionPolicy {
  artifactType: string;
  retentionDays: number;
  userOverride: boolean;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { artifactType: 'quarterly-summary', retentionDays: 365 * 10, userOverride: true },
  { artifactType: 'annual-summary', retentionDays: 365 * 10, userOverride: true },
  { artifactType: 'export', retentionDays: 90, userOverride: false }
];

export async function storeWithRetention(
  artifact: Artifact,
  policy: RetentionPolicy
): Promise<string> {
  const expiresAt = policy.retentionDays === -1
    ? null  // Permanent
    : Date.now() + (policy.retentionDays * 24 * 60 * 60 * 1000);

  return await storage.put({
    ...artifact,
    expiresAt,
    retentionPolicy: policy.artifactType
  });
}
```

---

## 7. AUDIT LOG DESIGN

### 7.1 Immutable Append-Only Log

```typescript
// lib/audit/log.ts
interface AuditEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  actorId: string;        // User or system
  actorType: 'user' | 'system' | 'admin';
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  previousHash: string;   // Chain integrity
  hash: string;
}

class AuditLog {
  private lastHash: string = 'genesis';

  async append(entry: Omit<AuditEntry, 'id' | 'previousHash' | 'hash'>): Promise<void> {
    const fullEntry: AuditEntry = {
      ...entry,
      id: generateUUID(),
      previousHash: this.lastHash,
      hash: ''  // Computed below
    };

    fullEntry.hash = this.computeEntryHash(fullEntry);
    this.lastHash = fullEntry.hash;

    // Append to immutable storage
    await this.storage.append(fullEntry);
  }

  private computeEntryHash(entry: AuditEntry): string {
    const payload = JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      actorId: entry.actorId,
      resourceId: entry.resourceId,
      previousHash: entry.previousHash
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  async verifyIntegrity(): Promise<boolean> {
    const entries = await this.storage.getAll();
    let expectedPrevious = 'genesis';

    for (const entry of entries) {
      if (entry.previousHash !== expectedPrevious) {
        return false;  // Chain broken
      }
      expectedPrevious = entry.hash;
    }

    return true;
  }
}
```

### 7.2 Queryable Interface

```typescript
// lib/audit/query.ts
export async function queryAuditLog(
  ctx: TenantContext,
  filters: AuditFilters
): Promise<AuditEntry[]> {
  // Only system admins and compliance can query full log
  if (!['system-admin', 'compliance'].includes(ctx.role)) {
    // Users can only see their own audit entries
    filters.actorId = ctx.userId;
  }

  return auditLog.query(filters);
}
```

### 7.3 Compliance Export

```typescript
// lib/audit/export.ts
export async function exportAuditLog(
  ctx: TenantContext,
  range: { start: number; end: number },
  format: 'json' | 'csv'
): Promise<Buffer> {
  // Requires elevated permissions
  if (!['system-admin', 'compliance'].includes(ctx.role)) {
    throw new UnauthorizedError();
  }

  const entries = await auditLog.query({
    timestampStart: range.start,
    timestampEnd: range.end
  });

  // Log the export itself
  await auditLog.append({
    action: 'audit_log_exported',
    actorId: ctx.userId,
    actorType: 'admin',
    resourceType: 'audit_log',
    resourceId: 'full',
    metadata: { range, format, entryCount: entries.length },
    timestamp: Date.now()
  });

  return format === 'json'
    ? Buffer.from(JSON.stringify(entries, null, 2))
    : convertToCSV(entries);
}
```

---

## 8. ACCESSIBILITY REQUIREMENTS

All items below are **acceptance criteria** for any feature.

### 8.1 Screen Reader Semantics

```typescript
// Every interactive element MUST have:
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Log capacity signal"  // Clear, action-oriented
  accessibilityHint="Opens the signal logging screen"  // Describes result
  accessibilityState={{ disabled: false }}
>
```

### 8.2 Dynamic Type

```typescript
// All text MUST respect system font size
const styles = StyleSheet.create({
  text: {
    fontSize: 16,  // Base size
    // React Native automatically scales with system setting
  }
});

// Test: App must remain usable at 200% system font size
```

### 8.3 Reduced Motion

```typescript
// lib/accessibility/motion.ts
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );
    return () => subscription.remove();
  }, []);

  return reduced;
}

// All animations MUST check this and provide static alternative
```

### 8.4 Motor Accessibility

```typescript
// Minimum touch targets: 44x44 points
const styles = StyleSheet.create({
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    // Additional padding if visual element is smaller
  }
});

// No gestures required - all actions available via tap
// No time-limited interactions
// No drag-and-drop without alternative
```

### 8.5 One-Action-Per-Screen Option

```typescript
// settings/accessibility.ts
interface AccessibilitySettings {
  oneActionPerScreen: boolean;  // Simplified mode
  // When enabled:
  // - Only one primary action per screen
  // - Navigation is explicit (no hidden gestures)
  // - Confirmations are separate screens
}
```

### 8.6 High Contrast

```typescript
// theme/contrast.ts
export const HIGH_CONTRAST_COLORS = {
  background: '#000000',
  text: '#FFFFFF',
  primary: '#FFFF00',     // High visibility yellow
  success: '#00FF00',
  warning: '#FFFF00',
  error: '#FF0000',
  border: '#FFFFFF',
};

// Minimum contrast ratio: 7:1 for text (WCAG AAA)
```

---

## 9. "DO NOTHING SAFELY" DEFAULTS

### 9.1 Principle

The system must remain stable, secure, and valuable with minimal changes. Backwards compatibility is prioritized over feature velocity.

### 9.2 Implementation

```typescript
// Default behaviors that require no configuration:
const SAFE_DEFAULTS = {
  // Data
  signalRetention: 'indefinite',
  backupFrequency: 'daily',

  // Privacy
  sharingDefault: 'private',
  analyticsDefault: 'local-only',

  // Notifications
  pushNotifications: 'disabled',
  emailNotifications: 'disabled',

  // Features
  demoMode: 'disabled',
  institutionalFeatures: 'hidden',
};

// Feature flags default to OFF
const FEATURE_FLAGS = {
  newFeatureX: false,  // Must be explicitly enabled
  experimentY: false,
};

// Database migrations are backwards-compatible
// Old clients must continue to work with new data
// New clients must continue to work with old data
```

### 9.3 Deprecation Policy

```typescript
// Deprecation requires:
// 1. 6-month notice
// 2. Migration path documented
// 3. Old behavior preserved until removal
// 4. Removal requires version bump (x.0.0)

interface DeprecationNotice {
  feature: string;
  deprecatedAt: string;
  removalAt: string;
  migrationGuide: string;
  replacementFeature?: string;
}
```

---

## 10. IMPLEMENTATION CHECKLIST

| Category | Item | Priority | Status |
|----------|------|----------|--------|
| Language | ESLint plugin created | P0 | Required |
| Language | CI/CD gate added | P0 | Required |
| Language | Export templates approved | P0 | Required |
| Data | Append-only enforced | P0 | Required |
| Data | Integrity hashing implemented | P0 | Required |
| Permissions | Role definitions complete | P0 | Required |
| Permissions | Tenant isolation verified | P0 | Required |
| Permissions | Aggregate minimum enforced | P0 | Required |
| Demo | Isolation implemented | P1 | Required |
| Demo | Watermarking added | P1 | Required |
| Artifacts | PDF pipeline built | P1 | Required |
| Artifacts | Verification endpoint live | P1 | Required |
| Audit | Immutable log implemented | P0 | Required |
| Audit | Chain integrity verified | P0 | Required |
| Accessibility | Screen reader tested | P0 | Required |
| Accessibility | Dynamic type tested | P0 | Required |
| Accessibility | Reduced motion supported | P1 | Required |
| Accessibility | Touch targets verified | P0 | Required |

---

*End of Document*
