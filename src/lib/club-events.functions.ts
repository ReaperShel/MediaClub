import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clubEventSchema, eventRegistrationSchema } from "./club-events.schema";
import { formatDate } from "./format";
import type {
  ClubEventRecord,
  EventRegistrationRecord,
  PublicClubEvent,
} from "./club-events.schema";
import { checkRateLimit } from "./rate-limit";
import { getRequest } from "@tanstack/react-start/server";

const idSchema = z.object({ id: z.string().uuid() }).strict();

const toRow = (data: z.infer<typeof clubEventSchema>) => ({
  title: data.title,
  description: data.description || "",
  short_description: data.shortDescription || "",
  additional_info: data.additionalInfo || null,
  poster_url: data.posterUrl || null,
  event_date: data.eventDate,
  start_time: data.startTime || null,
  end_time: data.endTime || null,
  venue: data.venue,
  max_participants: data.maxParticipants,
  registration_deadline: data.registrationDeadline || null,
  status: data.status,
  ...(data.formConfig
    ? { form_config: data.formConfig, form_version: data.formConfig.version }
    : {}),
});

const isDeadlinePassed = (deadline: string | null) => {
  if (!deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return deadline < today;
};

/** Public: club-run events people can register for, with live seat counts. */
export const listPublicClubEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase URL or Publishable key not configured.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: rows, error }, { data: counts }] = await Promise.all([
    client
      .from("club_events")
      .select("*")
      .not("status", "in", '("cancelled","removed")')
      .order("event_date", { ascending: true }),
    client.rpc("club_event_seat_counts"),
  ]);

  if (error) throw new Error(error.message);

  const countMap = new Map<string, number>(
    ((counts ?? []) as { event_id: string; registered: number }[]).map((c) => [
      c.event_id,
      c.registered,
    ])
  );

  return ((rows ?? []) as unknown as ClubEventRecord[]).map((row): PublicClubEvent => {
    const registered = countMap.get(row.id) ?? 0;
    const seatsLeft = Math.max(row.max_participants - registered, 0);
    return {
      ...row,
      registered,
      seatsLeft,
      isOpen:
        row.status === "registration_open" &&
        seatsLeft > 0 &&
        !isDeadlinePassed(row.registration_deadline),
    };
  });
});

/** Public: register for a club event using the event's configured form. */
export const registerForClubEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => eventRegistrationSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const rate = checkRateLimit(request, undefined, {
      windowMs: 60_000,
      max: 8,
    });
    if (!rate.ok) {
      throw new Error(
        `Too many registration attempts. Please wait ${Math.ceil(rate.retryAfterMs / 1000)} seconds.`
      );
    }

    const { normalizeFormConfig, validateSubmission } = await import("./registration-form");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: event, error: eventError } = await supabaseAdmin
      .from("club_events")
      .select("id, status, max_participants, registration_deadline, form_config, form_version")
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("This event is no longer available.");
    const ev = event as unknown as {
      status: string;
      max_participants: number;
      registration_deadline: string | null;
      form_config: unknown;
      form_version: number;
    };
    if (ev.status !== "registration_open")
      throw new Error("Registration for this event is closed.");
    if (isDeadlinePassed(ev.registration_deadline))
      throw new Error("The registration deadline for this event has passed.");

    const { count, error: countError } = await supabaseAdmin
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.eventId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= ev.max_participants) throw new Error("This event is full.");

    // Authoritative server-side validation against the event's own form.
    const config = normalizeFormConfig(ev.form_config);
    const result = validateSubmission(config, data.values);
    if (!result.ok) {
      const first = Object.values(result.errors)[0] ?? "Please check the form.";
      throw new Error(first);
    }

    const { error } = await supabaseAdmin.from("event_registrations").insert({
      event_id: data.eventId,
      full_name: result.standard["full_name"] ?? "",
      college_id: result.standard["college_id"] ?? null,
      email: result.standard["email"] ?? "",
      phone: result.standard["phone"] ?? null,
      department: result.standard["department"] ?? null,
      year_of_study: result.standard["year_of_study"] ?? null,
      additional_info: config.allowAdditionalInfo ? data.additionalInfo || null : null,
      responses: result.custom,
      form_version: ev.form_version ?? config.version,
      form_snapshot: config,
    } as never);

    if (error) {
      if (error.code === "23505" || /duplicate key/i.test(error.message))
        throw new Error("This email address is already registered for this event.");
      throw new Error(error.message);
    }

    return { ok: true };
  });

