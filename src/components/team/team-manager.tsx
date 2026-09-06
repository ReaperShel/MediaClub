/**
 * Creator Mode → Team management.
 *
 * Every action here calls a creator-gated server function; the browser never
 * touches Google Drive directly. Photos are sent as data URLs and uploaded to
 * Drive server-side.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  creatorDeleteTeamPerson,
  creatorListTeam,
  creatorReorderTeam,
  creatorSaveTeamPerson,
  teamKeys,
} from "@/lib/team.functions";
import { RANKS, TEAM_OPTIONS } from "@/lib/team.schema";
import type { TeamPersonRecord, TeamRank } from "@/lib/team.schema";
import { driveMediaUrl } from "@/lib/drive/media";

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";
const btn =
  "label-caps border border-primary px-5 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50";
const btnGhost =
  "label-caps border border-border px-5 py-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50";
const btnDanger =
  "label-caps border border-border px-5 py-3 text-secondary transition-colors hover:border-secondary disabled:opacity-50";

function Panel({
  label,
  onClose,
  children,
  wide,
  embedded = false,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  embedded: boolean | undefined;
}) {
  if (embedded) {
    return (
      <div
        className={`archive-frame ${wide ? "max-w-4xl" : "max-w-2xl"} mx-auto w-full bg-surface-low p-6 md:p-8`}
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
          <h2 className="font-display text-xl font-bold uppercase">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
        {children}
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`archive-frame my-10 w-full ${wide ? "max-w-4xl" : "max-w-2xl"} bg-surface-low p-6 md:p-8`}
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
          <h2 className="font-display text-xl font-bold uppercase">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
        {children}
      </div>
    </div>
  );
}

type Draft = {
  id?: string | undefined;
  kind: "lead" | "member";
  name: string;
  role: string;
  team: string;
  rank: TeamRank;
  leadId: string | null;
  bio: string;
  skills: string;
  displayOrder: number;
  published: boolean;
  instagramUrl: string | null;
};

function toDraft(person: TeamPersonRecord): Draft {
  return {
    id: person.id,
    kind: person.kind,
    name: person.name,
    role: person.role,
    team: person.team,
    rank: person.rank,
    leadId: person.lead_id,
    bio: person.bio,
    skills: (person.skills ?? []).join(", "),
    displayOrder: person.display_order,
    published: person.published,
    instagramUrl: person.instagram_url ?? null,
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------- form -- */

