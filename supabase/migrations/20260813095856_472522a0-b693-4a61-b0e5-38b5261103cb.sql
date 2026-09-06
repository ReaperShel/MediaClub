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