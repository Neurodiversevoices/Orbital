-- =============================================================================
-- UNIQUE CAPACITY PATTERNS BY AGE COHORT
-- Migration: 00006_unique_patterns_by_age_cohort
-- Created: 2026-02-07
-- =============================================================================
--
-- PURPOSE:
-- Aggregate-only RPC to count unique capacity "patterns" by age cohort.
-- Internal analytics only. NO PII is ever returned.
--
-- PATTERN KEY (v1) — deterministic, per-user, over a rolling window:
--
--   component        | bucket     | definition
--   -----------------+------------+---------------------------------------------
--   near_limit_rate  | LOW        | depleted_rate < 20%
--                    | MID        | depleted_rate >= 20% and < 50%
--                    | HIGH       | depleted_rate >= 50%
--   dominant_driver  | sensory    | most frequent primary category in drivers[]
--                    | demand     | (primary categories: sensory, demand, social)
--                    | social     |
--                    | none       | no primary categories logged
--   volatility       | STABLE     | stddev_pop(state_numeric) < 0.5
--                    | VARIABLE   | stddev_pop >= 0.5 and < 0.8
--                    | SPIKY      | stddev_pop >= 0.8
--
-- CAPACITY STATE NUMERIC MAPPING:
--   resourced = 3, stretched = 2, depleted = 1
--
-- AGE COHORT RESOLUTION (priority order):
--   1. user_age_cohorts.cohort_id  (enterprise path, already a decade band)
--   2. user_profiles.year_of_birth → mapped to decade band
--   3. 'unknown'
--
-- OUTPUT COLUMNS (aggregate-only):
--   age_cohort      TEXT    — decade band or 'unknown'
--   users_with_logs INTEGER — distinct users with ≥1 log in window
--   unique_patterns INTEGER — distinct pattern_key values in that cohort
--
-- GOVERNANCE:
--   • SECURITY DEFINER — runs with owner privileges, not caller
--   • GRANT to service_role ONLY — unreachable from client SDK
--   • No user_id, no email, no note, no timestamps in output
--   • No drill-down, no exports, no row-level data
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unique_patterns_by_age_cohort(
    p_window_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    age_cohort      TEXT,
    users_with_logs INTEGER,
    unique_patterns INTEGER
)
AS $$
BEGIN
    RETURN QUERY
    WITH

    -- -----------------------------------------------------------------------
    -- Step 1: Collect non-deleted logs within the rolling window
    -- -----------------------------------------------------------------------
    windowed_logs AS (
        SELECT
            cl.user_id,
            cl.state,
            cl.drivers
        FROM capacity_logs cl
        WHERE cl.occurred_at >= (CURRENT_DATE - (p_window_days || ' days')::INTERVAL)
          AND cl.deleted_at IS NULL
    ),

    -- -----------------------------------------------------------------------
    -- Step 2: Per-user aggregates for pattern computation
    -- -----------------------------------------------------------------------
    user_aggs AS (
        SELECT
            wl.user_id,
            COUNT(*)                                            AS total_logs,
            COUNT(*) FILTER (WHERE wl.state = 'depleted')       AS depleted_count,
            -- Numeric mapping: resourced=3, stretched=2, depleted=1
            STDDEV_POP(
                CASE wl.state
                    WHEN 'resourced' THEN 3.0
                    WHEN 'stretched'  THEN 2.0
                    WHEN 'depleted'   THEN 1.0
                END
            )                                                   AS state_stddev,
            -- Primary driver category counts
            COUNT(*) FILTER (WHERE wl.drivers ? 'sensory')      AS sensory_ct,
            COUNT(*) FILTER (WHERE wl.drivers ? 'demand')       AS demand_ct,
            COUNT(*) FILTER (WHERE wl.drivers ? 'social')       AS social_ct
        FROM windowed_logs wl
        GROUP BY wl.user_id
    ),

    -- -----------------------------------------------------------------------
    -- Step 3: Compute the three pattern components per user
    -- -----------------------------------------------------------------------
    user_patterns AS (
        SELECT
            ua.user_id,

            -- near_limit_rate: proportion of depleted signals
            CASE
                WHEN ua.depleted_count::NUMERIC / ua.total_logs >= 0.5 THEN 'HIGH'
                WHEN ua.depleted_count::NUMERIC / ua.total_logs >= 0.2 THEN 'MID'
                ELSE 'LOW'
            END AS near_limit_rate,

            -- dominant_driver: most frequent primary category
            -- Tiebreak: demand > sensory > social (alphabetical)
            CASE
                WHEN GREATEST(ua.sensory_ct, ua.demand_ct, ua.social_ct) = 0
                    THEN 'none'
                WHEN ua.demand_ct >= ua.sensory_ct AND ua.demand_ct >= ua.social_ct
                    THEN 'demand'
                WHEN ua.sensory_ct >= ua.social_ct
                    THEN 'sensory'
                ELSE 'social'
            END AS dominant_driver,

            -- volatility: stddev of numeric state values
            CASE
                WHEN COALESCE(ua.state_stddev, 0) >= 0.8 THEN 'SPIKY'
                WHEN COALESCE(ua.state_stddev, 0) >= 0.5 THEN 'VARIABLE'
                ELSE 'STABLE'
            END AS volatility

        FROM user_aggs ua
    ),

    -- -----------------------------------------------------------------------
    -- Step 4: Assemble pattern_key string
    -- -----------------------------------------------------------------------
    user_pattern_keys AS (
        SELECT
            up.user_id,
            up.near_limit_rate || ':' || up.dominant_driver || ':' || up.volatility
                AS pattern_key
        FROM user_patterns up
    ),

    -- -----------------------------------------------------------------------
    -- Step 5: Resolve age cohort per user
    --   Priority 1: enterprise cohort (user_age_cohorts)
    --   Priority 2: year_of_birth → decade band (user_profiles)
    --   Priority 3: 'unknown'
    -- -----------------------------------------------------------------------
    user_cohorts AS (
        SELECT
            upk.user_id,
            upk.pattern_key,
            COALESCE(
                -- Enterprise cohort (already a decade band)
                uac.cohort_id::TEXT,
                -- Standard path: derive decade band from year_of_birth
                CASE
                    WHEN prof.year_of_birth IS NOT NULL THEN
                        CASE
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 20
                                THEN 'under_20'
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 30
                                THEN '20_29'
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 40
                                THEN '30_39'
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 50
                                THEN '40_49'
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 60
                                THEN '50_59'
                            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 70
                                THEN '60_69'
                            ELSE '70_plus'
                        END
                END,
                -- Fallback
                'unknown'
            ) AS resolved_cohort
        FROM user_pattern_keys upk
        LEFT JOIN user_age_cohorts uac ON upk.user_id = uac.user_id
        LEFT JOIN user_profiles    prof ON upk.user_id = prof.user_id
    )

    -- -----------------------------------------------------------------------
    -- Step 6: Final aggregate — ONLY counts, NO identifiers
    -- -----------------------------------------------------------------------
    SELECT
        uc.resolved_cohort                          AS age_cohort,
        COUNT(DISTINCT uc.user_id)::INTEGER         AS users_with_logs,
        COUNT(DISTINCT uc.pattern_key)::INTEGER     AS unique_patterns
    FROM user_cohorts uc
    GROUP BY uc.resolved_cohort
    ORDER BY uc.resolved_cohort;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GOVERNANCE: Lock down access to service_role only
-- =============================================================================

-- Revoke from everyone first
REVOKE ALL ON FUNCTION get_unique_patterns_by_age_cohort(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_unique_patterns_by_age_cohort(INTEGER) FROM authenticated;

-- Grant ONLY to service_role (server-side / admin console)
GRANT EXECUTE ON FUNCTION get_unique_patterns_by_age_cohort(INTEGER) TO service_role;

-- Descriptive comment for discoverability
COMMENT ON FUNCTION get_unique_patterns_by_age_cohort IS
    'Aggregate-only: returns unique capacity pattern counts by age cohort. '
    'No PII, no user_id, no drill-down. service_role access only. '
    'Pattern key v1: near_limit_rate:dominant_driver:volatility';
