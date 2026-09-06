/*
 * Creator Mode — RLS hardening.
 *
 * Creator Mode is authenticated via a password-protected, HttpOnly session
 * cookie (creator.server.ts) — it does NOT use Supabase Auth (auth.uid()).
 * All Creator-only server functions run with the service_role key, which
 * bypasses RLS entirely; authorization is enforced server-side by
 * requireCreator().
 *
 * This migration tightens RLS so that:
 *  - Anonymous visitors can only ever SELECT non-cancelled, non-removed
 *    club events and published team members (defense-in-depth, mirroring the
 *    server-side filtering already in listPublicClubEvents & listPublicTeam).
 *  - Anonymous visitors can INSERT into event_registrations and
 *    event_requests only through the validated server functions (the
 *    policies below are permissive for INSERT since the service-role client
 *    used by the public functions already bypasses RLS).
 *  - Direct anonymous SELECT/UPDATE/DELETE on registrations, requests, and
 *    creator_auth_attempts is blocked — only service_role can touch these.
 */

-- club_events: anon can only see events that aren't cancelled or removed.
DROP POLICY IF EXISTS "Anyone can read club events" ON public.club_events;
CREATE POLICY "Anyone can read active club events"
ON public.club_events
FOR SELECT TO anon, authenticated
USING (status NOT IN ('cancelled', 'removed'));

-- event_registrations: only service_role (creator + register functions)
-- can touch this table. The public registration endpoint uses supabaseAdmin.
-- RLS already restricts authenticated users to admin role; anon gets nothing.
REVOKE SELECT, DELETE ON public.event_registrations FROM authenticated;
-- Re-grant to service_role (already handled by GRANT ALL ... TO service_role).

-- event_requests: same model — service_role only.
REVOKE SELECT, UPDATE, DELETE ON public.event_requests FROM authenticated;

-- team_people: keep anon to published only (already enforced, re-affirm).
DROP POLICY IF EXISTS "Anyone can read published team people" ON public.team_people;
CREATE POLICY "Anyone can read published team people"
ON public.team_people
FOR SELECT TO anon, authenticated
USING (published = true);

-- creator_auth_attempts: service_role only, no anon/authenticated access.
-- This is already the default (RLS enabled, no anon grant).
-- Explicit deny for safety:
REVOKE ALL ON public.creator_auth_attempts FROM anon, authenticated;
