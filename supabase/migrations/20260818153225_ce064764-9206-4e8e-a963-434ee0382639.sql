ALTER TYPE public.club_event_status ADD VALUE IF NOT EXISTS 'removed';

ALTER TABLE public.club_events
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_info text;

CREATE TABLE IF NOT EXISTS public.creator_auth_attempts (
  id text PRIMARY KEY,
  fail_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.creator_auth_attempts TO service_role;

ALTER TABLE public.creator_auth_attempts ENABLE ROW LEVEL SECURITY;