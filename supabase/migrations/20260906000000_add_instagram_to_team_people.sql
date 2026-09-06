-- =============================================================================
-- ADD instagram_url TO team_people
-- =============================================================================
-- RUN THIS IN THE SUPABASE DASHBOARD SQL EDITOR:
-- https://supabase.com/dashboard/project/lfglegapqrsaxfypkrwd/sql/new
--
-- Adds an optional Instagram profile URL to each team member.
-- Existing rows remain valid; new column defaults to NULL.

ALTER TABLE public.team_people
  ADD COLUMN IF NOT EXISTS instagram_url text;

-- Optional length guard (defense in depth)
ALTER TABLE public.team_people
  ADD CONSTRAINT IF NOT EXISTS team_people_instagram_url_len
  CHECK (instagram_url IS NULL OR length(instagram_url) <= 200) NOT VALID;

-- Re-grant so PostgREST picks up the new column immediately
NOTIFY pgrst, 'reload schema';
