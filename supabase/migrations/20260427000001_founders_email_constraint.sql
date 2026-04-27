-- Add plain UNIQUE constraint on founders.email
-- Needed for supabase-js upsert({ onConflict: 'email' }) to work
-- All emails are normalized to lowercase before insert, so plain UNIQUE is safe
ALTER TABLE founders DROP CONSTRAINT IF EXISTS founders_email_unique_plain;
ALTER TABLE founders ADD CONSTRAINT founders_email_unique_plain UNIQUE (email);
