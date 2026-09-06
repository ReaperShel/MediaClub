/**
 * Team server functions.
 *
 * - listPublicTeam is public and read-only (published people only).
 * - Every creator function verifies the Creator Mode session server-side
 *   before touching the database or Google Drive.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { reorderSchema, teamPersonSchema } from "./team.schema";
import type { PublicTeamData, PublicTeamPerson, TeamPersonRecord, TeamRank } from "./team.schema";

const idSchema = z.object({ id: z.string().uuid() });

export const teamKeys = {
  public: ["team", "public"] as const,
  creator: ["creator", "team"] as const,
};

export const listPublicTeam = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicTeamData> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    if (!key || !url) throw new Error("Supabase URL or Publishable key not configured.");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data, error } = await client
      .from("team_people")
      .select(
        "id,kind,name,role,team,rank,lead_id,bio,skills,display_order,published,drive_photo_file_id,instagram_url"
      )
      .eq("published", true)
      .order("display_order", { ascending: true });
    if (error) {
      console.error("[team] listPublicTeam", error.message);
      return { leads: [], members: [] };
    }

    const rows = (data ?? []) as unknown as (TeamPersonRecord & {
      kind: "lead" | "member";
    })[];

    // Leads without a stored photo keep the original behaviour: the first image
    // found in their TEAM/<ROLE>/ Drive folder.
    const fallback = new Map<string, string>();
    if (rows.some((r) => r.kind === "lead" && !r.drive_photo_file_id)) {
      try {
        const drive = await import("./drive.server");
        for (const entry of await drive.listTeamPhotos()) {
          if (entry.fileId) fallback.set(entry.role.toUpperCase(), entry.fileId);
        }
      } catch (driveError) {
        console.error("[team] drive fallback unavailable", driveError);
      }
    }

    const toPerson = (r: TeamPersonRecord): PublicTeamPerson => ({
      id: r.id,
      name: r.name,
      role: r.role,
      team: r.team,
      rank: r.rank as TeamRank,
      bio: r.bio,
      skills: r.skills ?? [],
      order: r.display_order,
      photoFileId: r.drive_photo_file_id ?? fallback.get(r.role.trim().toUpperCase()) ?? null,
      instagramUrl: r.instagram_url ?? null,
    });

    return {
      leads: rows.filter((r) => r.kind === "lead").map(toPerson),
      members: rows.filter((r) => r.kind === "member").map(toPerson),
    };
  }
);

/** Creator-only: the full hierarchy, including unpublished people. */
export const creatorListTeam = createServerFn({ method: "GET" }).handler(
  async (): Promise<TeamPersonRecord[]> => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { listTeamPeople } = await import("./team.server");
    return listTeamPeople();
  }
);

export const creatorSaveTeamPerson = createServerFn({ method: "POST" })
  .validator((input: unknown) => teamPersonSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { saveTeamPerson } = await import("./team.server");
    return saveTeamPerson(data);
  });

export const creatorDeleteTeamPerson = createServerFn({ method: "POST" })
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { deleteTeamPerson } = await import("./team.server");
    return deleteTeamPerson(data.id);
  });

export const creatorReorderTeam = createServerFn({ method: "POST" })
  .validator((input: unknown) => reorderSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();
    const { reorderTeamPeople } = await import("./team.server");
    return reorderTeamPeople(data.ids);
  });
