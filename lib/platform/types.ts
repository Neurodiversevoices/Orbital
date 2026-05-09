/**
 * Orbital Platform — Type Definitions
 *
 * The "Human-Capacity Intelligence Platform" overlay layered on top of the
 * existing Orbital app. Three architectural strata:
 *   1. Trustworthy Core    — auth, audit, posture, tenancy isolation
 *   2. Capability Engine   — capacity logging, baselines, signals (existing app)
 *   3. Segment Packs       — sub-brand specific UX + posture (Personal/Work/etc.)
 *
 * IMPORTANT: This file is ADDITIVE. It does NOT replace lib/supabase/types.ts.
 * Any DB-backed types are extended here — the canonical Supabase row shapes
 * remain authoritative.
 */

// =============================================================================
// SUB-BRANDS
// =============================================================================

/**
 * The 6 official Orbital sub-brands. Each maps to a distinct trust posture
 * and (eventually) a distinct surface/segment pack.
 */
export type SubBrand =
  | 'personal'
  | 'workspace'
  | 'enterprise'
  | 'health'
  | 'edu'
  | 'gov';

// =============================================================================
// TRUST POSTURE
// =============================================================================

/**
 * Memory default — controls whether the assistant retains conversational
 * context across sessions out-of-the-box. "off" is the safer default for
 * regulated tiers; users can opt-in per scope.
 */
export type MemoryDefault = 'on' | 'off';

/**
 * Compliance regime the tenant operates under. Drives tooling allow-lists,
 * data residency, retention windows, and audit verbosity.
 */
export type ComplianceMode =
  | 'none'
  | 'soc2'
  | 'hipaa'
  | 'ferpa'
  | 'fedramp';

/**
 * Trust posture is the contract between user/tenant and the platform.
 * Every sub-brand carries one. This object is read at app boot and on every
 * permission/audit decision.
 */
export interface TrustPosture {
  memoryDefault: MemoryDefault;
  auditLogging: boolean;
  complianceMode: ComplianceMode;
  tenancyIsolation: boolean;
}

/**
 * Static (compile-time) configuration for a sub-brand. The runtime context
 * (`SubBrandProvider`) consumes one of these as the active brand.
 */
export interface SubBrandConfig {
  id: SubBrand;
  label: string;
  tagline: string;
  posture: TrustPosture;
  /** Hex color drawn from the capacity spectrum. Used for chips, accents. */
  themeAccent: string;
}

// =============================================================================
// MEMORY (4-LAYER MODEL)
// =============================================================================

/**
 * The four memory scopes shown in the user's Memory Dashboard.
 *  - ephemeral: this session only, never persisted
 *  - workspace: scoped to the current org/circle
 *  - profile:   persistent, user-owned, exportable
 *  - implicit:  inferred (preferences, patterns) — fully user-editable
 */
export type MemoryScope = 'ephemeral' | 'workspace' | 'profile' | 'implicit';

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  content: string;
  createdAt: string; // ISO-8601
  /** Where the record originated — e.g., 'chat', 'sync', 'inferred'. */
  source: string;
  /** Whether the user can edit/delete this record from the dashboard. */
  userEditable: boolean;
}

// =============================================================================
// PERMISSIONS LEDGER
// =============================================================================

/**
 * A grant authorizing a tool/integration to act on a defined scope.
 * All grants are revocable; some carry an expiry timestamp.
 */
export interface PermissionGrant {
  id: string;
  /** Tool/integration identifier, e.g. 'gmail', 'calendar', 'supabase'. */
  tool: string;
  /** Free-form scope string, e.g. 'read:capacity', 'write:audit'. */
  scope: string;
  /** ISO-8601, or null for non-expiring grants. */
  expiresAt: string | null;
  grantedAt: string;
  /** Always true — kept explicit so callers self-document the contract. */
  revocable: true;
}

// =============================================================================
// AUDIT EVENTS
// =============================================================================

/**
 * Platform-level audit event. Mirrors the shape of the existing
 * `audit_events` Supabase table but with a UI-friendly surface.
 */
export interface AuditEvent {
  id: string;
  /** Acting principal — user id, system service, or 'system'. */
  actor: string;
  /** Verb-noun action, e.g. 'capacity.logged', 'permission.revoked'. */
  action: string;
  /** What was acted upon — record id, resource path, etc. */
  target: string;
  timestamp: string; // ISO-8601
  metadata?: Record<string, unknown>;
}
