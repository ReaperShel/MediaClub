/**
 * Creator Mode server functions.
 *
 * These are fully decoupled from Lovable OAuth/Supabase Auth. Authentication
 * is password-based (CREATOR_PASSWORD env var) and enforced server-side via
 * the encrypted session cookie in creator.server.ts. Every data function
 * calls requireCreator() before touching the database.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(1).max(256),
  })
  .strict();

export const creatorStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isUnlocked } = await import("./creator.server");
  return { unlocked: await isUnlocked() };
});

export const unlockCreator = createServerFn({ method: "POST" })
  .validator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => {
    const { unlockCreatorSession } = await import("./creator.server");
    return unlockCreatorSession(data.password);
  });

export const lockCreator = createServerFn({ method: "POST" }).handler(async () => {
  const { lockCreatorSession } = await import("./creator.server");
  return lockCreatorSession();
});

export const creatorOverviewStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    totalEvents: number;
    activeEvents: number;
    eventCounts: Record<string, number>;
    totalRegistrations: number;
    totalRequests: number;
    requestCounts: Record<string, number>;
    totalTeam: number;
    registrationsByDay: { date: string; count: number }[];
    registrationsByEvent: {
      eventId: string;
      eventTitle: string;
      count: number;
      capacity: number;
    }[];
    recentRegistrations: {
      id: string;
      full_name: string;
      event_title: string;
      event_id: string;
      created_at: string;
    }[];
    recentRequests: {
      id: string;
      name: string;
      event_title: string;
      status: string;
      created_at: string;
    }[];
  }> => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { count: eventCount },
      { count: regCount },
      { data: regRows },
      { data: reqRows },
      { count: teamCount },
      { data: eventsRows },
    ] = await Promise.all([
      supabaseAdmin.from("club_events").select("status", { count: "exact" }).throwOnError(),
      supabaseAdmin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .throwOnError(),
      supabaseAdmin
        .from("event_registrations")
        .select("id, full_name, event_id, created_at, club_events(title)")
        .order("created_at", { ascending: false })
        .limit(500)
        .throwOnError(),
      supabaseAdmin
        .from("event_requests")
        .select("id, requester_name, event_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
        .throwOnError(),
      supabaseAdmin.from("team_people").select("id", { count: "exact", head: true }).throwOnError(),
      supabaseAdmin
        .from("club_events")
        .select("id, title, status, max_participants")
        .throwOnError(),
    ]);

    const eventCounts: Record<string, number> = {};
    const requestCounts: Record<string, number> = {};
    const activeStatuses = new Set(["upcoming", "registration_open"]);

    for (const e of eventsRows ?? []) {
      const ev = e as { status: string };
      eventCounts[ev.status] = (eventCounts[ev.status] ?? 0) + 1;
    }

    for (const r of reqRows ?? []) {
      const req = r as unknown as { status: string };
      requestCounts[req.status] = (requestCounts[req.status] ?? 0) + 1;
    }

    const activeEvents = (eventsRows ?? []).filter((e) =>
      activeStatuses.has((e as { status: string }).status)
    ).length;

    // Registrations by day — last 90 days, zero-fill missing days
    const dayMap = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of regRows ?? []) {
      const reg = r as { created_at: string };
      const day = reg.created_at.slice(0, 10);
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      }
    }
    const registrationsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Registrations by event
    const eventRegCounts = new Map<string, { title: string; count: number; capacity: number }>();
    for (const e of eventsRows ?? []) {
      const ev = e as {
        id: string;
        title: string;
        max_participants: number;
      };
      eventRegCounts.set(ev.id, {
        title: ev.title,
        count: 0,
        capacity: ev.max_participants,
      });
    }
    for (const r of regRows ?? []) {
      const reg = r as { event_id: string };
      const entry = eventRegCounts.get(reg.event_id);
      if (entry) entry.count += 1;
    }
    const registrationsByEvent = Array.from(eventRegCounts.entries())
      .map(([eventId, v]) => ({
        eventId,
        eventTitle: v.title,
        count: v.count,
        capacity: v.capacity,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const recentRegistrations = (regRows ?? []).slice(0, 8).map((r) => {
      const reg = r as {
        id: string;
        full_name: string;
        event_id: string;
        created_at: string;
        club_events: { title: string } | null;
      };
      return {
        id: reg.id,
        full_name: reg.full_name,
        event_title: reg.club_events?.title ?? "Unknown event",
        event_id: reg.event_id,
        created_at: reg.created_at,
      };
    });

    const recentRequests = (reqRows ?? []).slice(0, 5).map((r) => {
      const req = r as unknown as {
        id: string;
        requester_name: string;
        event_name: string;
        status: string;
        created_at: string;
      };
      return {
        id: req.id,
        name: req.requester_name,
        event_title: req.event_name,
        status: req.status,
        created_at: req.created_at,
      };
    });

    return {
      totalEvents: eventCount ?? 0,
      activeEvents,
      eventCounts,
      totalRegistrations: regCount ?? 0,
      totalRequests: (reqRows ?? []).length,
      requestCounts,
      totalTeam: teamCount ?? 0,
      registrationsByDay,
      registrationsByEvent,
      recentRegistrations,
      recentRequests,
    };
  }
);

const searchSchema = z
  .object({
    eventId: z.string().uuid().optional(),
    term: z.string().max(200).optional(),
    limit: z.number().int().min(1).max(200).default(100),
    offset: z.number().int().min(0).default(0),
  })
  .strict();

export const creatorSearchRegistrations = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("event_registrations")
      .select("id,event_id,full_name,email,phone,created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (data.eventId) q = q.eq("event_id", data.eventId);
    if (data.term) {
      const pattern = `%${data.term}%`;
      q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
    }

    const { data: rows, error, count } = await q.range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);

    return {
      registrations: (rows ?? []) as Array<{
        id: string;
        event_id: string;
        full_name: string;
        email: string;
        phone: string | null;
        created_at: string;
      }>,
      total: count ?? 0,
    };
  });
