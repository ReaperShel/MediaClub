-- =============================================================================
-- FEATURED CONTENT — Editor's Pick / Featured Story
-- =============================================================================
-- Singleton table: at most one row exists, identified by a fixed id 'current'.
-- Writes upsert that single row, so the app cannot accidentally create
-- multiple active featured stories.
--
-- RLS:
--  - Public (anon + authenticated) may SELECT the active featured content.
--  - No INSERT / UPDATE / DELETE policies are granted to anon/authenticated;
--    mutations happen exclusively through server functions that run with
--    service_role (bypassing RLS) and enforce requireCreator().

CREATE TABLE IF NOT EXISTS public.featured_content (
  id text PRIMARY KEY DEFAULT 'current' CHECK (id = 'current'),
  content_type text NOT NULL
    CHECK (content_type IN ('photos', 'highlights', 'videos', 'news')),
  content_id text NOT NULL,
  custom_title text,
  custom_excerpt text,
  image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read featured content" ON public.featured_content;
CREATE POLICY "Public can read featured content"
  ON public.featured_content
  FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.featured_content TO anon, authenticated;
GRANT ALL ON public.featured_content TO service_role;
