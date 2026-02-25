-- =============================================================================
-- Migration 00009: Admin Analytics Views
-- =============================================================================
-- Creates admin-only views for the operator dashboard.
--
-- SECURITY:
-- - These are SECURITY DEFINER functions callable ONLY via service_role key.
-- - No RLS policies — the functions themselves enforce access control.
-- - Regular authenticated users CANNOT call these functions.
-- - The API route gates on a hardcoded admin email list.
-- =============================================================================

-- =============================================================================
-- ADMIN: User Overview Function
-- =============================================================================
-- Returns one row per user with plan status, entitlements, CCI status,
-- signal counts, logging days, last active date, and CCI eligibility.
--
-- Uses service_role to bypass RLS and join across auth.users + app tables.
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_get_user_overview()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  user_created_at TIMESTAMPTZ,
  plan_status TEXT,
  entitlement_source TEXT,
  entitlement_expires_at TIMESTAMPTZ,
  cci_status TEXT,
  cci_tier TEXT,
  total_signals BIGINT,
  total_unique_days BIGINT,
  last_active_date TIMESTAMPTZ,
  days_until_cci_eligible INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_signals AS (
    SELECT
      cl.user_id,
      COUNT(*) AS total_signals,
      COUNT(DISTINCT cl.occurred_at::date) AS total_unique_days,
      MAX(cl.occurred_at) AS last_active
    FROM capacity_logs cl
    WHERE cl.deleted_at IS NULL AND cl.is_demo = FALSE
    GROUP BY cl.user_id
  ),
  user_plans AS (
    SELECT
      ue.user_id,
      -- Determine plan status from highest-priority entitlement
      CASE
        WHEN EXISTS (SELECT 1 FROM user_entitlements ue2 WHERE ue2.user_id = ue.user_id AND ue2.entitlement_id LIKE 'bundle_%') THEN 'bundle'
        WHEN EXISTS (SELECT 1 FROM user_entitlements ue2 WHERE ue2.user_id = ue.user_id AND ue2.entitlement_id = 'circle_access') THEN 'circle'
        WHEN EXISTS (SELECT 1 FROM user_entitlements ue2 WHERE ue2.user_id = ue.user_id AND ue2.entitlement_id = 'pro_access') THEN
          CASE
            WHEN EXISTS (SELECT 1 FROM purchase_history ph WHERE ph.user_id = ue.user_id AND ph.product_id LIKE '%annual%' AND ph.status = 'completed') THEN 'pro_annual'
            ELSE 'pro_monthly'
          END
        ELSE 'free'
      END AS plan_status,
      -- Source of the primary entitlement
      (SELECT ue2.source FROM user_entitlements ue2 WHERE ue2.user_id = ue.user_id ORDER BY ue2.granted_at DESC LIMIT 1) AS entitlement_source,
      -- Earliest expiring entitlement
      (SELECT MIN(ue2.expires_at) FROM user_entitlements ue2 WHERE ue2.user_id = ue.user_id AND ue2.expires_at IS NOT NULL) AS entitlement_expires_at
    FROM user_entitlements ue
    GROUP BY ue.user_id
  ),
  user_cci AS (
    SELECT
      ue.user_id,
      CASE
        WHEN ue.entitlement_id = 'cci_bundle_purchased' THEN 'purchased'
        WHEN ue.entitlement_id = 'cci_circle_purchased' THEN 'purchased'
        WHEN ue.entitlement_id = 'cci_purchased' THEN 'purchased'
        ELSE 'not_purchased'
      END AS cci_status,
      CASE
        WHEN ue.entitlement_id = 'cci_bundle_purchased' THEN 'bundle'
        WHEN ue.entitlement_id = 'cci_circle_purchased' THEN 'circle'
        WHEN ue.entitlement_id = 'cci_purchased' THEN 'individual'
        ELSE NULL
      END AS cci_tier
    FROM user_entitlements ue
    WHERE ue.entitlement_id IN ('cci_purchased', 'cci_circle_purchased', 'cci_bundle_purchased')
  )
  SELECT
    au.id AS user_id,
    au.email::TEXT,
    au.created_at AS user_created_at,
    COALESCE(up.plan_status, 'free')::TEXT,
    up.entitlement_source::TEXT,
    up.entitlement_expires_at,
    COALESCE(uc.cci_status, 'not_purchased')::TEXT,
    uc.cci_tier::TEXT,
    COALESCE(us.total_signals, 0),
    COALESCE(us.total_unique_days, 0),
    us.last_active,
    GREATEST(0, 90 - COALESCE(us.total_unique_days, 0))::INTEGER
  FROM auth.users au
  LEFT JOIN user_plans up ON au.id = up.user_id
  LEFT JOIN user_cci uc ON au.id = uc.user_id
  LEFT JOIN user_signals us ON au.id = us.user_id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role can execute
REVOKE ALL ON FUNCTION admin_get_user_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_user_overview() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_overview() TO service_role;