export function PersonForm({
  draft,
  leads,
  existingPhotoId,
  onClose,
  onSaved,
  embedded,
}: {
  draft: Draft;
  leads: TeamPersonRecord[];
  existingPhotoId: string | null;
  onClose: () => void;
  onSaved: () => void;
  embedded: boolean | undefined;
}) {
  const save = useServerFn(creatorSaveTeamPerson);
  const [form, setForm] = useState<Draft>(draft);
  const [photo, setPhoto] = useState<{
    dataUrl: string;
    filename: string;
  } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: form.id ?? null,
          kind: form.kind,
          name: form.name,
          role: form.role,
          team: form.team,
          rank: form.kind === "lead" ? form.rank : "member",
          leadId: form.kind === "member" ? form.leadId : null,
          bio: form.bio,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          displayOrder: Number(form.displayOrder) || 0,
          published: form.published,
          instagramUrl: form.instagramUrl,
          photo,
          removePhoto: removePhoto && !photo,
        },
      }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  const previewId = photo ? null : removePhoto ? null : existingPhotoId;

  return (
    <Panel
      label={form.id ? `Edit ${draft.name}` : "Add team member"}
      onClose={onClose}
      embedded={embedded}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className={labelClass}>Role</span>
            <input
              className={inputClass}
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className={labelClass}>Team</span>
            <input
              type="text"
              list="team-options"
              className={inputClass}
              value={form.team}
              onChange={(e) => set("team", e.target.value)}
              placeholder="e.g. Photography"
            />
            <datalist id="team-options">
              {TEAM_OPTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          {form.kind === "lead" ? (
            <label className="block">
              <span className={labelClass}>Leadership rank</span>
              <select
                className={inputClass}
                value={form.rank}
                onChange={(e) => set("rank", e.target.value as TeamRank)}
              >
                {RANKS.filter((r) => r !== "member").map((r) => (
                  <option key={r} value={r}>
                    {r === "lead" ? "Division lead" : r.replace("-", " ")}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block">
              <span className={labelClass}>Reports to</span>
              <select
                className={inputClass}
                value={form.leadId ?? ""}
                onChange={(e) => set("leadId", e.target.value || null)}
              >
                <option value="">No lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.role} — {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className={labelClass}>Display order</span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.displayOrder}
              onChange={(e) => set("displayOrder", Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className={labelClass}>
              Instagram profile <span className="text-muted-foreground">(optional)</span>
            </span>
            <input
              className={inputClass}
              value={form.instagramUrl ?? ""}
              onChange={(e) => set("instagramUrl", e.target.value || null)}
              placeholder="https://instagram.com/username"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Optional. Paste the member's Instagram profile URL.
            </span>
          </label>
          <label className="flex items-center gap-3 self-end pb-3">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set("published", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="label-caps text-muted-foreground">Published</span>
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Bio</span>
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Skills / specialisations (comma separated)</span>
          <input
            className={inputClass}
            value={form.skills}
            onChange={(e) => set("skills", e.target.value)}
            placeholder="Camera, Lighting, Editing"
          />
        </label>

        <div className="border border-border p-4">
          <p className={labelClass}>Photograph (stored in Google Drive)</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-24">
              {photo ? (
                <img
                  src={photo.dataUrl}
                  alt="Selected preview"
                  className="aspect-4/5 w-full object-cover"
                />
              ) : previewId ? (
                <img
                  src={driveMediaUrl(previewId)}
                  alt="Current"
                  className="aspect-4/5 w-full object-cover"
                />
              ) : (
                <div className="flex aspect-4/5 w-full items-center justify-center border border-dashed border-border">
                  <span className="label-caps text-center text-[10px] text-muted-foreground">
                    Photo coming soon
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 6 * 1024 * 1024) {
                  setError("Photo must be under 6 MB.");
                  return;
                }
                setError(null);
                setRemovePhoto(false);
                setPhoto({
                  dataUrl: await readFile(file),
                  filename: file.name,
                });
              }}
            />
            <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
              {existingPhotoId || photo ? "Change photo" : "Select photo"}
            </button>
            {existingPhotoId && !photo ? (
              <button type="button" className={btnDanger} onClick={() => setRemovePhoto((v) => !v)}>
                {removePhoto ? "Keep photo" : "Remove photo"}
              </button>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-secondary">{error}</p> : null}

        <div className="flex gap-4 border-t border-border pt-5">
          <button type="submit" className={btn} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------- hierarchy -- */

export function TeamManager({
  onClose,
  embedded,
}: {
  onClose: () => void;
  embedded: boolean | undefined;
}) {
  const fetchTeam = useServerFn(creatorListTeam);
  const remove = useServerFn(creatorDeleteTeamPerson);
  const reorder = useServerFn(creatorReorderTeam);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<TeamPersonRecord | null>(null);

  const team = useQuery({
    queryKey: teamKeys.creator,
    queryFn: () => fetchTeam({}),
  });
  const people = team.data ?? [];

  const leads = useMemo(
    () => people.filter((p) => p.kind === "lead").sort((a, b) => a.display_order - b.display_order),
    [people]
  );
  const membersByLead = useMemo(() => {
    const map = new Map<string, TeamPersonRecord[]>();
    for (const p of people.filter((x) => x.kind === "member")) {
      const key = p.lead_id ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.display_order - b.display_order);
    return map;
  }, [people]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: teamKeys.creator });
    void queryClient.invalidateQueries({ queryKey: teamKeys.public });
  }

  const [removalError, setRemovalError] = useState<string | null>(null);

  const removal = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      setConfirm(null);
      setRemovalError(null);
      refresh();
    },
    onError: (err: Error) => {
      console.error("Failed to remove team member:", err);
      setRemovalError(err.message || "Failed to remove team member.");
    },
  });

  const move = useMutation({
    mutationFn: (ids: string[]) => reorder({ data: { ids } }),
    onSuccess: refresh,
  });

  function shift(list: TeamPersonRecord[], index: number, delta: number) {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    move.mutate(next.map((p) => p.id));
  }

  function openEdit(person: TeamPersonRecord) {
    setEditing(toDraft(person));
    setEditingPhoto(person.drive_photo_file_id);
  }

  function openAdd(kind: "lead" | "member", leadId?: string, team?: string) {
    setEditing({
      kind,
      name: "",
      role: kind === "lead" ? "" : "Member",
      team: team ?? (kind === "lead" ? "Leadership" : "Photography"),
      rank: kind === "lead" ? "lead" : "member",
      leadId: leadId ?? null,
      bio: "",
      skills: "",
      displayOrder: 99,
      published: true,
      instagramUrl: null,
    });
    setEditingPhoto(null);
  }

  const unassigned = membersByLead.get("unassigned") ?? [];

  return (
    <Panel label="Manage team" onClose={onClose} wide embedded={embedded}>
      <div className="mb-6 flex flex-wrap gap-3">
        <button type="button" className={btnGhost} onClick={() => openAdd("member")}>
          + Add team member
        </button>
        <button type="button" className={btnGhost} onClick={() => openAdd("lead")}>
          + Add leadership role
        </button>
      </div>

      {team.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading team…</p>
      ) : team.isError ? (
        <p className="text-sm text-secondary">
          Unable to load team members.{" "}
          {team.error instanceof Error ? team.error.message : "Please try again."}
        </p>
      ) : people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      ) : (
        <div className="space-y-4">
          {leads.map((lead, leadIndex) => {
            const members = membersByLead.get(lead.id) ?? [];
            return (
              <div key={lead.id} className="border border-border">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="label-caps text-primary">{lead.role}</p>
                    <p className="font-display text-lg font-bold uppercase">
                      {lead.name}
                      {lead.published ? null : (
                        <span className="label-caps ml-3 text-muted-foreground">Unpublished</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`Move ${lead.name} up`}
                      className={btnGhost}
                      disabled={move.isPending}
                      onClick={() => shift(leads, leadIndex, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${lead.name} down`}
                      className={btnGhost}
                      disabled={move.isPending}
                      onClick={() => shift(leads, leadIndex, 1)}
                    >
                      ↓
                    </button>
                    <button type="button" className={btnGhost} onClick={() => openEdit(lead)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => {
                        setRemovalError(null);
                        setConfirm(lead);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <ul className="divide-y divide-border border-t border-border">
                  {members.map((m, index) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-4 bg-surface-low/50 py-3 pr-4 pl-8"
                    >
                      <div>
                        <p className="text-sm text-foreground">
                          ├── {m.name}
                          {m.published ? null : (
                            <span className="label-caps ml-3 text-muted-foreground">
                              Unpublished
                            </span>
                          )}
                        </p>
                        <p className="label-caps mt-1 text-muted-foreground">{m.role}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-label={`Move ${m.name} up`}
                          className={btnGhost}
                          disabled={move.isPending}
                          onClick={() => shift(members, index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${m.name} down`}
                          className={btnGhost}
                          disabled={move.isPending}
                          onClick={() => shift(members, index, 1)}
                        >
                          ↓
                        </button>
                        <button type="button" className={btnGhost} onClick={() => openEdit(m)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() => {
                            setRemovalError(null);
                            setConfirm(m);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                  <li className="p-3 pl-8">
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => openAdd("member", lead.id, lead.team)}
                    >
                      + Add member to {lead.role}
                    </button>
                  </li>
                </ul>
              </div>
            );
          })}

          {unassigned.length ? (
            <div className="border border-border">
              <p className="label-caps p-4 text-muted-foreground">No lead assigned</p>
              <ul className="divide-y divide-border border-t border-border">
                {unassigned.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-3 pl-8"
                  >
                    <p className="text-sm">
                      {m.name} · <span className="text-muted-foreground">{m.role}</span>
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className={btnGhost} onClick={() => openEdit(m)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => {
                          setRemovalError(null);
                          setConfirm(m);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {editing ? (
        <PersonForm
          draft={editing}
          leads={leads}
          existingPhotoId={editingPhoto}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          embedded={embedded}
        />
      ) : null}

      {confirm ? (
        <Panel
          label="Remove team member?"
          onClose={() => {
            setConfirm(null);
            setRemovalError(null);
          }}
          embedded={embedded}
        >
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <span className="text-foreground">{confirm.name}</span>{" "}
            from the {confirm.team} team? Their photo is deleted from Google Drive.
          </p>
          {removalError ? (
            <p
              role="alert"
              className="mt-4 border border-secondary bg-secondary/10 px-3 py-2 text-sm text-secondary"
            >
              {removalError}
            </p>
          ) : null}
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setConfirm(null);
                setRemovalError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="label-caps border border-secondary px-5 py-3 text-secondary transition-colors hover:bg-secondary hover:text-background disabled:opacity-50"
              disabled={removal.isPending}
              onClick={() => removal.mutate(confirm.id)}
            >
              {removal.isPending ? "Removing…" : "Remove member"}
            </button>
          </div>
        </Panel>
      ) : null}
    </Panel>
  );
}
