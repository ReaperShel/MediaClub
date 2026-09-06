/**
 * Client-safe Google Drive media types and URL helpers.
 * No credentials, no server imports — safe to use in components.
 */

export type DriveMediaKind = "image" | "video";

export type DriveMedia = {
  id: string;
  name: string;
  mimeType: string;
  kind: DriveMediaKind;
  modifiedTime: string | null;
  /** Portrait/landscape hint when Drive reports dimensions. */
  orientation: "portrait" | "landscape";
};

export type ArchiveEvent = {
  /** Google Drive folder ID of the event folder. */
  id: string;
  name: string;
  coverFileId: string | null;
  photoCount: number;
  videoCount: number;
  modifiedTime: string | null;
};

export type ArchiveEventDetail = {
  event: { id: string; name: string } | null;
  photos: DriveMedia[];
  videos: DriveMedia[];
  hasPhotosFolder: boolean;
  hasVideosFolder: boolean;
};

export type DriveResult<T> = { unavailable: boolean } & T;

export type TeamRolePhoto = {
  role: string;
  fileId: string | null;
};

export const MEDIA_UNAVAILABLE_MESSAGE =
  "Media is temporarily unavailable. Please check back shortly.";

/**
 * Public URL for a Drive file. Bytes are proxied by the server, so the browser
 * never sees Google credentials and cannot address files outside the archive.
 */
export function driveMediaUrl(fileId: string, variant: "thumb" | "full" = "full"): string {
  return `/api/public/drive/${encodeURIComponent(fileId)}${variant === "thumb" ? "?v=thumb" : ""}`;
}

/** Human-friendly title from a Drive filename. */
export function driveTitle(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .trim() || name
  );
}
