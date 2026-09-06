import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  creatorListEventRequests,
  creatorSetEventRequestStatus,
} from "@/lib/event-requests.functions";
import type { EventRequestRecord, RequestStatus } from "@/lib/event-requests.schema";
import { formatDate } from "@/lib/format";

const STATUS_TONES: Record<RequestStatus, string> = {
  pending: "border-border text-muted-foreground",
  approved: "border-primary text-primary",
  rejected: "border-secondary text-secondary",
};

function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`label-caps border px-3 py-1 ${STATUS_TONES[status]}`}>{status}</span>;
}

export function CreatorEventRequestsPanel() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const requests = useQuery({
    queryKey: ["creator", "event-requests"],
    queryFn: () => creatorListEventRequests({}),
  });

  const setStatus = useServerFn(creatorSetEventRequestStatus);
  const mutate = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected"; rejectionReason?: string }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      setOpenId(null);
      setReason("");
      void queryClient.invalidateQueries({
        queryKey: ["creator", "event-requests"],
      });
    },
  });

  if (requests.isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading requests…</p>;
  }

  if (requests.isError) {
    return (
      <p className="py-16 text-center text-sm text-secondary">
        {(requests.error as Error).message}
      </p>
    );
  }

  const rows: EventRequestRecord[] = requests.data ?? [];
  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-border pb-6">
          <h2 className="font-display text-3xl font-bold">Event Requests</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length} request{rows.length === 1 ? "" : "s"} received
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No event requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead>
                <tr className="border-b border-border label-caps text-muted-foreground">
                  <th className="py-3 pr-4">Ref</th>
                  <th className="py-3 pr-4">Requester</th>
                  <th className="py-3 pr-4">Event</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Services</th>
                  <th className="py-3 pr-4">Submitted</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setOpenId(r.id);
                      setReason("");
                    }}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-surface"
                  >
                    <td className="py-4 pr-4 font-mono text-xs text-primary">{r.reference}</td>
                    <td className="py-4 pr-4">{r.requester_name}</td>
                    <td className="py-4 pr-4">{r.event_name}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDate(r.event_date)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{r.event_type}</td>
                    <td className="max-w-56 truncate py-4 pr-4 text-muted-foreground">
                      {r.requested_services.join(", ")}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={r.status as RequestStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {open ? (
          <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
            <div className="archive-frame my-10 w-full max-w-2xl bg-surface-low p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <span className="label-caps text-primary">{open.reference}</span>
                  <h3 className="mt-2 font-display text-2xl font-bold uppercase">
                    {open.event_name}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={open.status as RequestStatus} />
                  <button
                    type="button"
                    aria-label="Close details"
                    onClick={() => {
                      setOpenId(null);
                      setReason("");
                    }}
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
              </div>

              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 py-6 sm:grid-cols-2">
                {[
                  ["Requester", open.requester_name],
                  ["Email", open.email],
                  ["Phone", open.phone ?? "—"],
                  ["Requester type", open.requester_type],
                  ["Organization", open.organization ?? "—"],
                  ["Event type", open.event_type],
                  ["Event date", formatDate(open.event_date)],
                  ["Time", `${open.start_time ?? "—"} – ${open.end_time ?? "—"}`],
                  ["Venue", open.venue],
                  ["Expected attendees", open.expected_attendees?.toString() ?? "—"],
                  ["Submitted", formatDate(open.created_at)],
                  ["Services", open.requested_services.join(", ")],
                  ...(open.other_service ? [["Other service", open.other_service]] : []),
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="label-caps text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm break-words">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-5 border-t border-border pt-5">
                <div>
                  <span className="label-caps text-muted-foreground">Description</span>
                  <p className="mt-2 text-sm font-light whitespace-pre-line text-muted-foreground">
                    {open.event_description}
                  </p>
                </div>
                {open.additional_requirements ? (
                  <div>
                    <span className="label-caps text-muted-foreground">
                      Additional requirements
                    </span>
                    <p className="mt-2 text-sm font-light whitespace-pre-line text-muted-foreground">
                      {open.additional_requirements}
                    </p>
                  </div>
                ) : null}
                {open.rejection_reason ? (
                  <div>
                    <span className="label-caps text-secondary">Rejection reason</span>
                    <p className="mt-2 text-sm font-light whitespace-pre-line text-muted-foreground">
                      {open.rejection_reason}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
                <label className="block">
                  <span className="label-caps mb-2 block text-muted-foreground">
                    Rejection reason (optional, only for reject)
                  </span>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Shared internally with the team"
                    className="w-full border border-border bg-surface-low px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={mutate.isPending || open.status === "approved"}
                    onClick={() => mutate.mutate({ id: open.id, status: "approved" })}
                    className="label-caps border border-primary bg-primary px-6 py-4 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {mutate.isPending ? "Updating…" : "Approve request"}
                  </button>
                  <button
                    type="button"
                    disabled={mutate.isPending || open.status === "rejected"}
                    onClick={() =>
                      mutate.mutate({
                        id: open.id,
                        status: "rejected",
                        rejectionReason: reason,
                      })
                    }
                    className="label-caps border border-secondary px-6 py-4 text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:opacity-60"
                  >
                    Reject request
                  </button>
                </div>
                {mutate.isError ? (
                  <p className="text-xs text-secondary">Couldn't update the request. Try again.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