-- =============================================================================
-- ADMIN: Capacity by Age Cohort
-- =============================================================================
-- Aggregates capacity patterns by age band. No individual data.
-- Age bands: 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_get_capacity_by_age_cohort(
  p_window_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  age_cohort TEXT,
  user_count BIGINT,
  total_signals BIGINT,
  avg_stability_score NUMERIC(5,2),
  avg_depleted_pct NUMERIC(5,2),
  avg_green_pct NUMERIC(5,2),
  most_common_state TEXT,
  avg_logging_frequency NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH user_age_bands AS (
    SELECT
      up.user_id,
      CASE
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 13 AND 17 THEN '13-17'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 18 AND 24 THEN '18-24'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 25 AND 34 THEN '25-34'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 35 AND 44 THEN '35-44'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 45 AND 54 THEN '45-54'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth BETWEEN 55 AND 64 THEN '55-64'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - up.year_of_birth >= 65 THEN '65+'
        ELSE 'unknown'
      END AS cohort
    FROM user_profiles up
    WHERE up.year_of_birth IS NOT NULL
  ),
  user_metrics AS (
    SELECT
      uab.cohort,
      cl.user_id,
      COUNT(*) AS signals,
      COUNT(DISTINCT cl.occurred_at::date) AS unique_days,
      COUNT(*) FILTER (WHERE cl.state = 'green')::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS green_pct,
      COUNT(*) FILTER (WHERE cl.state = 'yellow')::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS yellow_pct,
      (COUNT(*) FILTER (WHERE cl.state = 'red') + COUNT(*) FILTER (WHERE cl.state = 'black'))::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS depleted_pct,
      -- Stability = percentage of days where dominant state is the same as overall dominant
      -- Simplified: green% as a proxy for stability (higher green = more stable)
      COUNT(*) FILTER (WHERE cl.state = 'green')::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS stability_proxy,
      -- Logging frequency = unique days / window days
      COUNT(DISTINCT cl.occurred_at::date)::NUMERIC / p_window_days * 100 AS logging_freq,
      -- Dominant state per user
      MODE() WITHIN GROUP (ORDER BY cl.state) AS dominant
    FROM capacity_logs cl
    JOIN user_age_bands uab ON cl.user_id = uab.user_id
    WHERE cl.deleted_at IS NULL
      AND cl.is_demo = FALSE
      AND cl.occurred_at >= CURRENT_DATE - (p_window_days || ' days')::INTERVAL
    GROUP BY uab.cohort, cl.user_id
  )
  SELECT
    um.cohort AS age_cohort,
    COUNT(DISTINCT um.user_id) AS user_count,
    SUM(um.signals) AS total_signals,
    AVG(um.stability_proxy)::NUMERIC(5,2) AS avg_stability_score,
    AVG(um.depleted_pct)::NUMERIC(5,2) AS avg_depleted_pct,
    AVG(um.green_pct)::NUMERIC(5,2) AS avg_green_pct,
    MODE() WITHIN GROUP (ORDER BY um.dominant) AS most_common_state,
    AVG(um.logging_freq)::NUMERIC(5,2) AS avg_logging_frequency
  FROM user_metrics um
  GROUP BY um.cohort
  ORDER BY
    CASE um.cohort
      WHEN '13-17' THEN 1
      WHEN '18-24' THEN 2
      WHEN '25-34' THEN 3
      WHEN '35-44' THEN 4
      WHEN '45-54' THEN 5
      WHEN '55-64' THEN 6
      WHEN '65+' THEN 7
      ELSE 8
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION admin_get_capacity_by_age_cohort(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_capacity_by_age_cohort(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_capacity_by_age_cohort(INTEGER) TO service_role;

-- =============================================================================
-- ADMIN: Summary stats function
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_get_summary_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_pro BIGINT,
  total_free BIGINT,
  total_cci_purchased BIGINT,
  total_signals BIGINT,
  total_active_today BIGINT,
  total_active_7d BIGINT,
  total_active_30d BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users)::BIGINT AS total_users,
    (SELECT COUNT(DISTINCT user_id) FROM user_entitlements WHERE entitlement_id = 'pro_access')::BIGINT AS total_pro,
    (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT user_id FROM user_entitlements WHERE entitlement_id = 'pro_access'))::BIGINT AS total_free,
    (SELECT COUNT(DISTINCT user_id) FROM user_entitlements WHERE entitlement_id IN ('cci_purchased', 'cci_circle_purchased', 'cci_bundle_purchased'))::BIGINT AS total_cci_purchased,
    (SELECT COUNT(*) FROM capacity_logs WHERE deleted_at IS NULL AND is_demo = FALSE)::BIGINT AS total_signals,
    (SELECT COUNT(DISTINCT user_id) FROM capacity_logs WHERE occurred_at >= CURRENT_DATE AND deleted_at IS NULL AND is_demo = FALSE)::BIGINT AS total_active_today,
    (SELECT COUNT(DISTINCT user_id) FROM capacity_logs WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days' AND deleted_at IS NULL AND is_demo = FALSE)::BIGINT AS total_active_7d,
    (SELECT COUNT(DISTINCT user_id) FROM capacity_logs WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days' AND deleted_at IS NULL AND is_demo = FALSE)::BIGINT AS total_active_30d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION admin_get_summary_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_summary_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_summary_stats() TO service_role;
