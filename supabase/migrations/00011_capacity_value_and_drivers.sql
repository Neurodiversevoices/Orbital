-- Add capacity_value and driver_data columns to capacity_logs
-- These are additive, nullable columns. No migration risk.

ALTER TABLE capacity_logs ADD COLUMN IF NOT EXISTS capacity_value FLOAT;
ALTER TABLE capacity_logs ADD COLUMN IF NOT EXISTS driver_data JSONB DEFAULT '{}';
