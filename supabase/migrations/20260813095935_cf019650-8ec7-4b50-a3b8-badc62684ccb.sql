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