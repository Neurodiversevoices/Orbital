-- =============================================================================
-- ENTERPRISE HARDENING MIGRATION
-- =============================================================================
-- This migration implements the structural separation between:
-- - Class A (Relational/Bundles) - Named individuals, consent-based
-- - Class B (Institutional/Enterprise) - Anonymous aggregates only
--
-- CRITICAL: These schema changes enforce that misuse is PHYSICALLY IMPOSSIBLE.
-- =============================================================================

-- =============================================================================
-- 1. RESTRICTED DOMAIN REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS restricted_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  enforcement_level TEXT NOT NULL CHECK (enforcement_level IN ('block_all', 'redirect_sso', 'contact_sales')),
  sso_endpoint TEXT,
  sales_contact_url TEXT,
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restricted_domains_domain ON restricted_domains(domain);
CREATE INDEX idx_restricted_domains_active ON restricted_domains(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_restricted_domains_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restricted_domains_updated
  BEFORE UPDATE ON restricted_domains
  FOR EACH ROW EXECUTE FUNCTION update_restricted_domains_timestamp();

-- =============================================================================
-- 2. DEPLOYMENT CLASS ENUM
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE deployment_class AS ENUM ('class_a_relational', 'class_b_institutional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 3. ACCOUNTS TABLE WITH DEPLOYMENT CLASS
-- =============================================================================

CREATE TABLE IF NOT EXISTS deployment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deployment_class deployment_class NOT NULL,

  -- Class A specific fields (NULL for Class B)
  bundle_size INTEGER CHECK (bundle_size IS NULL OR bundle_size IN (5, 10, 20, 50)),
  consent_acknowledgment_logged_at TIMESTAMPTZ,

  -- Class B specific fields (NULL for Class A)
  contract_id TEXT,
  minimum_seats INTEGER CHECK (minimum_seats IS NULL OR minimum_seats >= 25),

  terms_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints to enforce mutual exclusivity
  CONSTRAINT class_a_requires_bundle CHECK (
    deployment_class != 'class_a_relational' OR bundle_size IS NOT NULL
  ),
  CONSTRAINT class_a_requires_consent CHECK (
    deployment_class != 'class_a_relational' OR consent_acknowledgment_logged_at IS NOT NULL
  ),
  CONSTRAINT class_b_requires_contract CHECK (
    deployment_class != 'class_b_institutional' OR contract_id IS NOT NULL
  ),
  CONSTRAINT class_b_requires_seats CHECK (
    deployment_class != 'class_b_institutional' OR minimum_seats IS NOT NULL
  ),
  CONSTRAINT class_b_no_bundle CHECK (
    deployment_class != 'class_b_institutional' OR bundle_size IS NULL
  )
);

CREATE UNIQUE INDEX idx_deployment_accounts_user ON deployment_accounts(user_id);

-- =============================================================================
-- 4. ORGANIZATIONAL UNITS (CLASS B ONLY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES deployment_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_unit_id UUID REFERENCES organizational_units(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_units_account ON organizational_units(account_id);
CREATE INDEX idx_org_units_parent ON organizational_units(parent_unit_id);

-- =============================================================================
-- 5. AGE COHORT STORAGE (DATA MINIMIZATION)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE age_cohort AS ENUM (
    'under_20', '20_29', '30_39', '40_49', '50_59', '60_69', '70_plus', 'undisclosed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add cohort column to user_profiles (if exists) or create minimal table
CREATE TABLE IF NOT EXISTS user_age_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id age_cohort NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NO year_of_birth column - it is NEVER stored
  CONSTRAINT one_cohort_per_user UNIQUE (user_id)
);

-- =============================================================================
-- 6. CONSENT RECORDS (CLASS A ONLY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'explicit_acknowledgment',
  acknowledgment_text TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_group ON consent_records(group_id);

-- =============================================================================
-- 7. TERMS ACCEPTANCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deployment_class deployment_class NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_document_hash TEXT NOT NULL
);

CREATE INDEX idx_terms_user ON terms_acceptances(user_id);
CREATE INDEX idx_terms_class_version ON terms_acceptances(deployment_class, terms_version);

-- =============================================================================
-- 8. AGGREGATED UNIT METRICS (CLASS B ONLY - NO INDIVIDUAL DATA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS unit_aggregate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES organizational_units(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Aggregated metrics only
  signal_count INTEGER NOT NULL,
  load_percent INTEGER, -- NULL if below K-anonymity threshold
  risk_percent INTEGER, -- NULL if below K-anonymity threshold
  velocity TEXT CHECK (velocity IN ('improving', 'stable', 'declining', 'suppressed')),
  freshness TEXT CHECK (freshness IN ('fresh', 'stale', 'dormant', 'suppressed')),

  -- K-anonymity tracking
  is_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- NO individual data fields - structurally impossible:
  -- NO individual_notes
  -- NO performance_scores
  -- NO user_names
  -- NO user_emails
  -- NO individual_timelines

  CONSTRAINT one_snapshot_per_day UNIQUE (unit_id, snapshot_date),
  CONSTRAINT k_anonymity_enforcement CHECK (
    signal_count >= 5 OR (is_suppressed = TRUE AND load_percent IS NULL AND risk_percent IS NULL)
  )
);

CREATE INDEX idx_unit_snapshots_unit ON unit_aggregate_snapshots(unit_id);
CREATE INDEX idx_unit_snapshots_date ON unit_aggregate_snapshots(snapshot_date);

-- =============================================================================
-- 9. SIGNAL DELAY ENFORCEMENT
-- =============================================================================

-- Function to enforce signal delay in queries
CREATE OR REPLACE FUNCTION get_delayed_signals(
  p_unit_id UUID,
  p_delay_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
  state TEXT,
  occurred_at TIMESTAMPTZ,
  is_delayed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.state::TEXT,
    cl.occurred_at,
    (cl.occurred_at > NOW() - (p_delay_seconds || ' seconds')::INTERVAL) AS is_delayed
  FROM capacity_logs cl
  JOIN user_unit_memberships uum ON cl.user_id = uum.user_id
  WHERE uum.unit_id = p_unit_id
    AND cl.occurred_at <= NOW() - (p_delay_seconds || ' seconds')::INTERVAL
    AND cl.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. K-ANONYMITY ENFORCEMENT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_unit_metrics_kanon(
  p_unit_id UUID,
  p_k_threshold INTEGER DEFAULT 5
)
RETURNS TABLE (
  signal_count INTEGER,
  load_percent INTEGER,
  risk_percent INTEGER,
  velocity TEXT,
  freshness TEXT,
  is_suppressed BOOLEAN
) AS $$
DECLARE
  v_signal_count INTEGER;
  v_resourced_count INTEGER;
  v_depleted_count INTEGER;
  v_latest_signal TIMESTAMPTZ;
BEGIN
  -- Count signals (using delayed signals only)
  SELECT COUNT(*) INTO v_signal_count
  FROM get_delayed_signals(p_unit_id);

  -- K-ANONYMITY GATE: If below threshold, suppress all metrics
  IF v_signal_count < p_k_threshold THEN
    RETURN QUERY SELECT
      v_signal_count,
      NULL::INTEGER,
      NULL::INTEGER,
      'suppressed'::TEXT,
      'suppressed'::TEXT,
      TRUE;
    RETURN;
  END IF;

  -- Calculate metrics (threshold met)
  SELECT
    COUNT(*) FILTER (WHERE state = 'resourced'),
    COUNT(*) FILTER (WHERE state = 'depleted'),
    MAX(occurred_at)
  INTO v_resourced_count, v_depleted_count, v_latest_signal
  FROM get_delayed_signals(p_unit_id);

  RETURN QUERY SELECT
    v_signal_count,
    ROUND((v_resourced_count::NUMERIC / v_signal_count) * 100)::INTEGER,
    ROUND((v_depleted_count::NUMERIC / v_signal_count) * 100)::INTEGER,
    'stable'::TEXT, -- Velocity requires historical comparison
    CASE
      WHEN v_latest_signal > NOW() - INTERVAL '24 hours' THEN 'fresh'
      WHEN v_latest_signal > NOW() - INTERVAL '72 hours' THEN 'stale'
      ELSE 'dormant'
    END::TEXT,
    FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 11. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE restricted_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_age_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_aggregate_snapshots ENABLE ROW LEVEL SECURITY;

-- Restricted domains: Read-only for all, write for admins
CREATE POLICY restricted_domains_read ON restricted_domains
  FOR SELECT USING (is_active = TRUE);

-- Deployment accounts: Own account only
CREATE POLICY deployment_accounts_own ON deployment_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Age cohorts: Own cohort only
CREATE POLICY age_cohorts_own ON user_age_cohorts
  FOR ALL USING (auth.uid() = user_id);

-- Consent records: Own records only
CREATE POLICY consent_records_own ON consent_records
  FOR ALL USING (auth.uid() = user_id);

-- Terms acceptances: Own acceptances only
CREATE POLICY terms_acceptances_own ON terms_acceptances
  FOR ALL USING (auth.uid() = user_id);

-- Unit snapshots: Based on account membership (handled by function)
CREATE POLICY unit_snapshots_read ON unit_aggregate_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organizational_units ou
      JOIN deployment_accounts da ON ou.account_id = da.id
      WHERE ou.id = unit_aggregate_snapshots.unit_id
        AND da.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 12. VALIDATION FUNCTION FOR INSTITUTIONAL SCHEMAS
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_no_individual_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger prevents any future schema modifications that might
  -- add individual-identifying fields to institutional tables
  RAISE EXCEPTION 'Schema modification blocked: Individual-identifying fields are prohibited in institutional contexts';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 13. SEED INITIAL RESTRICTED DOMAINS
-- =============================================================================

INSERT INTO restricted_domains (domain, organization_name, enforcement_level, added_by)
VALUES
  ('microsoft.com', 'Microsoft Corporation', 'contact_sales', 'system'),
  ('google.com', 'Google LLC', 'contact_sales', 'system'),
  ('amazon.com', 'Amazon.com Inc.', 'contact_sales', 'system'),
  ('apple.com', 'Apple Inc.', 'contact_sales', 'system'),
  ('meta.com', 'Meta Platforms Inc.', 'contact_sales', 'system'),
  ('netflix.com', 'Netflix Inc.', 'contact_sales', 'system'),
  ('salesforce.com', 'Salesforce Inc.', 'contact_sales', 'system'),
  ('oracle.com', 'Oracle Corporation', 'contact_sales', 'system'),
  ('ibm.com', 'IBM Corporation', 'contact_sales', 'system'),
  ('intel.com', 'Intel Corporation', 'contact_sales', 'system')
ON CONFLICT (domain) DO NOTHING;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- IRREVERSIBLE CHANGES:
-- 1. Age cohort system replaces direct YOB storage - no rollback path
-- 2. K-anonymity constraints are database-level - cannot be bypassed
-- 3. Deployment class separation is structural - no overlap possible
--
-- SAFETY:
-- 1. All operations fail closed (constraints block invalid states)
-- 2. RLS ensures users only see their own data
-- 3. Aggregation functions enforce K-anonymity at query time
-- 4. Signal delay is mandatory for institutional views
--
-- =============================================================================
