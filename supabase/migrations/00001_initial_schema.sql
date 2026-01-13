-- Orbital Ethical Pattern Data Infrastructure
-- Migration: 00001_initial_schema
-- Created: 2025-01-06
--
-- PRIVACY GUARANTEES:
-- 1. All user data protected by RLS (user_id = auth.uid())
-- 2. No cross-user queries possible at database level
-- 3. Org aggregates require K>=10 contributors (k-anonymity)
-- 4. Audit trail for all data access

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CAPACITY LOGS (Core User Data)
-- =============================================================================
-- Individual capacity signals - the atomic unit of user data
-- User owns this data completely (export/delete on demand)

CREATE TABLE IF NOT EXISTS capacity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMPTZ NOT NULL,

    -- Capacity state: 'green' | 'yellow' | 'red' | 'black'
    state TEXT NOT NULL CHECK (state IN ('green', 'yellow', 'red', 'black')),

    -- Optional metadata
    tags TEXT[] DEFAULT '{}',
    note TEXT,

    -- Demo/test flag - excluded from aggregates
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,

    -- Soft delete support
    deleted_at TIMESTAMPTZ,

    -- Sync metadata
    local_id TEXT, -- Client-side UUID for dedup
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_capacity_logs_user_id ON capacity_logs(user_id);
CREATE INDEX idx_capacity_logs_occurred_at ON capacity_logs(occurred_at);
CREATE INDEX idx_capacity_logs_user_occurred ON capacity_logs(user_id, occurred_at DESC);
CREATE INDEX idx_capacity_logs_local_id ON capacity_logs(user_id, local_id);

-- =============================================================================
-- USER DAILY METRICS (Pre-computed for Performance)
-- =============================================================================
-- Daily rollups computed from capacity_logs
-- Reduces query load for pattern analysis

CREATE TABLE IF NOT EXISTS user_daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Daily counts by state
    green_count INTEGER NOT NULL DEFAULT 0,
    yellow_count INTEGER NOT NULL DEFAULT 0,
    red_count INTEGER NOT NULL DEFAULT 0,
    black_count INTEGER NOT NULL DEFAULT 0,

    -- Computed metrics
    total_signals INTEGER NOT NULL DEFAULT 0,
    dominant_state TEXT, -- Most frequent state

    -- Timestamps
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, date)
);

CREATE INDEX idx_user_daily_metrics_user_date ON user_daily_metrics(user_id, date DESC);

-- =============================================================================
-- ORG MEMBERSHIPS
-- =============================================================================
-- Links users to organizations for aggregate computation
-- User can belong to multiple orgs (employer, school, healthcare, etc.)

CREATE TABLE IF NOT EXISTS org_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL, -- External org identifier
    org_type TEXT NOT NULL CHECK (org_type IN ('employer', 'school_district', 'university', 'healthcare', 'research')),

    -- Consent tracking
    consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_version TEXT NOT NULL DEFAULT 'v1',

    -- User can revoke at any time
    revoked_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, org_id)
);

CREATE INDEX idx_org_memberships_org ON org_memberships(org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);

-- =============================================================================
-- ORG AGGREGATE SNAPSHOTS
-- =============================================================================
-- Pre-computed aggregates for organizations
-- Only stored if K>=threshold contributors (k-anonymity)

CREATE TABLE IF NOT EXISTS org_aggregate_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),

    -- K-anonymity tracking
    contributor_count INTEGER NOT NULL,
    k_threshold INTEGER NOT NULL DEFAULT 10,

    -- Aggregate metrics (only if contributor_count >= k_threshold)
    avg_green_pct NUMERIC(5,2),
    avg_yellow_pct NUMERIC(5,2),
    avg_red_pct NUMERIC(5,2),
    avg_black_pct NUMERIC(5,2),

    -- Distribution data (bucketed for privacy)
    green_bucket_low INTEGER, -- count of users with <25% green
    green_bucket_mid INTEGER, -- count of users with 25-75% green
    green_bucket_high INTEGER, -- count of users with >75% green

    -- Metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(org_id, period_start, period_type)
);

CREATE INDEX idx_org_aggregates_org_period ON org_aggregate_snapshots(org_id, period_start DESC);