async function assertAdmin(context: {
  supabase: {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (
          column: string,
          value: string
        ) => {
          eq: (
            column: string,
            value: string
          ) => {
            maybeSingle: () => Promise<{
              data: { role: string } | null;
              error: Error | null;
            }>;
          };
        };
      };
    };
  };
  userId: string;
}) {
  const result = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  const { data, error } = result;
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: administrator access required");
}

/** Admin-only: every club event, including cancelled ones, with registration counts. */
export const listAdminClubEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("club_events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: counts } = await context.supabase.rpc("club_event_seat_counts");
    const countMap = new Map<string, number>(
      ((counts ?? []) as { event_id: string; registered: number }[]).map((c) => [
        c.event_id,
        c.registered,
      ])
    );

    return ((data ?? []) as unknown as ClubEventRecord[]).map((row) => ({
      ...row,
      registered: countMap.get(row.id) ?? 0,
    }));
  });

/** Admin-only: create or update a club event. */
export const saveClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => clubEventSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const row = toRow(data);
    if (data.id) {
      const { error } = await context.supabase
        .from("club_events")
        .update(row as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("club_events")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as { id: string }).id };
  });

/** Admin-only: delete a club event and its registrations. */
export const deleteClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase.from("club_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin-only: participants registered for one event. */
export const listEventRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: rows, error } = await context.supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as EventRegistrationRecord[];
  });

/** Admin-only: remove one participant registration. */
export const deleteEventRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase.from("event_registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------------------- */
/* Creator Mode — fully decoupled from Lovable OAuth.                          */
/* Every function below calls requireCreator() (password-session gate in      */
/* creator.server.ts) before touching the database.                            */
/* --------------------------------------------------------------------------- */

/**
 * Creator-only: every club event, including cancelled/removed, with registration
 * counts. Uses the service-role client (bypasses RLS); authorization is enforced
 * by requireCreator().
 */
export const creatorListClubEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<(ClubEventRecord & { registered: number })[]> => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("club_events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: counts } = await supabaseAdmin.rpc("club_event_seat_counts");
    const countMap = new Map<string, number>(
      ((counts ?? []) as { event_id: string; registered: number }[]).map((c) => [
        c.event_id,
        c.registered,
      ])
    );

    return ((data ?? []) as unknown as ClubEventRecord[]).map((row) => ({
      ...row,
      registered: countMap.get(row.id) ?? 0,
    }));
  }
);

/**
 * Creator-only: create or update a club event.
 *
 * Form versioning: when the form config changes relative to the stored version,
 * the server increments form_version so existing registrations keep their
 * original form_snapshot and form_version intact.
 */
export const creatorSaveClubEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => clubEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeFormConfig, configsEqual, defaultFormConfig } =
      await import("./registration-form");

    const row = toRow(data);

    if (data.id) {
      // Update existing event — version the form if it changed.
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("club_events")
        .select("form_config, form_version")
        .eq("id", data.id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);

      const storedConfig = normalizeFormConfig(existing?.form_config ?? null);
      const newConfig = data.formConfig ?? storedConfig;

      if (!configsEqual(storedConfig, newConfig)) {
        row.form_config = newConfig;
        row.form_version = (existing?.form_version ?? 1) + 1;
      }

      const { error } = await supabaseAdmin
        .from("club_events")
        .update(row as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    // Create new event — ensure a default form config exists.
    const newConfig = data.formConfig ?? defaultFormConfig();
    const insertRow = {
      ...row,
      form_config: newConfig,
      form_version: newConfig.version,
    };
    const { data: created, error } = await supabaseAdmin
      .from("club_events")
      .insert(insertRow as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as { id: string }).id };
  });

