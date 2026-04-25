-- Add orb_tuning column to user_profiles for avatar selection (Build 105)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_profiles'
      AND column_name  = 'orb_tuning'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN orb_tuning TEXT
      CHECK (orb_tuning IN ('aurora','dusk','storm','tide','quartz','ember','mist','glow'));
  END IF;
END $$;
