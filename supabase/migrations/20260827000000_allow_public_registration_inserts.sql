/*
 * Fix public registration / event-request submissions.
 *
 * The Creator Mode hardening migration (20260826191103) documented a permissive
 * INSERT policy for anonymous visitors but never created it. When the "admin"
 * Supabase client resolves to the publishable (anon) key instead of a true
 * service-role key, RLS is enforced and inserts into event_registrations /
 * event_requests fail with:
 *   "new row violates row-level security policy for table ..."
 *
 * This migration adds the missing INSERT policies so public submissions work
 * regardless of which key the server client uses. SELECT/UPDATE/DELETE remain
 * restricted to service_role only (defense-in-depth); the server functions
 * still validate every submission before writing.
 */

-- event_registrations: allow anon + authenticated to INSERT (public registration).
DROP POLICY IF EXISTS "Anyone can register" ON public.event_registrations;
CREATE POLICY "Anyone can register"
  ON public.event_registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- event_requests: allow anon + authenticated to INSERT (Request an Event form).
DROP POLICY IF EXISTS "Anyone can request an event" ON public.event_requests;
CREATE POLICY "Anyone can request an event"
  ON public.event_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
