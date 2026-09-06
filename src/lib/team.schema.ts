/**
 * Client-safe team types and validation shared by the public team page and
 * Creator Mode. No server imports, no credentials.
 */
import { z } from "zod";

/** Teams a person can belong to. Extensible — stored as free text in the DB. */
export const TEAM_OPTIONS = ["Leadership", "Videography", "Photography", "Tech", "Other"] as const;

export const RANKS = ["president", "vice-president", "lead", "member"] as const;
export type TeamRank = (typeof RANKS)[number];

export type TeamPersonRecord = {
  id: string;
  kind: "lead" | "member";
  name: string;
  role: string;
  team: string;
  rank: TeamRank;
  lead_id: string | null;
  bio: string;
  skills: string[];
  display_order: number;
  published: boolean;
  drive_folder_id: string | null;
  drive_photo_file_id: string | null;
  drive_photo_name: string | null;
  drive_photo_mime: string | null;
  instagram_url: string | null;
};

/** Max encoded photo size accepted by the upload endpoint (~6 MB of base64). */
export const MAX_PHOTO_DATA_URL = 6_500_000;

export const teamPersonSchema = z
  .object({
    id: z.string().uuid().nullish(),
    kind: z.enum(["lead", "member"]),
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(120),
    team: z.string().trim().min(1).max(80),
    rank: z.enum(RANKS),
    leadId: z.string().uuid().nullish(),
    bio: z.string().max(2000).default(""),
    skills: z.array(z.string().trim().min(1).max(60)).max(24).default([]),
    displayOrder: z.number().int().min(0).max(999).default(0),
    published: z.boolean().default(true),
    instagramUrl: z
      .union([z.string().trim().max(200), z.literal(""), z.null()])
      .default(null)
      .transform((v) => {
        if (!v || v === "") return null;
        const trimmed = v.trim();
        if (trimmed.startsWith("@")) {
          const username = trimmed.slice(1).replace(/^@/, "").trim();
          if (!username) return null;
          return `https://www.instagram.com/${username}/`;
        }
        return trimmed;
      })
      .pipe(
        z.union([
          z.string().url("Please enter a valid Instagram profile URL."),
          z.literal(""),
          z.null(),
        ])
      )
      .refine((v) => !v || v.includes("instagram.com"), {
        message: "Please enter a valid Instagram profile URL.",
      }),
    photo: z
      .object({
        dataUrl: z.string().min(32).max(MAX_PHOTO_DATA_URL),
        filename: z.string().trim().min(1).max(200),
      })
      .nullish(),
    removePhoto: z.boolean().nullish(),
  })
  .strict();

export type TeamPersonInput = z.input<typeof teamPersonSchema>;

export const reorderSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict();

export type PublicTeamPerson = {
  id: string;
  name: string;
  role: string;
  team: string;
  rank: TeamRank;
  bio: string;
  skills: string[];
  order: number;
  photoFileId: string | null;
  instagramUrl: string | null;
};

export type PublicTeamData = {
  leads: PublicTeamPerson[];
  members: PublicTeamPerson[];
};
