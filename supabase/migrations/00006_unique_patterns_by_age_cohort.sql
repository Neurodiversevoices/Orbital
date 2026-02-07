-- =============================================================================
-- UNIQUE PATTERNS BY AGE COHORT (Aggregate-Only RPC)
-- =============================================================================
-- Migration: 00006_unique_patterns_by_age_cohort
-- Created: 2026-02-07
--
-- PURPOSE:
-- Count unique capacity patterns per age cohort over a configurable window.
-- Output is aggregate-only: no user_id, no email, no PII of any kind.
--
-- PATTERN KEY (v1):
--   near_limit_rate : dominant_driver : volatility
--   e.g. "LOW:sensory:STABLE"
--
-- Axes:
--   near_limit_rate = % of depleted signals → LOW (<15%) / MID (15-40%) / HIGH (>40%)
--   dominant_driver = most frequent driver from JSONB → sensory / demand / social / none
--   volatility      = stddev of daily mean capacity  → STABLE (<0.15) / VARIABLE (0.15-0.30) / SPIKY (>=0.30)
--
-- Capacity numeric mapping (from types/index.ts):
--   resourced = 1.0, stretched = 0.5, depleted = 0.0
--
-- GOVERNANCE:
--   - SECURITY DEFINER: bypasses RLS to aggregate across users
--   - GRANTED TO service_role ONLY (not authenticated)
--   - Returns zero individual-level rows
--   - Age cohort resolution: user_age_cohorts > year_of_birth > 'unknown'
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unique_patterns_by_age_cohort(
  window_days INT DEFAULT 90
)
RETURNS TABLE (
  age_cohort  TEXT,
  users_with_logs BIGINT,
  unique_patterns BIGINT
)
AS $$

WITH user_window_logs AS (
  -- All non-deleted logs within the window
  SELECT
    cl.user_id,
    cl.state,
    cl.drivers,
    DATE(cl.occurred_at) AS log_date
  FROM capacity_logs cl
  WHERE cl.deleted_at IS NULL
    AND cl.occurred_at >= NOW() - (window_days || ' days')::INTERVAL
),

-- -----------------------------------------------------------------------
-- AXIS 1: Near-limit rate (depleted %)
-- -----------------------------------------------------------------------
user_near_limit AS (
  SELECT
    user_id,
    COUNT(*) AS total_logs,
    ROUND(
      COUNT(*) FILTER (WHERE state = 'depleted')::NUMERIC
      / NULLIF(COUNT(*), 0) * 100
    ) AS depleted_pct
  FROM user_window_logs
  GROUP BY user_id
),

-- -----------------------------------------------------------------------
-- AXIS 2: Dominant driver (most frequent category from JSONB array)
-- -----------------------------------------------------------------------
driver_counts AS (
  SELECT
    uwl.user_id,
    d.driver,
    COUNT(*) AS cnt
  FROM user_window_logs uwl,
    LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(uwl.drivers) = 'array' AND jsonb_array_length(uwl.drivers) > 0
           THEN uwl.drivers
           ELSE '[]'::jsonb
      END
    ) AS d(driver)
  WHERE d.driver IN ('sensory', 'demand', 'social')
  GROUP BY uwl.user_id, d.driver
),

user_dominant_driver AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    driver
  FROM driver_counts
  ORDER BY user_id, cnt DESC, driver  -- deterministic tie-break: alphabetical
),

-- -----------------------------------------------------------------------
-- AXIS 3: Volatility (stddev of daily mean capacity)
-- -----------------------------------------------------------------------
user_daily_means AS (
  SELECT
    user_id,
    log_date,
    AVG(
      CASE state
        WHEN 'resourced' THEN 1.0
        WHEN 'stretched'  THEN 0.5
        WHEN 'depleted'   THEN 0.0
      END
    ) AS day_mean
  FROM user_window_logs
  GROUP BY user_id, log_date
),

user_volatility AS (
  SELECT
    user_id,
    COALESCE(STDDEV(day_mean), 0) AS vol
  FROM user_daily_means
  GROUP BY user_id
),

-- -----------------------------------------------------------------------
-- ASSEMBLE PATTERN KEY PER USER
-- -----------------------------------------------------------------------
user_patterns AS (
  SELECT
    unl.user_id,
    CASE
      WHEN unl.depleted_pct < 15 THEN 'LOW'
      WHEN unl.depleted_pct <= 40 THEN 'MID'
      ELSE 'HIGH'
    END
    || ':' ||
    COALESCE(udd.driver, 'none')
    || ':' ||
    CASE
      WHEN uv.vol < 0.15 THEN 'STABLE'
      WHEN uv.vol < 0.30 THEN 'VARIABLE'
      ELSE 'SPIKY'
    END
    AS pattern_key
  FROM user_near_limit unl
  LEFT JOIN user_dominant_driver udd ON unl.user_id = udd.user_id
  LEFT JOIN user_volatility uv ON unl.user_id = uv.user_id
),

-- -----------------------------------------------------------------------
-- RESOLVE AGE COHORT PER USER
-- Priority: user_age_cohorts.cohort_id > compute from year_of_birth > 'unknown'
-- -----------------------------------------------------------------------
user_cohort AS (
  SELECT
    up.user_id,
    COALESCE(
      uac.cohort_id::TEXT,
      CASE
        WHEN prof.year_of_birth IS NOT NULL THEN
          CASE
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 20 THEN 'under_20'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 30 THEN '20_29'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 40 THEN '30_39'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 50 THEN '40_49'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 60 THEN '50_59'
            WHEN EXTRACT(YEAR FROM CURRENT_DATE) - prof.year_of_birth < 70 THEN '60_69'
            ELSE '70_plus'
          END
        ELSE 'unknown'
      END
    ) AS cohort
  FROM user_patterns up
  LEFT JOIN user_age_cohorts uac ON up.user_id = uac.user_id
  LEFT JOIN user_profiles prof ON up.user_id = prof.user_id
)

-- -----------------------------------------------------------------------
-- FINAL AGGREGATE: no user_id, no PII
-- -----------------------------------------------------------------------
SELECT
  uc.cohort         AS age_cohort,
  COUNT(DISTINCT up.user_id) AS users_with_logs,
  COUNT(DISTINCT up.pattern_key) AS unique_patterns
FROM user_patterns up
JOIN user_cohort uc ON up.user_id = uc.user_id
GROUP BY uc.cohort
ORDER BY uc.cohort;

$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- GOVERNANCE: service_role only — not callable from client-side
-- =============================================================================
REVOKE ALL ON FUNCTION get_unique_patterns_by_age_cohort(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_unique_patterns_by_age_cohort(INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION get_unique_patterns_by_age_cohort(INT) TO service_role;

-- =============================================================================
-- USAGE (from Supabase SQL Editor or service_role API):
--
--   SELECT * FROM get_unique_patterns_by_age_cohort();        -- default 90 days
--   SELECT * FROM get_unique_patterns_by_age_cohort(30);      -- 30-day window
--   SELECT * FROM get_unique_patterns_by_age_cohort(365);     -- 1-year window
--
-- Expected output:
--   age_cohort   | users_with_logs | unique_patterns
--   -------------|-----------------|----------------
--   20_29        | 12              | 8
--   30_39        | 23              | 14
--   unknown      | 45              | 19
-- =============================================================================
