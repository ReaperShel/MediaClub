import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { creatorListClubEvents, creatorSaveClubEvent } from "@/lib/club-events.functions";
import { clubEventSchema, STATUS_LABELS, type ClubEventRecord } from "@/lib/club-events.schema";
import {
  defaultFormConfig,
  normalizeFormConfig,
  configsEqual,
  type RegistrationFormConfig,
} from "@/lib/registration-form";
import { FormBuilder } from "@/components/events/form-builder";
import { formatDate } from "@/lib/format";

type EventWithForm = ClubEventRecord & { registered: number };

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function FormEditor({ event, onClose }: { event: EventWithForm; onClose: () => void }) {
  const [config, setConfig] = useState<RegistrationFormConfig>(
    normalizeFormConfig(event.form_config ?? null)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(creatorSaveClubEvent);
  const queryClient = useQueryClient();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = clubEventSchema.safeParse({
        id: event.id,
        title: event.title,
        description: event.description ?? "",
        shortDescription: event.short_description ?? "",
        additionalInfo: event.additional_info ?? "",
        posterUrl: event.poster_url ?? "",
        eventDate: event.event_date,
        startTime: event.start_time ?? "",
        endTime: event.end_time ?? "",
        venue: event.venue,
        maxParticipants: String(event.max_participants),
        registrationDeadline: event.registration_deadline ?? "",
        status: event.status,
        formConfig: config,
      });

      if (!payload.success) {
        setError(payload.error.issues[0]?.message ?? "Invalid form data.");
        return;
      }

      await save({ data: payload.data as never });
      void queryClient.invalidateQueries({
        queryKey: ["creator", "club-events"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creator", "club-events", "summary"],
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save form.");
    } finally {
      setSaving(false);
    }
  }

  const formChanged = !configsEqual(normalizeFormConfig(event.form_config ?? null), config);

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
      <div className="archive-frame my-10 w-full max-w-4xl bg-surface-low p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="label-caps text-primary">Form builder</span>
            <h3 className="mt-2 font-display text-xl font-bold uppercase">{event.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Form version: {event.form_version}
              {formChanged ? " (unsaved changes)" : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <FormBuilder config={config} onChange={setConfig} />
        </div>

        {error ? <p className="mt-4 text-sm text-secondary">{error}</p> : null}

        <div className="mt-6 flex gap-4 border-t border-border pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !formChanged}
            className="label-caps border border-primary bg-primary px-6 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : formChanged ? "Save form (new version)" : "Save form"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreatorFormsPanel() {
  const [editing, setEditing] = useState<EventWithForm | null>(null);

  const events = useQuery({
    queryKey: ["creator", "club-events"],
    queryFn: () => creatorListClubEvents({}),
  });

  if (events.isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading events…</p>;
  }

  if (events.isError) {
    return (
      <p className="py-16 text-center text-sm text-secondary">{(events.error as Error).message}</p>
    );
  }

  const all = events.data ?? [];

  return (
    <div className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b border-border pb-6">
          <h2 className="font-display text-3xl font-bold">Registration Forms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the registration form for each club event. Changing a form creates a new version
            — existing registrations keep their original responses.
          </p>
        </div>

        {all.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No club events yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {all.map((e) => (
              <div
                key={e.id}
                className="archive-frame flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-lg font-bold uppercase">{e.title}</span>
                    <span
                      className={`label-caps border px-2 py-1 text-xs ${
                        e.status === "cancelled" || e.status === "removed"
                          ? "border-border text-muted-foreground"
                          : "border-primary text-primary"
                      }`}
                    >
                      {STATUS_LABELS[e.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(e.event_date)} · Form version {e.form_version ?? 1} · {e.registered}{" "}
                    registrations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  className="label-caps border border-primary px-4 py-2 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  Edit form
                </button>
              </div>
            ))}
          </div>
        )}

        {editing ? <FormEditor event={editing} onClose={() => setEditing(null)} /> : null}
      </div>
    </div>
  );
}
