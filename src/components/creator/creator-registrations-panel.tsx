import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { creatorDeleteEventRegistration, creatorListClubEvents } from "@/lib/club-events.functions";
import { creatorExportRegistrationsCsv } from "@/lib/club-events.functions";
import { creatorSearchRegistrations } from "@/lib/creator.functions";
import { formatDate } from "@/lib/format";

type Registration = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

type EventSummary = {
  id: string;
  title: string;
  status: string;
};

export function CreatorRegistrationsPanel() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [selected, setSelected] = useState<Registration | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["creator", "club-events", "summary"],
    queryFn: () => creatorListClubEvents({}),
    select: (data) =>
      data.map((e): EventSummary => ({
        id: e.id,
        title: e.title,
        status: e.status,
      })),
  });

  const searchQuery = useQuery({
    queryKey: ["creator", "registrations", "search", term, eventFilter],
    queryFn: () =>
      creatorSearchRegistrations({
        data: {
          term: term || undefined,
          eventId: eventFilter || undefined,
          limit: 500,
        },
      }),
    enabled: true,
  });

  const delFn = useServerFn(creatorDeleteEventRegistration);
  const exportFn = useServerFn(creatorExportRegistrationsCsv);

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["creator", "registrations"],
      });
      setSelected(null);
    },
  });

  const registrations: Registration[] = (searchQuery.data?.registrations ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    full_name: r.full_name,
    email: r.email,
    phone: r.phone ?? "",
    created_at: r.created_at,
  }));

  const eventLookup = new Map<string, string>();
  for (const e of eventsQuery.data ?? []) {
    eventLookup.set(e.id, e.title);
  }

  const filtered = registrations.filter((r) => {
    if (eventFilter && r.event_id !== eventFilter) return false;
    if (
      term &&
      !`${r.full_name} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(term.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-border pb-6">
          <h2 className="font-display text-3xl font-bold">Registrations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Search across all event registrations.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-64 border border-border bg-surface-low px-4 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="border border-border bg-surface-low px-4 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">All events</option>
            {eventsQuery.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              void searchQuery.refetch();
            }}
            className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Refresh
          </button>
        </div>

        <button
          type="button"
          disabled={registrations.length === 0}
          onClick={async () => {
            const eventId = prompt("Enter event ID for CSV export:", eventFilter || "");
            if (!eventId) return;
            const result = await exportFn({ data: { eventId } });
            const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = result.filename;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="label-caps mb-4 border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          Export CSV (select event)
        </button>

        {searchQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading registrations…</p>
        ) : searchQuery.isError ? (
          <p className="py-16 text-center text-sm text-secondary">
            {(searchQuery.error as Error).message}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No registrations match your search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-border label-caps text-muted-foreground">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Phone</th>
                  <th className="py-3 pr-4">Event</th>
                  <th className="py-3 pr-4">Registered</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-3 pr-4">{r.full_name}</td>
                    <td className="py-3 pr-4">{r.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.phone || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {eventLookup.get(r.event_id) ?? r.event_id.slice(0, 8)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="label-caps text-muted-foreground transition-colors hover:text-primary"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
            <div className="archive-frame my-10 w-full max-w-lg bg-surface-low p-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <span className="label-caps text-primary">{selected.full_name}</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.email}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSelected(null)}
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

              <dl className="grid grid-cols-1 gap-3 py-4">
                <div>
                  <dt className="label-caps text-muted-foreground">Event</dt>
                  <dd className="mt-1 text-sm">
                    {eventLookup.get(selected.event_id) ?? selected.event_id}
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-muted-foreground">Phone</dt>
                  <dd className="mt-1 text-sm">{selected.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="label-caps text-muted-foreground">Registered</dt>
                  <dd className="mt-1 text-sm">{formatDate(selected.created_at)}</dd>
                </div>
              </dl>

              <div className="flex gap-4 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove ${selected.full_name}'s registration?`)) {
                      void remove.mutate(selected.id);
                    }
                  }}
                  disabled={remove.isPending}
                  className="label-caps border border-secondary px-5 py-3 text-secondary transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {remove.isPending ? "Removing…" : "Remove registration"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="label-caps border border-border px-5 py-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
