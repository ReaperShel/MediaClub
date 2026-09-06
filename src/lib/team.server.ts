/**
 * Server-only team management.
 *
 * Google Drive stays the source of truth for team photographs: only Drive
 * folder/file IDs and metadata land in the database, never image bytes. Every
 * function here is reached from a server function that calls requireCreator()
 * first, so Drive writes are impossible for normal visitors.
 */
import type { TeamPersonRecord } from "./team.schema";
import { teamPersonSchema } from "./team.schema";
import type { z } from "zod";

type Input = z.output<typeof teamPersonSchema>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const SELECT_WITH_INSTAGRAM =
  "id,kind,name,role,team,rank,lead_id,bio,skills,display_order,published,drive_folder_id,drive_photo_file_id,drive_photo_name,drive_photo_mime,instagram_url";
const SELECT_LEGACY =
  "id,kind,name,role,team,rank,lead_id,bio,skills,display_order,published,drive_folder_id,drive_photo_file_id,drive_photo_name,drive_photo_mime";

async function selectAll(
  db: ReturnType<typeof admin> extends Promise<infer T> ? T : ReturnType<typeof admin>
) {
  try {
    const { data, error } = await db
      .from("team_people")
      .select(SELECT_WITH_INSTAGRAM)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TeamPersonRecord[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("instagram_url") && message.includes("does not exist")) {
      const { data, error } = await db
        .from("team_people")
        .select(SELECT_LEGACY)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as TeamPersonRecord[];
      return rows.map((r) => ({ ...r, instagram_url: null }));
    }
    throw err;
  }
}

export async function listTeamPeople(): Promise<TeamPersonRecord[]> {
  const db = await admin();
  const rows = await selectAll(db);
  return rows;
}

async function getPerson(id: string): Promise<TeamPersonRecord | null> {
  const db = await admin();
  try {
    const { data } = await db
      .from("team_people")
      .select(SELECT_WITH_INSTAGRAM)
      .eq("id", id)
      .maybeSingle();
    return (data ?? null) as unknown as TeamPersonRecord | null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("instagram_url") && message.includes("does not exist")) {
      const { data } = await db
        .from("team_people")
        .select(SELECT_LEGACY)
        .eq("id", id)
        .maybeSingle();
      const row = (data ?? null) as TeamPersonRecord | null;
      if (row && !row.instagram_url) {
        return { ...row, instagram_url: null };
      }
      return row;
    }
    throw err;
  }
}

/** MIME + bytes from a browser data URL, restricted to still images. */
function decodePhoto(dataUrl: string): { mimeType: string; bytes: Uint8Array } {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Unsupported photo format.");
  const mimeType = match[1]!.toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mimeType)) {
    throw new Error("Photos must be JPEG, PNG or WebP.");
  }
  const bytes = Uint8Array.from(Buffer.from(match[2]!, "base64"));
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error("Photo must be under 6 MB.");
  return { mimeType, bytes };
}

function safeName(name: string, mimeType: string): string {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const slug =
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "photo";
  return `${slug}.${ext}`;
}

/**
 * The Drive folder a person's photo belongs in:
 *   leads   → TEAM/<ROLE>/
 *   members → TEAM/<THEIR LEAD'S ROLE>/<MEMBER NAME>/
 * Folders are created on demand, matching the existing TEAM/ layout.
 */
async function folderForPerson(person: {
  kind: "lead" | "member";
  name: string;
  role: string;
  team: string;
  lead_id: string | null;
}): Promise<string> {
  const drive = await import("./drive.server");
  if (person.kind === "lead") return drive.ensureTeamFolder(person.role);

  const lead = person.lead_id ? await getPerson(person.lead_id) : null;
  const parentRole = lead?.role ?? `${person.team} LEAD`;
  const parent = await drive.ensureTeamFolder(parentRole);
  return drive.ensureChildFolder(parent, person.name.trim().toUpperCase());
}

export async function saveTeamPerson(input: Input): Promise<{ id: string }> {
  const db = await admin();
  const row: Record<string, unknown> = {
    kind: input.kind,
    name: input.name,
    role: input.role,
    team: input.team,
    rank: input.kind === "lead" ? input.rank : "member",
    lead_id: input.kind === "member" ? (input.leadId ?? null) : null,
    bio: input.bio ?? "",
    skills: input.skills ?? [],
    display_order: input.displayOrder ?? 0,
    published: input.published,
    instagram_url: input.instagramUrl ?? null,
  };

  let id = input.id ?? null;
  const previous = id ? await getPerson(id) : null;

  if (id) {
    const { error } = await db
      .from("team_people")
      .update(row as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db
      .from("team_people")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = (data as { id: string }).id;
  }

  const drive = await import("./drive.server");

  if (input.photo) {
    const { mimeType, bytes } = decodePhoto(input.photo.dataUrl);
    const folderId = await folderForPerson({
      kind: input.kind,
      name: input.name,
      role: input.role,
      team: input.team,
      lead_id: input.kind === "member" ? (input.leadId ?? null) : null,
    });
    const uploaded = await drive.uploadImage(
      folderId,
      safeName(input.photo.filename, mimeType),
      mimeType,
      bytes
    );
    // Avoid orphaned files: the replaced photo is removed from Drive.
    if (previous?.drive_photo_file_id && previous.drive_photo_file_id !== uploaded.id) {
      await drive.deleteDriveItem(previous.drive_photo_file_id);
    }
    const { error } = await db
      .from("team_people")
      .update({
        drive_folder_id: folderId,
        drive_photo_file_id: uploaded.id,
        drive_photo_name: uploaded.name,
        drive_photo_mime: uploaded.mimeType,
      } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else if (input.removePhoto && previous?.drive_photo_file_id) {
    await drive.deleteDriveItem(previous.drive_photo_file_id);
    const { error } = await db
      .from("team_people")
      .update({
        drive_photo_file_id: null,
        drive_photo_name: null,
        drive_photo_mime: null,
      } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  drive.invalidateDriveCache("team");
  return { id: id! };
}

/**
 * Delete a person. Their photo is removed from Drive, and for members the
 * per-member folder too. Role folders (PRESIDENT/, PHOTOGRAPHY LEAD/, …) are
 * never deleted, so the shared Drive layout stays intact.
 */
export async function deleteTeamPerson(id: string): Promise<{ ok: true }> {
  const db = await admin();
  const person = await getPerson(id);
  if (!person) {
    // No matching row — nothing to delete. Treat as success so the UI can
    // refresh, but signal that zero rows were affected.
    return { ok: true };
  }

  const drive = await import("./drive.server");
  if (person.drive_photo_file_id) {
    try {
      await drive.deleteDriveItem(person.drive_photo_file_id);
    } catch (e) {
      console.error("Failed to delete Drive photo:", e);
    }
  }
  if (person.kind === "member" && person.drive_folder_id) {
    try {
      await drive.deleteDriveItem(person.drive_folder_id);
    } catch (e) {
      console.error("Failed to delete Drive folder:", e);
    }
  }

  const { data: deletedRows, error } = await db
    .from("team_people")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message);
  }
  if (!deletedRows || deletedRows.length === 0) {
    throw new Error("No team member was deleted. The row may have already been removed.");
  }
  drive.invalidateDriveCache("team");
  return { ok: true };
}

/** Persist a creator-defined order; `ids` is the desired sequence. */
export async function reorderTeamPeople(ids: string[]): Promise<{ ok: true }> {
  const db = await admin();
  for (const [index, id] of ids.entries()) {
    const { error } = await db
      .from("team_people")
      .update({ display_order: index } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}
