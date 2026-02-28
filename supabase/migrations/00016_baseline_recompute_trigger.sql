-- =============================================================================
-- Migration 00016: Baseline auto-recompute trigger
--
-- After INSERT on capacity_logs, schedules a baseline recompute if the user's
-- last baseline was computed more than 24 hours ago. This ensures baselines
-- stay fresh without recomputing on every single log.
--
-- Strategy: once-per-day-per-user maximum via a check on capacity_baselines.computed_at
-- The trigger marks a flag row in a lightweight tracking table, and the actual
-- recompute happens server-side (Edge Function or app-side cron).
--
-- For now: inserts a "stale" marker into capacity_baselines with version='pending'
-- that the app or a cron can pick up and recompute.
-- =============================================================================

-- Function: check if baseline needs recompute after capacity_log insert
CREATE OR REPLACE FUNCTION check_baseline_freshness()
RETURNS TRIGGER AS $$
DECLARE
  last_computed TIMESTAMPTZ;
  log_count_recent INT;
BEGIN
  -- Only process non-demo, non-deleted logs with capacity_value
  IF NEW.is_demo = TRUE OR NEW.deleted_at IS NOT NULL OR NEW.capacity_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find when the latest baseline was computed for this user
  SELECT computed_at INTO last_computed
  FROM capacity_baselines
  WHERE user_id = NEW.user_id
    AND version != 'pending'
  ORDER BY computed_at DESC
  LIMIT 1;

  -- If no baseline exists or last one is older than 24 hours, mark as stale
  IF last_computed IS NULL OR last_computed < (NOW() - INTERVAL '24 hours') THEN

    -- Check we don't already have a pending marker for today
    PERFORM 1
    FROM capacity_baselines
    WHERE user_id = NEW.user_id
      AND version = 'pending'
      AND computed_at > (NOW() - INTERVAL '24 hours');

    IF NOT FOUND THEN
      -- Check minimum data requirement: at least 7 unique days of logs
      SELECT COUNT(DISTINCT DATE(occurred_at)) INTO log_count_recent
      FROM capacity_logs
      WHERE user_id = NEW.user_id
        AND deleted_at IS NULL
        AND is_demo = FALSE
        AND capacity_value IS NOT NULL
        AND occurred_at > (NOW() - INTERVAL '60 days');

      IF log_count_recent >= 7 THEN
        -- Insert a pending baseline marker
        INSERT INTO capacity_baselines (
          user_id,
          data_window_start,
          data_window_end,
          log_count,
          version
        ) VALUES (
          NEW.user_id,
          NOW() - INTERVAL '60 days',
          NOW(),
          log_count_recent,
          'pending'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fires after each capacity_log insert
DROP TRIGGER IF EXISTS trg_check_baseline_freshness ON capacity_logs;
CREATE TRIGGER trg_check_baseline_freshness
  AFTER INSERT ON capacity_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_baseline_freshness();

-- Index to efficiently find pending baselines for recompute
CREATE INDEX IF NOT EXISTS idx_capacity_baselines_pending
  ON capacity_baselines (user_id, version)
  WHERE version = 'pending';
