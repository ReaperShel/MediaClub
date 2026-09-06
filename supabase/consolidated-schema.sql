-- =============================================================================
-- CONSOLIDATED SCHEMA — kindness-keeper
-- =============================================================================
-- Source of truth: supabase/migrations/ in this repository.
--
-- The original migrations contain duplicate CREATE statements (the schema was
-- re-generated several times) and cannot be applied as-is to a fresh project.
-- This file is the de-duplicated, idempotent equivalent: every statement uses
-- IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS so it is safe to run
-- on a brand-new project.
--
-- Target project:  lfglegapqrsaxfypkrwd
-- Run this in the new project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.club_event_status AS ENUM (
    'upcoming', 'registration_open', 'registration_closed', 'completed', 'cancelled', 'removed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.event_request_ref_seq;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.event_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT 'MC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.event_request_ref_seq')::text, 3, '0'),
  requester_name text NOT NULL,
  email text NOT NULL,
  phone text,
  requester_type text NOT NULL,
  organization text,
  event_name text NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue text NOT NULL,
  expected_attendees integer,
  requested_services text[] NOT NULL DEFAULT '{}',
  other_service text,
  event_description text NOT NULL,
  additional_requirements text,
  status public.request_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  additional_info text,
  poster_url text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue text NOT NULL,
  max_participants integer NOT NULL DEFAULT 50 CHECK (max_participants >= 0),
  registration_deadline date,
  status public.club_event_status NOT NULL DEFAULT 'registration_open',
  form_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  college_id text,
  email text NOT NULL DEFAULT '',
  phone text,
  department text,
  year_of_study text,
  additional_info text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_version integer NOT NULL DEFAULT 1,
  form_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS public.creator_auth_attempts (
  id text PRIMARY KEY,
  fail_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('lead', 'member')),
  name text NOT NULL,
  role text NOT NULL,
  team text NOT NULL DEFAULT 'Other',
  rank text NOT NULL DEFAULT 'member' CHECK (rank IN ('president', 'vice-president', 'lead', 'member')),
  lead_id uuid REFERENCES public.team_people(id) ON DELETE SET NULL,
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  drive_folder_id text,
  drive_photo_file_id text,
  drive_photo_name text,
  drive_photo_mime text,
  instagram_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. FUNCTIONS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.force_pending_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status = 'pending';
  NEW.rejection_reason = NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_event_seat_counts()
RETURNS TABLE (event_id uuid, registered integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, COALESCE(COUNT(r.id), 0)::integer
  FROM public.club_events e
  LEFT JOIN public.event_registrations r ON r.event_id = e.id
  GROUP BY e.id
$$;

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

DROP TRIGGER IF EXISTS event_requests_touch_updated_at ON public.event_requests;
CREATE TRIGGER event_requests_touch_updated_at
  BEFORE UPDATE ON public.event_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS event_requests_force_pending ON public.event_requests;
CREATE TRIGGER event_requests_force_pending
  BEFORE INSERT ON public.event_requests
  FOR EACH ROW EXECUTE FUNCTION public.force_pending_on_insert();

DROP TRIGGER IF EXISTS club_events_touch_updated_at ON public.club_events;
CREATE TRIGGER club_events_touch_updated_at
  BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS team_people_touch_updated_at ON public.team_people;
CREATE TRIGGER team_people_touch_updated_at
  BEFORE UPDATE ON public.team_people
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_people ENABLE ROW LEVEL SECURITY;

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- event_requests
DROP POLICY IF EXISTS "Admins can read requests" ON public.event_requests;
CREATE POLICY "Admins can read requests" ON public.event_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update requests" ON public.event_requests;
CREATE POLICY "Admins can update requests" ON public.event_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can request an event" ON public.event_requests;
CREATE POLICY "Anyone can request an event" ON public.event_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- club_events
DROP POLICY IF EXISTS "Anyone can read club events" ON public.club_events;
DROP POLICY IF EXISTS "Anyone can read active club events" ON public.club_events;
CREATE POLICY "Anyone can read active club events" ON public.club_events
  FOR SELECT TO anon, authenticated USING (status NOT IN ('cancelled', 'removed'));

DROP POLICY IF EXISTS "Admins can insert club events" ON public.club_events;
CREATE POLICY "Admins can insert club events" ON public.club_events
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update club events" ON public.club_events;
CREATE POLICY "Admins can update club events" ON public.club_events
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete club events" ON public.club_events;
CREATE POLICY "Admins can delete club events" ON public.club_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- event_registrations
DROP POLICY IF EXISTS "Admins can read registrations" ON public.event_registrations;
CREATE POLICY "Admins can read registrations" ON public.event_registrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete registrations" ON public.event_registrations;
CREATE POLICY "Admins can delete registrations" ON public.event_registrations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can register" ON public.event_registrations;
CREATE POLICY "Anyone can register" ON public.event_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- team_people
DROP POLICY IF EXISTS "Anyone can read published team people" ON public.team_people;
CREATE POLICY "Anyone can read published team people" ON public.team_people
  FOR SELECT TO anon, authenticated USING (published = true);

-- creator_auth_attempts: no policies (service_role only).

-- -----------------------------------------------------------------------------
-- 6. GRANTS  (table-level privileges)
-- -----------------------------------------------------------------------------

-- user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- event_requests
GRANT SELECT, UPDATE ON public.event_requests TO authenticated;
GRANT ALL ON public.event_requests TO service_role;
-- Creator Mode hardening: direct anon/authenticated access to registrations and
-- requests is restricted to service_role; the RLS policies above are the
-- authorization layer. Revoke the broad grants so only service_role (used by
-- the creator server functions) can read/delete/update directly.
REVOKE SELECT, UPDATE, DELETE ON public.event_requests FROM authenticated;
REVOKE ALL ON public.event_requests FROM anon;

-- club_events
GRANT SELECT ON public.club_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;

-- event_registrations
GRANT SELECT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
REVOKE SELECT, DELETE ON public.event_registrations FROM authenticated;
REVOKE ALL ON public.event_registrations FROM anon;

-- creator_auth_attempts
GRANT ALL ON public.creator_auth_attempts TO service_role;
REVOKE ALL ON public.creator_auth_attempts FROM anon, authenticated;

-- team_people
GRANT SELECT ON public.team_people TO anon, authenticated;
GRANT ALL ON public.team_people TO service_role;

-- functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.club_event_seat_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.club_event_seat_counts() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. TEXT LENGTH CONSTRAINTS  (defense in depth)
-- -----------------------------------------------------------------------------

-- event_requests
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_requester_name_len CHECK (length(requester_name) <= 120) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_email_len CHECK (length(email) <= 255) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_phone_len CHECK (phone IS NULL OR length(phone) <= 30) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_event_name_len CHECK (length(event_name) <= 160) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_venue_len CHECK (length(venue) <= 200) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_other_service_len CHECK (other_service IS NULL OR length(other_service) <= 200) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_event_description_len CHECK (length(event_description) <= 4000) NOT VALID;
ALTER TABLE public.event_requests ADD CONSTRAINT event_requests_additional_requirements_len CHECK (additional_requirements IS NULL OR length(additional_requirements) <= 2000) NOT VALID;

-- event_registrations
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_full_name_len CHECK (length(full_name) <= 120) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_email_len CHECK (length(email) <= 255) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_phone_len CHECK (phone IS NULL OR length(phone) <= 30) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_college_id_len CHECK (college_id IS NULL OR length(college_id) <= 120) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_department_len CHECK (department IS NULL OR length(department) <= 120) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_year_of_study_len CHECK (year_of_study IS NULL OR length(year_of_study) <= 30) NOT VALID;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_additional_info_len CHECK (additional_info IS NULL OR length(additional_info) <= 1000) NOT VALID;

-- club_events
ALTER TABLE public.club_events ADD CONSTRAINT club_events_title_len CHECK (length(title) <= 160) NOT VALID;
ALTER TABLE public.club_events ADD CONSTRAINT club_events_description_len CHECK (length(description) <= 4000) NOT VALID;
ALTER TABLE public.club_events ADD CONSTRAINT club_events_short_description_len CHECK (length(short_description) <= 300) NOT VALID;
ALTER TABLE public.club_events ADD CONSTRAINT club_events_additional_info_len CHECK (additional_info IS NULL OR length(additional_info) <= 2000) NOT VALID;
ALTER TABLE public.club_events ADD CONSTRAINT club_events_venue_len CHECK (length(venue) <= 200) NOT VALID;

-- team_people
ALTER TABLE public.team_people ADD CONSTRAINT team_people_name_len CHECK (length(name) <= 120) NOT VALID;
ALTER TABLE public.team_people ADD CONSTRAINT team_people_role_len CHECK (length(role) <= 120) NOT VALID;
ALTER TABLE public.team_people ADD CONSTRAINT team_people_team_len CHECK (length(team) <= 80) NOT VALID;
ALTER TABLE public.team_people ADD CONSTRAINT team_people_bio_len CHECK (length(bio) <= 2000) NOT VALID;

-- -----------------------------------------------------------------------------
-- 8. INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS team_people_lead_idx ON public.team_people (lead_id);

-- -----------------------------------------------------------------------------
-- 8. SEED DATA  (idempotent)
-- -----------------------------------------------------------------------------

INSERT INTO public.team_people (kind, name, role, team, rank, bio, display_order, published)
SELECT * FROM (VALUES
  ('lead','Aarav Menon','President','Leadership','president','Leads the club''s direction, the archive programme and its editorial standards.',0,true),
  ('lead','Riya Iyer','Vice President','Leadership','vice-president','Coordinates event coverage, scheduling and the club''s collaborations across campus.',1,true),
  ('lead','Sahil Kulkarni','Videography Lead','Videography','lead','Runs the film division: shoots, edits and the club''s short-form output.',2,true),
  ('lead','Tara Fernandes','Photography Lead','Photography','lead','Oversees stills coverage, the darkroom and the photographic archive.',3,true),
  ('lead','Neel Bhatia','Tech Lead','Tech','lead','Maintains the kit room, the archive infrastructure and this website.',4,true)
) AS v(kind, name, role, team, rank, bio, display_order, published)
WHERE NOT EXISTS (SELECT 1 FROM public.team_people);

INSERT INTO public.team_people (kind, name, role, team, rank, lead_id, bio, skills, display_order, published)
SELECT 'member', v.name, v.role, v.team, 'member',
       (SELECT id FROM public.team_people l WHERE l.kind = 'lead' AND l.team = v.team LIMIT 1),
       v.bio, v.skills, v.display_order, true
FROM (VALUES
  ('Ishan Verma','Camera Operator','Videography','Handles multi-camera event coverage and gimbal work.',ARRAY['Camera','Gimbal','Lighting'],0),
  ('Meera Nair','Editor','Videography','Cuts the club''s aftermovies and short-form reels.',ARRAY['Premiere','Color','Sound'],1),
  ('Kabir Shah','Sound','Videography','Location sound and post mixing for interviews and shorts.',ARRAY['Boom','Mixing','Foley'],2),
  ('Ananya Rao','Event Photographer','Photography','Covers festivals, sports and ceremonies for the archive.',ARRAY['Events','Flash','Portrait'],0),
  ('Dev Sharma','Photojournalist','Photography','Documentary work around campus life and student stories.',ARRAY['Reportage','Street','B&W'],1),
  ('Leila Farooq','Darkroom & Archive','Photography','Film processing, scanning and archival cataloguing.',ARRAY['Film','Scanning','Cataloguing'],2),
  ('Rohan Gupta','Web Engineer','Tech','Builds and maintains the public archive site.',ARRAY['React','TypeScript','Databases'],0),
  ('Sara Qureshi','Kit Room Manager','Tech','Runs equipment bookings, maintenance and inventory.',ARRAY['Logistics','Maintenance'],1)
) AS v(name, role, team, bio, skills, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.team_people WHERE kind = 'member');
