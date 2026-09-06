/**
 * Featured Story / Editor's Pick — server functions.
 *
 * Public read access: anyone can fetch the current featured content.
 * Mutations: restricted to Creator Mode (requireCreator).
 *
 * The table stores at most one active record. The set mutation replaces
 * any existing record rather than inserting duplicates.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DriveUnavailableError } from "@/lib/drive.server";
import { driveMediaUrl, driveTitle, type ArchiveEvent, type DriveMedia } from "@/lib/drive/media";

const setSchema = z
  .object({
    content_type: z.enum(["photos", "highlights", "videos", "news"]),
    content_id: z.string().min(1),
    custom_title: z.string().max(200).nullable().optional(),
    custom_excerpt: z.string().max(1000).nullable().optional(),
    image_url: z
      .string()
      .max(2000)
      .refine((v) => v === "" || /^https?:\/\//.test(v), "Enter a valid image URL")
      .nullable()
      .optional(),
  })
  .strict();

const FEATURED_ROW_ID = "current";

export type FeaturedContent = {
  id: string;
  content_type: "photos" | "highlights" | "videos" | "news";
  content_id: string;
  custom_title: string | null;
  custom_excerpt: string | null;
  image_url: string | null;
  updated_at: string;
};

export type ContentItem = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  date: string;
};

export const getFeaturedContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedContent | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("featured_content")
      .select("*")
      .eq("id", FEATURED_ROW_ID)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      content_type: data.content_type as FeaturedContent["content_type"],
      content_id: data.content_id,
      custom_title: data.custom_title,
      custom_excerpt: data.custom_excerpt,
      image_url: data.image_url,
      updated_at: data.updated_at,
    };
  }
);

export const setFeaturedContent = createServerFn({ method: "POST" })
  .validator((data: unknown) => setSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireCreator } = await import("./creator.server");
    await requireCreator();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      id: FEATURED_ROW_ID,
      content_type: data.content_type,
      content_id: data.content_id,
      custom_title: data.custom_title || null,
      custom_excerpt: data.custom_excerpt || null,
      image_url: data.image_url && data.image_url.length > 0 ? data.image_url : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("featured_content")
      .upsert(payload, { onConflict: "id" });

    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const removeFeaturedContent = createServerFn({ method: "POST" }).handler(async () => {
  const { requireCreator } = await import("./creator.server");
  await requireCreator();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { error } = await supabaseAdmin.from("featured_content").delete().eq("id", FEATURED_ROW_ID);

  if (error) throw new Error(error.message);

  return { ok: true };
});

export const listContentItems = createServerFn({ method: "GET" })
  .validator(
    z.object({
      content_type: z.enum(["photos", "highlights", "videos", "news"]),
    })
  )
  .handler(async ({ data }): Promise<ContentItem[]> => {
    const { content_type } = data;

    try {
      if (content_type === "photos") {
        const drive = await import("@/lib/drive.server");
        const events: ArchiveEvent[] = await drive.listEvents();
        return events
          .filter((e) => e.photoCount > 0 || e.videoCount > 0)
          .map((e) => ({
            id: e.id,
            title: driveTitle(e.name),
            description: `${e.photoCount} photos · ${e.videoCount} videos`,
            coverImage: e.coverFileId ? driveMediaUrl(e.coverFileId) : "",
            date: e.modifiedTime ?? "",
          }));
      }

      if (content_type === "highlights") {
        const drive = await import("@/lib/drive.server");
        const media: DriveMedia[] = await drive.listSection("HIGHLIGHTS");
        return media
          .filter((m) => m.kind === "image")
          .map((m) => ({
            id: m.id,
            title: driveTitle(m.name),
            description: "",
            coverImage: driveMediaUrl(m.id),
            date: m.modifiedTime ?? "",
          }));
      }

      if (content_type === "videos") {
        const drive = await import("@/lib/drive.server");
        const media: DriveMedia[] = await drive.listSection("VIDEOS");
        return media
          .filter((m) => m.kind === "video")
          .map((m) => ({
            id: m.id,
            title: driveTitle(m.name),
            description: "",
            coverImage: driveMediaUrl(m.id),
            date: m.modifiedTime ?? "",
          }));
      }

      const drive = await import("@/lib/drive.server");
      const media: DriveMedia[] = await drive.listSection("NEWS");
      return media
        .filter((m) => m.kind === "image")
        .map((m) => ({
          id: m.id,
          title: driveTitle(m.name),
          description: "",
          coverImage: driveMediaUrl(m.id),
          date: m.modifiedTime ?? "",
        }));
    } catch (error) {
      if (error instanceof DriveUnavailableError) {
        return [];
      }
      throw error;
    }
  });
