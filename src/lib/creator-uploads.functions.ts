/**
 * Creator image upload — server functions.
 *
 * Server-side endpoint that issues a short-lived signed upload URL for
 * Supabase Storage. The browser uses that URL to PUT the file directly
 * to Storage — the File object NEVER crosses a TanStack/Seroval boundary.
 *
 * Only creators (requireCreator) can request a signed URL. The signed
 * URL itself is single-use and expires within minutes, so even if it
 * leaks the upload window is small.
 *
 * All creator uploads go into a single shared bucket:
 *   media-club-assets
 * with subfolders:
 *   featured-story/   — Editor's Pick covers
 *   event-posters/    — Club event posters
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "media-club-assets";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const folderSchema = z.enum(["featured-story", "event-posters"]);

const inputSchema = z.object({
  folder: folderSchema,
  contentType: z.string().refine((v) => ALLOWED_TYPES.has(v), "Unsupported image type"),
  size: z.number().int().positive().max(MAX_BYTES, "Image is larger than 5 MB"),
  ext: z.string().min(1).max(8),
});

function extFromType(mime: string): string {
  return EXT_MAP[mime] ?? "bin";
}

export const createCreatorUploadUrl = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      bucket: string;
      path: string;
      token: string;
      publicUrl: string;
    }> => {
      const { requireCreator } = await import("./creator.server");
      await requireCreator();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const ext = data.ext || extFromType(data.contentType);
      const objectPath = `${data.folder}/${crypto.randomUUID()}.${ext}`;

      const { data: signed, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(objectPath);

      if (error || !signed) {
        throw new Error(error?.message ?? "Failed to create upload URL");
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);

      return {
        bucket: BUCKET,
        path: objectPath,
        token: signed.token,
        publicUrl: publicUrlData.publicUrl,
      };
    }
  );

export { BUCKET as CREATOR_UPLOAD_BUCKET };
