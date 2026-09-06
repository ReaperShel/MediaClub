import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { submitEventRequest } from "@/lib/event-requests.functions";
import {
  EVENT_TYPES,
  REQUESTER_TYPES,
  SERVICE_OPTIONS,
  eventRequestSchema,
} from "@/lib/event-requests.schema";
import { img } from "@/lib/images";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Request Media Coverage — Media Club" },
      {
        name: "description",
        content:
          "Request Media Club photography, videography or full documentation for your campus event. Tell us the date, venue and what you need.",
      },
      { property: "og:title", content: "Request Media Coverage — Media Club" },
      {
        property: "og:description",
        content: "Tell us about your event and what you need from the Media Club.",
      },
      { property: "og:image", content: img.heroCameras },
      { name: "twitter:image", content: img.heroCameras },
    ],
  }),
  component: RegisterPage,
});

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-2 block text-xs text-secondary">{error}</span> : null}
    </label>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8 border-b border-border pb-4">
      <span className="label-caps text-primary">{eyebrow}</span>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight uppercase">{title}</h2>
    </div>
  );
}

function RegisterPage() {
  const submit = useServerFn(submitEventRequest);
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const toggleService = (name: string) =>
    setServices((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const raw = {
      requesterName: String(fd.get("requesterName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      requesterType: String(fd.get("requesterType") ?? ""),
      organization: String(fd.get("organization") ?? ""),
      eventName: String(fd.get("eventName") ?? ""),
      eventType: String(fd.get("eventType") ?? ""),
      eventDate: String(fd.get("eventDate") ?? ""),
      startTime: String(fd.get("startTime") ?? ""),
      endTime: String(fd.get("endTime") ?? ""),
      venue: String(fd.get("venue") ?? ""),
      expectedAttendees: fd.get("expectedAttendees")
        ? Number(fd.get("expectedAttendees"))
        : undefined,
      requestedServices: services,
      otherService: String(fd.get("otherService") ?? ""),
      eventDescription: String(fd.get("eventDescription") ?? ""),
      additionalRequirements: String(fd.get("additionalRequirements") ?? ""),
    };

    const parsed = eventRequestSchema.safeParse(raw);
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
    setPending(true);
    try {
      const result = await submit({ data: parsed.data });
      setReference(result.reference);
    } catch (err) {
      console.error(err);
      setFormError("We couldn't send your request. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <SiteShell>
        <section className="px-5 py-24 md:px-8 md:py-32">
          <div className="archive-frame mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 py-16 text-center">
            <span className="label-caps text-primary">Request submitted</span>
            <h1 className="display-title text-3xl md:text-5xl">Request Received</h1>
            <p className="max-w-md text-sm font-light text-muted-foreground">
              Your event request has been sent to the Media Club team. The team will review your
              request and update its status.
            </p>
            <p className="mt-2 border border-primary px-6 py-3 font-display text-lg font-bold tracking-widest text-primary">
              Your request ID: {reference}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="label-caps border border-primary px-7 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={() => {
                  setReference(null);
                  setServices([]);
                  setFormKey((k) => k + 1);
                }}
                className="label-caps border border-border px-7 py-4 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Submit another request
              </button>
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="label-caps mb-4 text-primary">Event Request</p>
          <h1 className="display-title text-4xl md:text-6xl">Request Media Coverage</h1>
          <p className="mt-6 max-w-xl text-base font-light text-muted-foreground">
            Tell us about your event and what you need from the Media Club.
          </p>
        </div>
      </section>

      <form key={formKey} onSubmit={handleSubmit} className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <fieldset className="mb-14" disabled={pending}>
          <SectionTitle eyebrow="Step 01" title="Requester information" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Full name *" error={errors["requesterName"]}>
              <input name="requesterName" className={inputClass} placeholder="Your name" required />
            </Field>
            <Field label="Email address *" error={errors["email"]}>
              <input
                name="email"
                type="email"
                className={inputClass}
                placeholder="you@college.edu"
                required
              />
            </Field>
            <Field label="Phone number" error={errors["phone"]}>
              <input name="phone" className={inputClass} placeholder="+91 00000 00000" />
            </Field>
            <Field label="I am a *" error={errors["requesterType"]}>
              <select name="requesterType" className={inputClass} defaultValue="Student" required>
                {REQUESTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Department / club / organization" error={errors["organization"]}>
                <input name="organization" className={inputClass} placeholder="e.g. CSE Dept." />
              </Field>
            </div>
          </div>
        </fieldset>

        <fieldset className="mb-14" disabled={pending}>
          <SectionTitle eyebrow="Step 02" title="Event information" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Event name *" error={errors["eventName"]}>
              <input name="eventName" className={inputClass} placeholder="Event title" required />
            </Field>
            <Field label="Event type *" error={errors["eventType"]}>
              <select name="eventType" className={inputClass} defaultValue="Cultural" required>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Event date *" error={errors["eventDate"]}>
              <input name="eventDate" type="date" className={inputClass} required />
            </Field>
            <Field label="Venue / location *" error={errors["venue"]}>
              <input name="venue" className={inputClass} placeholder="Auditorium" required />
            </Field>
            <Field label="Start time" error={errors["startTime"]}>
              <input name="startTime" type="time" className={inputClass} />
            </Field>
            <Field label="End time" error={errors["endTime"]}>
              <input name="endTime" type="time" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Expected number of attendees" error={errors["expectedAttendees"]}>
                <input
                  name="expectedAttendees"
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="150"
                />
              </Field>
            </div>
          </div>
        </fieldset>

        <fieldset className="mb-14" disabled={pending}>
          <SectionTitle eyebrow="Step 03" title="Media requirements" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICE_OPTIONS.map((s) => {
              const active = services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 border px-4 py-4 text-left text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      active ? "border-primary bg-primary" : "border-border"
                    }`}
                  />
                  {s}
                </button>
              );
            })}
          </div>
          {errors["requestedServices"] ? (
            <p className="mt-3 text-xs text-secondary">{errors["requestedServices"]}</p>
          ) : null}
          {services.includes("Other") ? (
            <div className="mt-6">
              <Field label="Tell us what else you need" error={errors["otherService"]}>
                <input name="otherService" className={inputClass} placeholder="Describe it" />
              </Field>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="mb-14" disabled={pending}>
          <SectionTitle eyebrow="Step 04" title="Event description" />
          <div className="grid gap-6">
            <Field label="About the event *" error={errors["eventDescription"]}>
              <textarea
                name="eventDescription"
                rows={6}
                className={inputClass}
                placeholder="Describe your event and tell us what you would like the Media Club to cover."
                required
              />
            </Field>
            <Field label="Additional requirements" error={errors["additionalRequirements"]}>
              <textarea
                name="additionalRequirements"
                rows={4}
                className={inputClass}
                placeholder="Anything else we should know?"
              />
            </Field>
          </div>
        </fieldset>

        {formError ? <p className="mb-6 text-sm text-secondary">{formError}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="label-caps w-full border border-primary bg-primary px-8 py-5 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Submitting..." : "Submit event request"}
        </button>
      </form>
    </SiteShell>
  );
}
