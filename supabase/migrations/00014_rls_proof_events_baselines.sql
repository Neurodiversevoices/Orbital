-- =============================================================================
-- Additional RLS policies for proof_events and capacity_baselines
-- =============================================================================

-- proof_events: add DELETE policy (SELECT/INSERT/UPDATE already exist in 00012)
CREATE POLICY "Users can delete own proof events"
  ON proof_events FOR DELETE
  USING (auth.uid() = user_id);
