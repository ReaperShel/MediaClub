import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  CLUB_EVENT_STATUSES,
  STATUS_LABELS,
  clubEventSchema,
  type ClubEventRecord,
} from "@/lib/club-events.schema";
import {
  creatorDeleteClubEvent,
  creatorListClubEvents,
  creatorSaveClubEvent,
  creatorDeleteEventRegistration,
  creatorListEventRegistrations,
  creatorExportRegistrationsCsv,
} from "@/lib/club-events.functions";
import {
  defaultFormConfig,
  normalizeFormConfig,
  type RegistrationFormConfig,
} from "@/lib/registration-form";
import { FormBuilder } from "@/components/events/form-builder";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";

const STATUS_COLORS: Record<ClubEventRecord["status"], string> = {
  upcoming: "border-border text-muted-foreground",
  registration_open: "border-primary text-primary",
  registration_closed: "border-muted-foreground text-muted-foreground",
  completed: "border-muted text-muted-foreground",
  cancelled: "border-secondary text-secondary",
  removed: "border-border text-muted-foreground/40",
};

type AdminClubEvent = ClubEventRecord & { registered: number };

function EventForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: AdminClubEvent | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(creatorSaveClubEvent);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<RegistrationFormConfig>(
    initial?.form_config ? normalizeFormConfig(initial.form_config) : defaultFormConfig()
  );

  useEffect(() => {
    setFormConfig(
      initial?.form_config ? normalizeFormConfig(initial.form_config) : defaultFormConfig()
    );
  }, [initial?.id, initial?.form_config]);

  const mutation = useMutation({
    mutationFn: (input: unknown) => save({ data: input as never }),
    onSuccess: onSaved,
    onError: (err: Error) => setFormError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const parsed = clubEventSchema.safeParse({
      ...(initial ? { id: initial.id } : {}),
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      shortDescription: String(fd.get("shortDescription") ?? ""),
      additionalInfo: String(fd.get("additionalInfo") ?? ""),
      posterUrl: String(fd.get("posterUrl") ?? ""),
      eventDate: String(fd.get("eventDate") ?? ""),
      startTime: String(fd.get("startTime") ?? ""),
      endTime: String(fd.get("endTime") ?? ""),
      venue: String(fd.get("venue") ?? ""),
      maxParticipants: String(fd.get("maxParticipants") ?? "0"),
      registrationDeadline: String(fd.get("registrationDeadline") ?? ""),
      status: String(fd.get("status") ?? "registration_open"),
      formConfig,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="archive-frame mb-10 bg-surface-low p-6">
      <h3 className="font-display text-xl font-bold uppercase">
        {initial ? "Edit event" : "New club event"}
      </h3>

      <fieldset
        disabled={mutation.isPending}
        className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        <label className="block sm:col-span-2">
          <span className={labelClass}>Title *</span>
          <input name="title" defaultValue={initial?.title ?? ""} className={inputClass} required />
          {errors["title"] ? (
            <span className="mt-2 block text-xs text-secondary">{errors["title"]}</span>
          ) : null}
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Short description</span>
          <input
            name="shortDescription"
            defaultValue={initial?.short_description ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Poster image URL</span>
          <input
            name="posterUrl"
            defaultValue={initial?.poster_url ?? ""}
            className={inputClass}
            placeholder="https://…"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Event date *</span>
          <input
            name="eventDate"
            type="date"
            defaultValue={initial?.event_date ?? ""}
            className={inputClass}
            required
          />
        </label>

        <label className="block">
          <span className={labelClass}>Venue *</span>
          <input name="venue" defaultValue={initial?.venue ?? ""} className={inputClass} required />
        </label>

        <label className="block">
          <span className={labelClass}>Start time</span>
          <input
            name="startTime"
            type="time"
            defaultValue={initial?.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>End time</span>
          <input
            name="endTime"
            type="time"
            defaultValue={initial?.end_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Maximum participants *</span>
          <input
            name="maxParticipants"
            type="number"
            min="0"
            defaultValue={initial?.max_participants ?? 50}
            className={inputClass}
            required
          />
        </label>

        <label className="block">
          <span className={labelClass}>Registration deadline</span>
          <input
            name="registrationDeadline"
            type="date"
            defaultValue={initial?.registration_deadline ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Additional info</span>
          <textarea
            name="additionalInfo"
            rows={2}
            defaultValue={initial?.additional_info ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Status *</span>
          <select
            name="status"
            defaultValue={initial?.status ?? "registration_open"}
            className={inputClass}
          >
            {CLUB_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <div className="mt-8">
        <FormBuilder config={formConfig} onChange={setFormConfig} />
      </div>

      {formError ? <p className="mt-5 text-sm text-secondary">{formError}</p> : null}

      <div className="mt-7 flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="label-caps border border-primary px-6 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Create event"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function RegistrationsSubPanel({ event }: { event: AdminClubEvent }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const searchFn = useServerFn(creatorListEventRegistrations);
  const deleteFn = useServerFn(creatorDeleteEventRegistration);
  const exportCsv = useServerFn(creatorExportRegistrationsCsv);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["creator", "registrations", event.id, term],
    queryFn: () => searchFn({ data: { eventId: event.id, term, limit: 200 } }),
    placeholderData: (prev) => prev,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["creator", "registrations", event.id],
      });
    },
  });

  const registrations = data?.registrations ?? [];

  return (
    <div className="border-t border-border bg-surface-low p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="label-caps text-muted-foreground">
          Participants ({data?.total ?? 0}/{event.max_participants})
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search participants…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-48 border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {registrations.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                const result = await exportCsv({ data: { eventId: event.id } });
                const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-registrations.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading participants…</p>
      ) : isError ? (
        <p className="py-6 text-sm text-secondary">Could not load participants.</p>
      ) : registrations.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Nobody has registered yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-border label-caps text-muted-foreground">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Registered</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-3 pr-4">{r.full_name}</td>
                  <td className="py-3 pr-4">{r.email}</td>
                  <td className="py-3 pr-4">{r.phone ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${r.full_name}'s registration?`))
                          void remove.mutate(r.id);
                      }}
                      className="label-caps text-muted-foreground transition-colors hover:text-secondary"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CreatorEventsPanel() {
  const queryClient = useQueryClient();
  const [formFor, setFormFor] = useState<AdminClubEvent | null | "new">(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["creator", "club-events"],
    queryFn: () => creatorListClubEvents({}),
  });

  const removeEvent = useServerFn(creatorDeleteClubEvent);
  const remove = useMutation({
    mutationFn: (id: string) => removeEvent({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["creator", "club-events"],
      });
    },
  });

  if (eventsQuery.isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading events…</p>;
  }

  if (eventsQuery.isError) {
    return (
      <p className="py-16 text-center text-sm text-secondary">
        {(eventsQuery.error as Error).message}
      </p>
    );
  }

  const all = eventsQuery.data ?? [];

  return (
    <div className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <h2 className="font-display text-3xl font-bold">Club Events</h2>
          <button
            type="button"
            onClick={() => setFormFor("new")}
            className="label-caps border border-primary px-5 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            + New event
          </button>
        </div>

        {formFor ? (
          <EventForm
            initial={formFor === "new" ? null : formFor}
            onCancel={() => setFormFor(null)}
            onSaved={() => {
              setFormFor(null);
              void queryClient.invalidateQueries({
                queryKey: ["creator", "club-events"],
              });
            }}
          />
        ) : null}

        {all.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No club events yet. Create the first one.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {all.map((event) => (
              <article key={event.id} className="archive-frame">
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-lg font-bold uppercase">{event.title}</h3>
                      <span
                        className={`label-caps border px-3 py-1 ${STATUS_COLORS[event.status]}`}
                      >
                        {STATUS_LABELS[event.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDate(event.event_date)} · {event.venue} · {event.registered}/
                      {event.max_participants} registered
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === event.id ? null : event.id)}
                      className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {openId === event.id ? "Hide list" : "Participants"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormFor(event)}
                      className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete “${event.title}” and all its registrations?`))
                          void remove.mutate(event.id);
                      }}
                      className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {openId === event.id ? <RegistrationsSubPanel event={event} /> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
