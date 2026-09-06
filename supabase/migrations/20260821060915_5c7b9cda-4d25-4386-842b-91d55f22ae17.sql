ALTER TABLE public.club_events
  ADD COLUMN IF NOT EXISTS form_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS form_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS form_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS form_snapshot jsonb;

ALTER TABLE public.event_registrations
  ALTER COLUMN college_id DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN department DROP NOT NULL,
  ALTER COLUMN year_of_study DROP NOT NULL,
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN email SET DEFAULT '';