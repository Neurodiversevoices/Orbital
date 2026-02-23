-- =============================================================================
-- Migration 00010: Waitlist signups, sponsor codes, and page event tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. waitlist_signups — email capture from landing page
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hero',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waitlist_signups_email_unique UNIQUE (email)
);

CREATE INDEX idx_waitlist_signups_created ON waitlist_signups(created_at DESC);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- No reads from client. Insert-only via anon key.
CREATE POLICY "Anon can insert waitlist signups"
  ON waitlist_signups FOR INSERT
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for anon or authenticated
-- Only service_role can read (admin dashboard, email sends)

-- ---------------------------------------------------------------------------
-- 2. sponsor_codes — promo/founding/podcast codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  entitlement_id TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sponsor_codes_code_unique UNIQUE (code)
);

CREATE INDEX idx_sponsor_codes_code ON sponsor_codes(code);

ALTER TABLE sponsor_codes ENABLE ROW LEVEL SECURITY;

-- No client access at all. Only service_role via API routes.

-- ---------------------------------------------------------------------------
-- 3. page_events — lightweight analytics (no PostHog dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_events_event ON page_events(event);
CREATE INDEX idx_page_events_created ON page_events(created_at DESC);

ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- Insert-only from anon (landing page JS)
CREATE POLICY "Anon can insert page events"
  ON page_events FOR INSERT
  WITH CHECK (true);
