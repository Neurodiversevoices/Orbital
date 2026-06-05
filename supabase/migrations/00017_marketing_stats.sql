-- =============================================================================
-- 00017_marketing_stats.sql
--
-- Surfaces landing-page and waitlist marketing metrics to the admin dashboard.
--
-- Background: page_events (landing-page visits) and waitlist_signups (email
-- capture) are insert-only for anon and readable only by service_role. Nothing
-- in the admin dashboard exposed their counts, so visit/email totals could only
-- be retrieved by hand via the SQL editor. These functions make them available
-- through the existing admin-analytics API (service_role, gated by admin email).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ADMIN: Marketing summary (landing views + waitlist emails, with recency)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_get_marketing_stats()
RETURNS TABLE (
  total_landing_views   BIGINT,
  total_waitlist_emails BIGINT,
  views_last_7d         BIGINT,
  views_last_30d        BIGINT,
  emails_last_7d        BIGINT,
  emails_last_30d       BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM page_events
       WHERE event = 'page_view')::BIGINT AS total_landing_views,
    (SELECT COUNT(*) FROM waitlist_signups)::BIGINT AS total_waitlist_emails,
    (SELECT COUNT(*) FROM page_events
       WHERE event = 'page_view'
         AND created_at >= NOW() - INTERVAL '7 days')::BIGINT AS views_last_7d,
    (SELECT COUNT(*) FROM page_events
       WHERE event = 'page_view'
         AND created_at >= NOW() - INTERVAL '30 days')::BIGINT AS views_last_30d,
    (SELECT COUNT(*) FROM waitlist_signups
       WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT AS emails_last_7d,
    (SELECT COUNT(*) FROM waitlist_signups
       WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT AS emails_last_30d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION admin_get_marketing_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_marketing_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_marketing_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- ADMIN: Landing-page views grouped by attribution source (utm_source)
-- Answers "how many visits came from TikTok / each channel".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_get_traffic_by_source()
RETURNS TABLE (
  source TEXT,
  views  BIGINT
) AS $$
  SELECT
    COALESCE(NULLIF(TRIM(utm_source), ''), 'direct/none') AS source,
    COUNT(*)::BIGINT AS views
  FROM page_events
  WHERE event = 'page_view'
  GROUP BY 1
  ORDER BY views DESC;
$$ LANGUAGE sql SECURITY DEFINER;

REVOKE ALL ON FUNCTION admin_get_traffic_by_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_traffic_by_source() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_get_traffic_by_source() TO service_role;
