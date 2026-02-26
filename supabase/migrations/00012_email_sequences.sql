-- =============================================================================
-- Migration 00012: Email sequence log for post-signup drip campaign
-- =============================================================================

-- email_sequence_log tracks enrolled users and which sequence emails have been sent.
-- Enrolled on signup via api/welcome-email.
-- Processed daily by api/email-sequences (Vercel cron).

CREATE TABLE IF NOT EXISTS email_sequence_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  first_name   TEXT        NOT NULL DEFAULT '',
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emails_sent  JSONB       NOT NULL DEFAULT '{}',
  CONSTRAINT email_sequence_log_email_unique UNIQUE (email)
);

CREATE INDEX idx_email_sequence_log_enrolled ON email_sequence_log(enrolled_at);
CREATE INDEX idx_email_sequence_log_user    ON email_sequence_log(user_id);

ALTER TABLE email_sequence_log ENABLE ROW LEVEL SECURITY;

-- No client access. All reads/writes go through service_role (API routes only).
-- No INSERT/SELECT/UPDATE/DELETE policies — service_role bypasses RLS by default.
