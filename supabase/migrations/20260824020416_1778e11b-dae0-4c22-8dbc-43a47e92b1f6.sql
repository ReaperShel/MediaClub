CREATE TABLE public.team_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('lead','member')),
  name text NOT NULL,
  role text NOT NULL,
  team text NOT NULL DEFAULT 'Other',
  rank text NOT NULL DEFAULT 'member' CHECK (rank IN ('president','vice-president','lead','member')),
  lead_id uuid REFERENCES public.team_people(id) ON DELETE SET NULL,
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  drive_folder_id text,
  drive_photo_file_id text,
  drive_photo_name text,
  drive_photo_mime text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_people TO anon;
GRANT SELECT ON public.team_people TO authenticated;
GRANT ALL ON public.team_people TO service_role;

ALTER TABLE public.team_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published team people"
ON public.team_people FOR SELECT TO anon, authenticated
USING (published);

CREATE TRIGGER team_people_touch_updated_at
BEFORE UPDATE ON public.team_people
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX team_people_lead_idx ON public.team_people (lead_id);

INSERT INTO public.team_people (kind, name, role, team, rank, bio, display_order, published) VALUES
  ('lead','Aarav Menon','President','Leadership','president','Leads the club''s direction, the archive programme and its editorial standards.',0,true),
  ('lead','Riya Iyer','Vice President','Leadership','vice-president','Coordinates event coverage, scheduling and the club''s collaborations across campus.',1,true),
  ('lead','Sahil Kulkarni','Videography Lead','Videography','lead','Runs the film division: shoots, edits and the club''s short-form output.',2,true),
  ('lead','Tara Fernandes','Photography Lead','Photography','lead','Oversees stills coverage, the darkroom and the photographic archive.',3,true),
  ('lead','Neel Bhatia','Tech Lead','Tech','lead','Maintains the kit room, the archive infrastructure and this website.',4,true);

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
) AS v(name, role, team, bio, skills, display_order);