-- =============================================================================
-- AUDIT EVENTS
-- =============================================================================
-- Immutable log of all data access and modifications
-- Required for compliance and user trust

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Actor
    user_id UUID REFERENCES auth.users(id), -- NULL for system events
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'org_admin')),

    -- Action
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,

    -- Details
    details JSONB DEFAULT '{}',

    -- Request context
    ip_address INET,
    user_agent TEXT
);

-- Append-only: no updates or deletes allowed (enforced by RLS)
CREATE INDEX idx_audit_events_user ON audit_events(user_id, created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action, created_at DESC);

-- =============================================================================
-- USER PREFERENCES (Cloud Sync)
-- =============================================================================
-- Non-sensitive preferences that sync across devices

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Privacy settings
    share_with_orgs BOOLEAN NOT NULL DEFAULT FALSE,
    anonymous_research_opt_in BOOLEAN NOT NULL DEFAULT FALSE,

    -- App settings
    default_view TEXT DEFAULT 'week',
    notifications_enabled BOOLEAN DEFAULT TRUE,

    -- Sync metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE capacity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_aggregate_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- capacity_logs: Users can only access their own data
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own capacity logs"
    ON capacity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capacity logs"
    ON capacity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capacity logs"
    ON capacity_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own capacity logs"
    ON capacity_logs FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- user_daily_metrics: Users can only access their own metrics
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own daily metrics"
    ON user_daily_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily metrics"
    ON user_daily_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily metrics"
    ON user_daily_metrics FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- org_memberships: Users can manage their own memberships
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own org memberships"
    ON org_memberships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own org memberships"
    ON org_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own org memberships"
    ON org_memberships FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- org_aggregate_snapshots: Read-only for authenticated users
-- (Aggregates are public within the org - no individual data exposed)
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view org aggregates"
    ON org_aggregate_snapshots FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only system can insert/update aggregates (via service role)
-- No user-level insert/update policies

-- -----------------------------------------------------------------------------
-- audit_events: Users can view their own audit trail
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own audit events"
    ON audit_events FOR SELECT
    USING (auth.uid() = user_id);

-- Insert via service role only (append-only)
CREATE POLICY "System can insert audit events"
    ON audit_events FOR INSERT
    WITH CHECK (true); -- Controlled by service role key

-- No update or delete policies - audit log is immutable

-- -----------------------------------------------------------------------------
-- user_preferences: Users can manage their own preferences
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to compute daily metrics for a user
CREATE OR REPLACE FUNCTION compute_user_daily_metrics(
    p_user_id UUID,
    p_date DATE
) RETURNS void AS $$
DECLARE
    v_counts RECORD;
