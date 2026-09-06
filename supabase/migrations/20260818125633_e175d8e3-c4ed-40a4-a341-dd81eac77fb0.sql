CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

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

-- first signup becomes admin
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

CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE SEQUENCE public.event_request_ref_seq;

CREATE TABLE public.event_requests (
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

GRANT SELECT, UPDATE ON public.event_requests TO authenticated;
GRANT ALL ON public.event_requests TO service_role;
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read requests" ON public.event_requests
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.event_requests
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

CREATE TRIGGER event_requests_touch_updated_at
BEFORE UPDATE ON public.event_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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

CREATE TRIGGER event_requests_force_pending
BEFORE INSERT ON public.event_requests
FOR EACH ROW EXECUTE FUNCTION public.force_pending_on_insert();

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TYPE public.club_event_status AS ENUM (
  'upcoming',
  'registration_open',
  'registration_closed',
  'completed',
  'cancelled'
);

CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  poster_url text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue text NOT NULL,
  max_participants integer NOT NULL DEFAULT 50 CHECK (max_participants >= 0),
  registration_deadline date,
  status public.club_event_status NOT NULL DEFAULT 'registration_open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read club events" ON public.club_events
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert club events" ON public.club_events
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update club events" ON public.club_events
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete club events" ON public.club_events
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_events_touch_updated_at
BEFORE UPDATE ON public.club_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  college_id text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  department text NOT NULL,
  year_of_study text NOT NULL,
  additional_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

GRANT SELECT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read registrations" ON public.event_registrations
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete registrations" ON public.event_registrations
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

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

REVOKE ALL ON FUNCTION public.club_event_seat_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.club_event_seat_counts() TO anon, authenticated, service_role;