-- Cloud Patterns v1
-- Migration: 00003_cloud_patterns_v1
-- Created: 2025-01-07
--
-- PURPOSE:
-- Enable cloud backup and cross-device sync for capacity logs.
-- Offline-first: local writes always succeed, cloud sync is best-effort.
-- User-owned data only: RLS ensures auth.uid() = user_id.

-- =============================================================================
-- DROP EXISTING (if re-running migration)
-- =============================================================================

-- Drop existing capacity_logs if it exists (from earlier migration)
DROP TABLE IF EXISTS capacity_logs CASCADE;
DROP TYPE IF EXISTS capacity_state CASCADE;

-- =============================================================================
-- CAPACITY STATE ENUM (matches app types)
-- =============================================================================

CREATE TYPE capacity_state AS ENUM ('resourced', 'stretched', 'depleted');

-- =============================================================================
-- CAPACITY LOGS TABLE
-- =============================================================================

CREATE TABLE capacity_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (required, cascades on user delete)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMPTZ NOT NULL,

    -- Capacity state (resourced/stretched/depleted)
    state capacity_state NOT NULL,

    -- Drivers/tags stored as JSONB array
    -- Example: ["sensory", "sleep", "stress"]
    drivers JSONB DEFAULT '[]'::jsonb,

    -- Optional note text
    note TEXT,

    -- Device tracking for multi-device sync
    source_device_id TEXT,

    -- Client-generated ID for idempotent upserts
    -- Format: local_{timestamp}_{random}
    client_log_id TEXT NOT NULL,

    -- Soft delete support
    deleted_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for idempotent upserts
    CONSTRAINT capacity_logs_user_client_unique UNIQUE (user_id, client_log_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_capacity_logs_user_id ON capacity_logs(user_id);
CREATE INDEX idx_capacity_logs_user_occurred ON capacity_logs(user_id, occurred_at DESC);
CREATE INDEX idx_capacity_logs_synced ON capacity_logs(user_id, synced_at DESC);

-- =============================================================================
-- USER DAILY METRICS (Pre-computed for performance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Daily counts by state
    resourced_count INTEGER NOT NULL DEFAULT 0,
    stretched_count INTEGER NOT NULL DEFAULT 0,
    depleted_count INTEGER NOT NULL DEFAULT 0,

    -- Computed metrics
    total_signals INTEGER NOT NULL DEFAULT 0,
    dominant_state capacity_state,

    -- Timestamps
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_daily_metrics_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX idx_user_daily_metrics_user_date ON user_daily_metrics(user_id, date DESC);

-- =============================================================================
-- CLOUD SYNC SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_cloud_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Whether cloud backup is enabled
    cloud_backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    -- Last successful sync timestamps
    last_push_at TIMESTAMPTZ,
    last_pull_at TIMESTAMPTZ,

    -- Device info for the primary device
    primary_device_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE capacity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cloud_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- capacity_logs: Users can ONLY access their own data
-- NO admin override - user-owned data only
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

CREATE POLICY "Users can manage own daily metrics"
    ON user_daily_metrics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- user_cloud_settings: Users can only manage their own settings
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own cloud settings"
    ON user_cloud_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cloud settings"
    ON user_cloud_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Upsert capacity log (idempotent based on client_log_id)
CREATE OR REPLACE FUNCTION upsert_capacity_log(
    p_user_id UUID,
    p_client_log_id TEXT,
    p_occurred_at TIMESTAMPTZ,
    p_state capacity_state,
    p_drivers JSONB DEFAULT '[]'::jsonb,
    p_note TEXT DEFAULT NULL,
    p_source_device_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Verify caller owns this data
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Access denied: can only upsert own logs';
    END IF;

    INSERT INTO capacity_logs (
        user_id, client_log_id, occurred_at, state, drivers, note, source_device_id
    )
    VALUES (
        p_user_id, p_client_log_id, p_occurred_at, p_state, p_drivers, p_note, p_source_device_id
    )
    ON CONFLICT (user_id, client_log_id) DO UPDATE SET
        occurred_at = EXCLUDED.occurred_at,
        state = EXCLUDED.state,
        drivers = EXCLUDED.drivers,
        note = EXCLUDED.note,
        source_device_id = COALESCE(EXCLUDED.source_device_id, capacity_logs.source_device_id),
        synced_at = NOW()
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch upsert for sync efficiency
CREATE OR REPLACE FUNCTION batch_upsert_capacity_logs(
    p_logs JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_log JSONB;
    v_count INTEGER := 0;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    FOR v_log IN SELECT * FROM jsonb_array_elements(p_logs)
    LOOP
        INSERT INTO capacity_logs (
            user_id,
            client_log_id,
            occurred_at,
            state,
            drivers,
            note,
            source_device_id
        )
        VALUES (
            v_user_id,
            v_log->>'client_log_id',
            (v_log->>'occurred_at')::TIMESTAMPTZ,
            (v_log->>'state')::capacity_state,
            COALESCE(v_log->'drivers', '[]'::jsonb),
            v_log->>'note',
            v_log->>'source_device_id'
        )
        ON CONFLICT (user_id, client_log_id) DO UPDATE SET
            occurred_at = EXCLUDED.occurred_at,
            state = EXCLUDED.state,
            drivers = EXCLUDED.drivers,
            note = EXCLUDED.note,
            source_device_id = COALESCE(EXCLUDED.source_device_id, capacity_logs.source_device_id),
            synced_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pull logs since a given timestamp
CREATE OR REPLACE FUNCTION pull_capacity_logs(
    p_since TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000
)
RETURNS SETOF capacity_logs AS $$
BEGIN
    IF p_since IS NULL THEN
        -- Initial sync: get all logs
        RETURN QUERY
        SELECT *
        FROM capacity_logs
        WHERE user_id = auth.uid()
          AND deleted_at IS NULL
        ORDER BY occurred_at DESC
        LIMIT p_limit;
    ELSE
        -- Incremental sync: get logs modified since timestamp
        RETURN QUERY
        SELECT *
        FROM capacity_logs
        WHERE user_id = auth.uid()
          AND synced_at > p_since
        ORDER BY synced_at DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute daily metrics for a user
CREATE OR REPLACE FUNCTION compute_daily_metrics(
    p_user_id UUID,
    p_date DATE
)
RETURNS void AS $$
DECLARE
    v_counts RECORD;
BEGIN
    -- Verify caller owns this data
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE state = 'resourced') as resourced_count,
        COUNT(*) FILTER (WHERE state = 'stretched') as stretched_count,
        COUNT(*) FILTER (WHERE state = 'depleted') as depleted_count,
        COUNT(*) as total
    INTO v_counts
    FROM capacity_logs
    WHERE user_id = p_user_id
      AND DATE(occurred_at) = p_date
      AND deleted_at IS NULL;

    INSERT INTO user_daily_metrics (
        user_id, date, resourced_count, stretched_count, depleted_count,
        total_signals, dominant_state, computed_at
    )
    VALUES (
        p_user_id, p_date, v_counts.resourced_count, v_counts.stretched_count,
        v_counts.depleted_count, v_counts.total,
        CASE
            WHEN v_counts.resourced_count >= GREATEST(v_counts.stretched_count, v_counts.depleted_count) THEN 'resourced'::capacity_state
            WHEN v_counts.stretched_count >= v_counts.depleted_count THEN 'stretched'::capacity_state
            ELSE 'depleted'::capacity_state
        END,
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        resourced_count = EXCLUDED.resourced_count,
        stretched_count = EXCLUDED.stretched_count,
        depleted_count = EXCLUDED.depleted_count,
        total_signals = EXCLUDED.total_signals,
        dominant_state = EXCLUDED.dominant_state,
        computed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_daily_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_cloud_settings TO authenticated;

GRANT EXECUTE ON FUNCTION upsert_capacity_log TO authenticated;
GRANT EXECUTE ON FUNCTION batch_upsert_capacity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION pull_capacity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION compute_daily_metrics TO authenticated;
