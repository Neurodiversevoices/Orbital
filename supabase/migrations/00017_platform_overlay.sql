-- =============================================================================
-- Migration 00017: Platform Overlay Backing Tables
-- =============================================================================
-- Platform overlay backing tables. permission_grants tracks tool grants from
-- app/(platform)/permissions.tsx. platform_memory_records backs the 4-scope
-- memory dashboard (Ephemeral / Workspace / Profile / Implicit).
-- audit_events extended for platform overlay's richer event shape (actor,
-- target, metadata) without breaking existing inserts.
--
-- ADDITIVE ONLY — safe to re-run. No existing rows are modified.
-- =============================================================================

-- =============================================================================
-- PERMISSION GRANTS
-- =============================================================================
-- Every active grant is owned by a single user. Revocation is preserved via
-- revoked_at (soft-delete) so the audit trail stays intact. DELETE is not
-- exposed via RLS — callers must UPDATE revoked_at = now() instead.
-- =============================================================================

CREATE TABLE IF NOT EXISTS permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  scope TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_permission_grants_user
  ON permission_grants(user_id, revoked_at);

ALTER TABLE permission_grants ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'permission_grants' AND policyname = 'Users can read own grants'
  ) THEN
    CREATE POLICY "Users can read own grants"
      ON permission_grants FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'permission_grants' AND policyname = 'Users can insert own grants'
  ) THEN
    CREATE POLICY "Users can insert own grants"
      ON permission_grants FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'permission_grants' AND policyname = 'Users can update own grants'
  ) THEN
    CREATE POLICY "Users can update own grants"
      ON permission_grants FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  -- Note: NO DELETE policy. Use UPDATE revoked_at = now() to preserve trail.
END$$;

-- =============================================================================
-- PLATFORM MEMORY RECORDS
-- =============================================================================
-- Backs the 4-scope memory dashboard:
--   ephemeral — session-only (rarely persisted; included for symmetry)
--   workspace — scoped to org/circle
--   profile   — persistent, user-owned, exportable
--   implicit  — inferred preferences/patterns, fully user-editable
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_memory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('ephemeral','workspace','profile','implicit')),
  content TEXT NOT NULL,
  source TEXT,
  user_editable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_user_scope
  ON platform_memory_records(user_id, scope);

ALTER TABLE platform_memory_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_memory_records' AND policyname = 'Users can read own memory'
  ) THEN
    CREATE POLICY "Users can read own memory"
      ON platform_memory_records FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_memory_records' AND policyname = 'Users can insert own memory'
  ) THEN
    CREATE POLICY "Users can insert own memory"
      ON platform_memory_records FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_memory_records' AND policyname = 'Users can update own memory'
  ) THEN
    CREATE POLICY "Users can update own memory"
      ON platform_memory_records FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_memory_records' AND policyname = 'Users can delete own memory'
  ) THEN
    CREATE POLICY "Users can delete own memory"
      ON platform_memory_records FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- =============================================================================
-- AUDIT EVENTS — EXTEND
-- =============================================================================
-- The existing audit_events table (created in 00001) carries:
--   id, created_at, user_id, actor_type, action, resource_type, resource_id,
--   details, ip_address, user_agent
--
-- The platform overlay's AuditEvent shape adds three richer fields:
--   actor    — free-form actor string (e.g. user id, 'system', 'org_admin')
--              decoupled from actor_type for human-readable rendering
--   target   — what was acted upon (record id, resource path, etc.)
--   metadata — JSONB (separate from existing `details` to avoid overloading)
--
-- All additions are nullable / defaulted so existing inserts continue to work.
-- =============================================================================

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS actor TEXT;

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS target TEXT;

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
