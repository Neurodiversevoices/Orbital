ALTER TABLE capacity_logs ADD COLUMN IF NOT EXISTS confidence_flags JSONB DEFAULT '{}';
