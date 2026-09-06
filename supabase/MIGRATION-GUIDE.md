# Migration Guide: Lovable Cloud -> External Supabase

OLD project (Lovable Cloud): `qgcemdmaxfcupconpqad`
NEW project (your external): **`lfglegapqrsaxfypkrwd`**

## What changed in this codebase

### Code (no more Lovable Cloud runtime deps)

- `src/routes/auth.tsx` — Google sign-in now uses `supabase.auth.signInWithOAuth()` directly (no Lovable OAuth broker).
- `src/integrations/supabase/client.ts` — removed `brokeredPreviewStorage` (Lovable preview-only); uses plain `localStorage`. Error messages de-Lovified.
- `src/integrations/supabase/client.server.ts`, `auth-middleware.ts` — de-Lovified error messages.
- `src/routes/__root.tsx` — removed `reportLovableError`.
- Deleted: `src/integrations/lovable/index.ts` (+ empty dir), `src/lib/lovable-error-reporting.ts`, `src/integrations/supabase/cron-auth.ts`, `src/integrations/supabase/previewAuthStorage.ts`.
- `package.json` — removed `@lovable.dev/cloud-auth-js` dependency.

### Config

- `supabase/config.toml` — `project_id` = `lfglegapqrsaxfypkrwd`.
- `.env` / `.env.example` — point at `https://lfglegapqrsaxfypkrwd.supabase.co`; added `SUPABASE_SERVICE_ROLE_KEY` placeholder (server-side only).

### Repo files added

- `supabase/consolidated-schema.sql` — full idempotent schema for the NEW project.
- `supabase/data-migration-export.sql` — exports existing rows from the OLD project as INSERT statements.

The `@lovable.dev/vite-tanstack-config` build plugin was intentionally **kept**: it is a build-time wrapper around `@tanstack/react-start`, not a Lovable Cloud data route, and removing it would break the build.

---

## Step-by-step migration

### 1. Apply schema to the NEW project

Open the NEW project's SQL Editor (Supabase Dashboard -> lfglegapqrsaxfypkrwd -> SQL Editor) and run the **entire** contents of `supabase/consolidated-schema.sql`. It is idempotent (safe to re-run).

This creates: enums, tables, functions, triggers, RLS policies, grants, indexes, and seeds `team_people` with the default Media Club lineup.

### 2. Migrate existing data (optional)

Run **all** of `supabase/data-migration-export.sql` in the OLD project's SQL Editor (`qgcemdmaxfcupconpqad`). Copy the generated INSERT statements and run them in the NEW project's SQL Editor.

Tables are exported in dependency order: club_events -> event_requests -> event_registrations -> team_people (leads, then members) -> user_roles.

#### Data-migration gotchas

- **`team_people`**: the consolidated schema already seeds the default leads + members. The export will try to INSERT the same rows and fail on the PK/unique constraints. **Choose one**:
  - Keep the fresh seed -> **delete or skip the two `team_people` sections** in the export script before running it in the new project.
  - Migrate the old team -> drop the seed rows from `supabase/consolidated-schema.sql` (section 8) before step 1, then run the export as-is.
- **`user_roles`**: rows reference `auth.users` IDs that only exist in the OLD project. Unless you also migrate auth users into the new project, these roles will point at non-existent users and are useless. Usually you skip `user_roles` and let admins re-provision after sign-up (the `bootstrap_first_admin` trigger makes the first signer-up an admin).
- **`event_registrations` / `event_requests`**: reference `club_events.id`. Export club_events first so the FKs resolve.
- The export preserves original UUIDs, so relationships survive unchanged.

### 3. Put your NEW project keys into `.env`

Get them from the NEW project: Dashboard -> lfglegapqrsaxfypkrwd -> Settings -> API.

```
SUPABASE_URL=https://lfglegapqrsaxfypkrwd.supabase.co
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_... from new project>
VITE_SUPABASE_URL=https://lfglegapqrsaxfypkrwd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_... from new project>
VITE_SUPABASE_PROJECT_ID=lfglegapqrsaxfypkrwd
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... from new project>   # server-side ONLY
```

**Never** put the service-role key behind a `VITE_` prefix.

### 4. Configure external services in the NEW project

- **Google OAuth** (for `/auth` Google sign-in): Dashboard -> Authentication -> Providers -> Google. Add your OAuth client ID/secret and set the redirect URL to `https://lfglegapqrsaxfypkrwd.supabase.co/auth/v1/callback` plus your site's `/admin` route.
- **Google Drive**: unchanged — uses `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env`, which is independent of Supabase. No Lovable connector involved.

### 5. Verify

With the new keys in `.env`, restart `npm run dev` and confirm:

1. Public events load on `/events`.
2. Public registration works (submit a test registration).
3. Registration appears in the NEW project DB.
4. Creator Mode (`/events` -> Creator Mode -> password) works.
5. Creator can view / delete registrations, create/edit/remove events, edit forms.
6. Event requests work.
7. Anonymous SQL can read club_events but NOT event_registrations (verify in new project SQL Editor as role `anon`).
8. No request URL contains `qgcemdmaxfcupconpqad`.

### Old project

The OLD project (`qgcemdmaxfcupconpqad`) is left untouched. Delete or archive it yourself once you have confirmed the new project works and data is migrated.
