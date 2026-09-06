import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eventRequestSchema } from "./event-requests.schema";
import type { EventRequestRecord } from "./event-requests.schema";
import { checkRateLimit } from "./rate-limit";
import { getRequest } from "@tanstack/react-start/server";

const statusSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

/** Public: submit a coverage request. Status is forced to pending by the database. */
export const submitEventRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) => eventRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const rate = checkRateLimit(request, undefined, {
      windowMs: 60_000,
      max: 5,
    });
    if (!rate.ok) {
      throw new Error(
        `Too many requests. Please wait ${Math.ceil(rate.retryAfterMs / 1000)} seconds.`
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("event_requests")
      .insert({
        requester_name: data.requesterName,
        email: data.email,
        phone: data.phone || null,
        requester_type: data.requesterType,
        organization: data.organization || null,
        event_name: data.eventName,
        event_type: data.eventType,
        event_date: data.eventDate,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        venue: data.venue,
        expected_attendees: data.expectedAttendees ?? null,
        requested_services: data.requestedServices,
        other_service: data.otherService || null,
        event_description: data.eventDescription,
        additional_requirements: data.additionalRequirements || null,
      })
      .select("reference")
      .single();

    if (error) throw new Error(error.message);
    return { reference: row.reference as string };
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

/** Admin-only: is the caller an administrator? */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: Boolean(data) };
  });

/** Admin-only: list every submitted request. */
export const listEventRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("event_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EventRequestRecord[];
  });

/** Admin-only: approve or reject a request. */
export const setEventRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("event_requests")
      .update({
        status: data.status,
        rejection_reason: data.status === "rejected" ? data.rejectionReason || null : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------------------- */
/* Creator Mode — password-session-gated variants (no Supabase OAuth).         */
/* --------------------------------------------------------------------------- */

/** Creator-only: list every submitted event request. */
export const creatorListEventRequests = createServerFn({
  method: "GET",
}).handler(async (): Promise<EventRequestRecord[]> => {
  const { requireCreator } = await import("./creator.server");
  await requireCreator();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("event_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventRequestRecord[];
});

/** Creator-only: approve or reject an event request, with an optional reason. */
export const creatorSetEventRequestStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("event_requests")
      .update({
        status: data.status,
        rejection_reason: data.status === "rejected" ? data.rejectionReason || null : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