/** Creator-only: soft-remove a club event so historical registrations remain intact. */
export const creatorDeleteClubEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("club_events")
      .update({ status: "removed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const registrationsQuerySchema = z
  .object({
    eventId: z.string().uuid(),
    term: z.string().max(200).optional(),
    limit: z.number().int().min(1).max(500).default(500),
    offset: z.number().int().min(0).default(0),
  })
  .strict();

/** Creator-only: full registration records for one event, with search. */
export const creatorListEventRegistrations = createServerFn({ method: "GET" })
  .validator((data: unknown) => registrationsQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("event_registrations")
      .select("*", { count: "exact" })
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });

    if (data.term) {
      const pattern = `%${data.term}%`;
      q = q.or(
        `full_name.ilike.${pattern},email.ilike.${pattern},college_id.ilike.${pattern},phone.ilike.${pattern}`
      );
    }

    const { data: rows, error, count } = await q.range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    return {
      registrations: (rows ?? []) as unknown as EventRegistrationRecord[],
      total: count ?? 0,
    };
  });

/** Creator-only: remove one participant registration. */
export const creatorDeleteEventRegistration = createServerFn({ method: "POST" })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("event_registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const csvExportSchema = z
  .object({
    eventId: z.string().uuid(),
  })
  .strict();

/**
 * Creator-only: export registrations as CSV.
 *
 * Column order is: standard fields first, then custom fields drawn from the
 * event's form config. Each registration's `responses` JSON is unwrapped into
 * the matching columns. Custom-field ordering follows the form builder.
 */
export const creatorExportRegistrationsCsv = createServerFn({ method: "GET" })
  .validator((data: unknown) => csvExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    const {
      normalizeFormConfig,
      visibleFields,
      fieldLabel,
      STANDARD_FIELD_COLUMNS,
      STANDARD_FIELD_IDS,
      STANDARD_FIELD_LABELS,
    } = await import("./registration-form");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { toCsv } = await import("./creator.server");

    const { data: event, error: evErr } = await supabaseAdmin
      .from("club_events")
      .select("form_config")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);

    const config = normalizeFormConfig(event?.form_config ?? null);
    const fields = visibleFields(config);

    // Build the column header list: standard columns + custom field labels.
    const standardCols: { label: string; key: string }[] = [];
    for (const f of fields) {
      if (f.kind === "standard") {
        standardCols.push({
          label: fieldLabel(f),
          key: STANDARD_FIELD_COLUMNS[f.id],
        });
      }
    }
    // Always include the standard audit columns after the mapped ones.
    for (const id of STANDARD_FIELD_IDS) {
      const mapped = standardCols.find((c) => c.key === STANDARD_FIELD_COLUMNS[id]);
      if (!mapped)
        standardCols.push({
          label: STANDARD_FIELD_LABELS[id],
          key: STANDARD_FIELD_COLUMNS[id],
        });
    }
    const customCols: { label: string; key: string }[] = [];
    for (const f of fields) {
      if (f.kind === "custom") customCols.push({ label: f.label, key: f.id });
    }

    const headers = [
      ...standardCols.map((c) => c.label),
      "Additional info",
      "Registered",
      ...customCols.map((c) => c.label),
    ];

    const { data: rows, error } = await supabaseAdmin
      .from("event_registrations")
      .select(
        "full_name,college_id,email,phone,department,year_of_study,additional_info,created_at,responses"
      )
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const records = (rows ?? []) as unknown as Array<{
      full_name: string;
      college_id: string | null;
      email: string;
      phone: string | null;
      department: string | null;
      year_of_study: string | null;
      additional_info: string | null;
      created_at: string;
      responses: Record<string, string> | null;
    }>;

    const csvRows: Record<string, string>[] = [];
    for (const r of records) {
      const row: Record<string, string> = {};
      for (const c of standardCols) {
        row[c.label] = (r[c.key as keyof typeof r] as string | null) ?? "";
      }
      row["Additional info"] = r.additional_info ?? "";
      row["Registered"] = formatDate(r.created_at);
      for (const c of customCols) {
        row[c.label] = (r.responses?.[c.key] ?? "") as string;
      }
      csvRows.push(row);
    }

    const csv = toCsv(csvRows, headers);
    return { csv, filename: `registrations.csv` };
  });
