-- =============================================================================
-- STORAGE BUCKET — media-club-assets
-- =============================================================================
-- RUN THIS IN THE SUPABASE DASHBOARD SQL EDITOR:
-- https://supabase.com/dashboard/project/lfglegapqrsaxfypkrwd/sql/new
--
-- Creates a single public storage bucket for all creator-uploaded images.
-- Subfolders are used to separate concerns:
--   media-club-assets/featured-story/   — Editor's Pick covers
--   media-club-assets/event-posters/    — Club event posters
--
-- Security model:
--   - Bucket is PUBLIC (the homepage and event cards need to display
--     the uploaded images).
--   - Reads (SELECT on storage.objects) are open to anon + authenticated.
--   - Writes (INSERT/UPDATE/DELETE) are restricted to the service_role
--     key, which is only used by server functions that have passed
--     requireCreator(). The browser never has write access to storage —
--     it uses short-lived signed upload URLs that the server issues.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-club-assets',
  'media-club-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for the homepage Editor's Pick and event cards
DROP POLICY IF EXISTS "Public read media-club-assets" ON storage.objects;
CREATE POLICY "Public read media-club-assets"
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media-club-assets');

-- Only service_role can write/delete
-- (no INSERT/UPDATE/DELETE policy for anon or authenticated = no access)

-- Tell PostgREST/Storage to pick up the new bucket immediately
NOTIFY pgrst, 'reload schema';