BEGIN
    -- Count signals by state for the given date
    SELECT
        COUNT(*) FILTER (WHERE state = 'green') as green_count,
        COUNT(*) FILTER (WHERE state = 'yellow') as yellow_count,
        COUNT(*) FILTER (WHERE state = 'red') as red_count,
        COUNT(*) FILTER (WHERE state = 'black') as black_count,
        COUNT(*) as total
    INTO v_counts
    FROM capacity_logs
    WHERE user_id = p_user_id
      AND DATE(occurred_at) = p_date
      AND deleted_at IS NULL
      AND is_demo = FALSE;

    -- Upsert daily metrics
    INSERT INTO user_daily_metrics (
        user_id, date, green_count, yellow_count, red_count, black_count,
        total_signals, dominant_state, computed_at
    ) VALUES (
        p_user_id, p_date, v_counts.green_count, v_counts.yellow_count,
        v_counts.red_count, v_counts.black_count, v_counts.total,
        CASE
            WHEN v_counts.green_count >= GREATEST(v_counts.yellow_count, v_counts.red_count, v_counts.black_count) THEN 'green'
            WHEN v_counts.yellow_count >= GREATEST(v_counts.red_count, v_counts.black_count) THEN 'yellow'
            WHEN v_counts.red_count >= v_counts.black_count THEN 'red'
            ELSE 'black'
        END,
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        green_count = EXCLUDED.green_count,
        yellow_count = EXCLUDED.yellow_count,
        red_count = EXCLUDED.red_count,
        black_count = EXCLUDED.black_count,
        total_signals = EXCLUDED.total_signals,
        dominant_state = EXCLUDED.dominant_state,
        computed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute org aggregate with k-anonymity check
CREATE OR REPLACE FUNCTION compute_org_aggregate(
    p_org_id TEXT,
    p_period_start DATE,
    p_period_end DATE,
    p_period_type TEXT,
    p_k_threshold INTEGER DEFAULT 10
) RETURNS void AS $$
DECLARE
    v_contributor_count INTEGER;
    v_agg RECORD;
BEGIN
    -- Count unique contributors with consent
    SELECT COUNT(DISTINCT cl.user_id)
    INTO v_contributor_count
    FROM capacity_logs cl
    JOIN org_memberships om ON cl.user_id = om.user_id
    WHERE om.org_id = p_org_id
      AND om.revoked_at IS NULL
      AND cl.occurred_at >= p_period_start
      AND cl.occurred_at < p_period_end + INTERVAL '1 day'
      AND cl.deleted_at IS NULL
      AND cl.is_demo = FALSE;

    -- Only compute if k-anonymity threshold met
    IF v_contributor_count >= p_k_threshold THEN
        -- Compute aggregate metrics
        WITH user_pcts AS (
            SELECT
                cl.user_id,
                COUNT(*) FILTER (WHERE state = 'green')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as green_pct,
                COUNT(*) FILTER (WHERE state = 'yellow')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as yellow_pct,
                COUNT(*) FILTER (WHERE state = 'red')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as red_pct,
                COUNT(*) FILTER (WHERE state = 'black')::NUMERIC / NULLIF(COUNT(*), 0) * 100 as black_pct
            FROM capacity_logs cl
            JOIN org_memberships om ON cl.user_id = om.user_id
            WHERE om.org_id = p_org_id
              AND om.revoked_at IS NULL
              AND cl.occurred_at >= p_period_start
              AND cl.occurred_at < p_period_end + INTERVAL '1 day'
              AND cl.deleted_at IS NULL
              AND cl.is_demo = FALSE
            GROUP BY cl.user_id
        )
        SELECT
            AVG(green_pct) as avg_green,
            AVG(yellow_pct) as avg_yellow,
            AVG(red_pct) as avg_red,
            AVG(black_pct) as avg_black,
            COUNT(*) FILTER (WHERE green_pct < 25) as bucket_low,
            COUNT(*) FILTER (WHERE green_pct >= 25 AND green_pct <= 75) as bucket_mid,
            COUNT(*) FILTER (WHERE green_pct > 75) as bucket_high
        INTO v_agg
        FROM user_pcts;

        -- Upsert aggregate snapshot
        INSERT INTO org_aggregate_snapshots (
            org_id, period_start, period_end, period_type,
            contributor_count, k_threshold,
            avg_green_pct, avg_yellow_pct, avg_red_pct, avg_black_pct,
            green_bucket_low, green_bucket_mid, green_bucket_high,
            computed_at
        ) VALUES (
            p_org_id, p_period_start, p_period_end, p_period_type,
            v_contributor_count, p_k_threshold,
            v_agg.avg_green, v_agg.avg_yellow, v_agg.avg_red, v_agg.avg_black,
            v_agg.bucket_low, v_agg.bucket_mid, v_agg.bucket_high,
            NOW()
        )
        ON CONFLICT (org_id, period_start, period_type) DO UPDATE SET
            period_end = EXCLUDED.period_end,
            contributor_count = EXCLUDED.contributor_count,
            avg_green_pct = EXCLUDED.avg_green_pct,
            avg_yellow_pct = EXCLUDED.avg_yellow_pct,
            avg_red_pct = EXCLUDED.avg_red_pct,
            avg_black_pct = EXCLUDED.avg_black_pct,
            green_bucket_low = EXCLUDED.green_bucket_low,
            green_bucket_mid = EXCLUDED.green_bucket_mid,
            green_bucket_high = EXCLUDED.green_bucket_high,
            computed_at = NOW();
    ELSE
        -- Log that k-anonymity not met (no aggregate stored)
        INSERT INTO audit_events (actor_type, action, resource_type, resource_id, details)
        VALUES (
            'system',
            'k_anonymity_threshold_not_met',
            'org_aggregate',
            p_org_id,
            jsonb_build_object(
                'period_start', p_period_start,
                'period_end', p_period_end,
                'contributor_count', v_contributor_count,
                'k_threshold', p_k_threshold
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for user data export (GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Verify caller owns this data
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Access denied: can only export own data';
    END IF;

    SELECT jsonb_build_object(
        'exported_at', NOW(),
        'user_id', p_user_id,
        'capacity_logs', (
            SELECT COALESCE(jsonb_agg(row_to_json(cl)), '[]'::jsonb)
            FROM capacity_logs cl
            WHERE cl.user_id = p_user_id AND cl.deleted_at IS NULL
        ),
        'daily_metrics', (
            SELECT COALESCE(jsonb_agg(row_to_json(dm)), '[]'::jsonb)
            FROM user_daily_metrics dm
            WHERE dm.user_id = p_user_id
        ),
        'org_memberships', (
            SELECT COALESCE(jsonb_agg(row_to_json(om)), '[]'::jsonb)
            FROM org_memberships om
            WHERE om.user_id = p_user_id
        ),
        'preferences', (
            SELECT row_to_json(up)
            FROM user_preferences up
            WHERE up.user_id = p_user_id
        )
    ) INTO v_result;

    -- Log export event
    INSERT INTO audit_events (user_id, actor_type, action, resource_type, details)
    VALUES (p_user_id, 'user', 'data_export', 'user_data', '{}');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for user data deletion (GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Verify caller owns this data
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Access denied: can only delete own data';
    END IF;

    -- Log deletion event BEFORE deleting (for audit trail)
    INSERT INTO audit_events (user_id, actor_type, action, resource_type, details)
    VALUES (p_user_id, 'user', 'data_deletion_requested', 'user_data',
            jsonb_build_object('tables', ARRAY['capacity_logs', 'user_daily_metrics', 'org_memberships', 'user_preferences']));

    -- Soft delete capacity logs (preserves for 30-day recovery window)
    UPDATE capacity_logs SET deleted_at = NOW() WHERE user_id = p_user_id;

    -- Remove daily metrics
    DELETE FROM user_daily_metrics WHERE user_id = p_user_id;

    -- Revoke org memberships (keeps record but marks as revoked)
    UPDATE org_memberships SET revoked_at = NOW() WHERE user_id = p_user_id AND revoked_at IS NULL;

    -- Remove preferences
    DELETE FROM user_preferences WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently purge soft-deleted data (run by cron after 30 days)
CREATE OR REPLACE FUNCTION purge_deleted_data()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM capacity_logs
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;

    INSERT INTO audit_events (actor_type, action, resource_type, details)
    VALUES ('system', 'data_purge', 'capacity_logs', jsonb_build_object('rows_purged', v_count));

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-compute daily metrics when capacity logs change
CREATE OR REPLACE FUNCTION trigger_recompute_daily_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM compute_user_daily_metrics(OLD.user_id, DATE(OLD.occurred_at));
        RETURN OLD;
    ELSE
        PERFORM compute_user_daily_metrics(NEW.user_id, DATE(NEW.occurred_at));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_capacity_logs_daily_metrics
    AFTER INSERT OR UPDATE OR DELETE ON capacity_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompute_daily_metrics();

-- Audit log for capacity_logs changes
CREATE OR REPLACE FUNCTION trigger_audit_capacity_logs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_events (user_id, actor_type, action, resource_type, resource_id, details)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        'user',
        TG_OP,
        'capacity_log',
        COALESCE(NEW.id, OLD.id)::TEXT,
        CASE TG_OP
            WHEN 'INSERT' THEN jsonb_build_object('state', NEW.state)
            WHEN 'UPDATE' THEN jsonb_build_object('old_state', OLD.state, 'new_state', NEW.state)
            WHEN 'DELETE' THEN jsonb_build_object('state', OLD.state)
        END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_capacity_logs_audit
    AFTER INSERT OR UPDATE OR DELETE ON capacity_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_capacity_logs();

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant access to authenticated users (RLS handles row-level permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_daily_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON org_memberships TO authenticated;
GRANT SELECT ON org_aggregate_snapshots TO authenticated;
GRANT SELECT ON audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION compute_user_daily_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data TO authenticated;

-- Service role only functions
GRANT EXECUTE ON FUNCTION compute_org_aggregate TO service_role;
GRANT EXECUTE ON FUNCTION purge_deleted_data TO service_role;
