import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SiteShell } from "@/components/site-shell";
import { ErrorState } from "@/components/ui-states";
import { EventCardGridSkeleton, RegistrationFormSkeleton } from "@/components/ui/skeleton-shimmer";
import { listPublicClubEvents, registerForClubEvent } from "@/lib/club-events.functions";
import { STATUS_LABELS, eventRegistrationSchema } from "@/lib/club-events.schema";
import { RegistrationFields } from "@/components/events/registration-fields";
import { normalizeFormConfig, validateSubmission } from "@/lib/registration-form";
import { InlineCreatorMode } from "@/components/creator/inline-creator-mode";
import type { PublicClubEvent } from "@/lib/club-events.schema";
import { formatDate } from "@/lib/format";
import { img } from "@/lib/images";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Register for Club Events — Media Club" },
      {
        name: "description",
        content:
          "Browse Media Club workshops, photowalks and screenings, check remaining seats and register for the events you want to attend.",
      },
      {
        property: "og:title",
        content: "Register for Club Events — Media Club",
      },
      {
        property: "og:description",
        content: "Open registrations for Media Club workshops, photowalks and screenings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: img.heroCameras },
      { name: "twitter:image", content: img.heroCameras },
    ],
  }),
  component: ClubEventsPage,
});

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";

function timeRange(event: PublicClubEvent) {
  if (!event.start_time) return null;
  const trim = (t: string) => t.slice(0, 5);
  return event.end_time
    ? `${trim(event.start_time)} – ${trim(event.end_time)}`
    : trim(event.start_time);
}

function EventCardRow({ event, onRegister }: { event: PublicClubEvent; onRegister: () => void }) {
  const time = timeRange(event);
  return (
    <article className="archive-frame flex flex-col">
      {event.poster_url ? (
        <img
          src={event.poster_url}
          alt={`${event.title} poster`}
          loading="lazy"
          className="aspect-4/3 w-full border-b border-border object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps border border-border px-3 py-1 text-primary">
            {STATUS_LABELS[event.status]}
          </span>
          <span className="text-xs tracking-wider text-muted-foreground uppercase">
            {formatDate(event.event_date)}
            {time ? ` · ${time}` : ""}
          </span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold uppercase">{event.title}</h3>
        {event.short_description || event.description ? (
          <p className="mt-3 text-sm font-light text-muted-foreground">
            {event.short_description || event.description}
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <div>
            <dt className="label-caps text-muted-foreground">Venue</dt>
            <dd className="mt-1">{event.venue}</dd>
          </div>
          <div>
            <dt className="label-caps text-muted-foreground">Registered</dt>
            <dd className="mt-1">
              {event.registered} / {event.max_participants}
              <span className="block text-xs text-muted-foreground">
                {event.seatsLeft} seats left
              </span>
            </dd>
          </div>
          {event.registration_deadline ? (
            <div className="col-span-2">
              <dt className="label-caps text-muted-foreground">Register by</dt>
              <dd className="mt-1">{formatDate(event.registration_deadline)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex-1" />
        <button
          type="button"
          disabled={!event.isOpen}
          onClick={onRegister}
          className="label-caps w-full border border-primary px-6 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          {event.isOpen
            ? "Register now"
            : event.status === "registration_open"
              ? event.seatsLeft === 0
                ? "Registration full"
                : "Registration deadline passed"
              : STATUS_LABELS[event.status]}
        </button>
      </div>
    </article>
  );
}

function RegistrationDialog({
  event,
  onClose,
  onDone,
}: {
  event: PublicClubEvent;
  onClose: () => void;
  onDone: () => void;
}) {
  const register = useServerFn(registerForClubEvent);
  const config = useMemo(() => normalizeFormConfig(event.form_config), [event.form_config]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setFormReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  const mutation = useMutation({
    mutationFn: (input: unknown) => register({ data: input as never }),
    onSuccess: () => {
      setDone(true);
      onDone();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    // Client-side pass first; the backend re-validates against the stored form.
    const result = validateSubmission(config, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const parsed = eventRegistrationSchema.safeParse({
      eventId: event.id,
      values,
      additionalInfo: config.allowAdditionalInfo ? additionalInfo : "",
    });
    if (!parsed.success) {
      setFormError("Please check the form and try again.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Register for ${event.title}`}
        className="archive-frame my-10 w-full max-w-2xl bg-surface-low p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="label-caps text-primary">Club event registration</span>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase">{event.title}</h2>
            <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">
              {formatDate(event.event_date)} · {event.venue}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration form"
            className="text-muted-foreground transition-colors hover:text-foreground"
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

        {done ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="label-caps text-primary">You are registered</span>
            <h3 className="font-display text-2xl font-bold uppercase">See you there</h3>
            <p className="max-w-sm text-sm font-light text-muted-foreground">
              Your spot for {event.title} is confirmed. The Media Club team will reach out with
              details before the event.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="label-caps mt-2 border border-primary px-7 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {formReady ? (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="mt-6"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <fieldset disabled={mutation.isPending}>
                  <RegistrationFields
                    config={config}
                    values={values}
                    errors={errors}
                    onChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
                  />
                  {config.allowAdditionalInfo ? (
                    <label className="mt-5 block">
                      <span className={labelClass}>Anything we should know?</span>
                      <textarea
                        rows={3}
                        className={inputClass}
                        placeholder="Optional"
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                      />
                    </label>
                  ) : null}
                </fieldset>

                {formError ? <p className="mt-5 text-sm text-secondary">{formError}</p> : null}

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="label-caps border border-primary px-7 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                  >
                    {mutation.isPending ? "Submitting…" : "Confirm registration"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="label-caps border border-border px-7 py-4 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <RegistrationFormSkeleton />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ClubEventsPage() {
  const fetchEvents = useServerFn(listPublicClubEvents);
  const events = useQuery({
    queryKey: ["club-events", "public"],
    queryFn: () => fetchEvents({}),
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = (events.data ?? []).find((e) => e.id === activeId) ?? null;

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="label-caps mb-4 text-primary">Club events</p>
          <h1 className="display-title text-4xl md:text-6xl">Register for Club Events</h1>
          <p className="mt-6 max-w-xl text-base font-light text-muted-foreground">
            Workshops, photowalks, screenings and sessions run by the Media Club. Pick an event with
            open registration and claim your seat.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <AnimatePresence mode="wait">
          {events.isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <EventCardGridSkeleton count={3} />
            </motion.div>
          ) : events.isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ErrorState onRetry={() => events.refetch()} />
            </motion.div>
          ) : (events.data ?? []).length === 0 ? (
            <motion.p
              key="empty"
              className="py-20 text-center text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              No club events are open right now. Check back soon.
            </motion.p>
          ) : (
            <motion.div
              key="events"
              className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {(events.data ?? []).map((event) => (
                <EventCardRow
                  key={event.id}
                  event={event}
                  onRegister={() => setActiveId(event.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {active ? (
        <RegistrationDialog
          event={active}
          onClose={() => setActiveId(null)}
          onDone={() => void events.refetch()}
        />
      ) : null}

      <InlineCreatorMode />
    </SiteShell>
  );
}
