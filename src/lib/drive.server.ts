/**
 * Server-only Google Drive access layer.
 *
 * Security model:
 * - Uses official Google Drive API v3 authenticated via Google Service Account credentials.
 * - Credentials never reach the browser.
 * - Every read is confined to the MEDIA CLUB root folder and its descendants.
 */
import { createSign } from "node:crypto";
import type {
  ArchiveEvent,
  ArchiveEventDetail,
  DriveMedia,
  TeamRolePhoto,
} from "@/lib/drive/media";

const GATEWAY = "https://www.googleapis.com/drive/v3";
const UPLOAD_GATEWAY = "https://www.googleapis.com/upload/drive/v3";

const IMAGE_MIMES = /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i;
const VIDEO_MIMES = /^video\//i;

export const TEAM_ROLES = [
  "PRESIDENT",
  "VICE PRESIDENT",
  "VIDEOGRAPHY LEAD",
  "PHOTOGRAPHY LEAD",
  "TECH LEAD",
] as const;

export type DriveSection = "HIGHLIGHTS" | "NEWS" | "VIDEOS";

export class DriveUnavailableError extends Error {}

type RawFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
  imageMediaMetadata?: { width?: number; height?: number };
  videoMediaMetadata?: { width?: number; height?: number };
};

/* ----------------------------------------------------------- auth & token - */

async function getAccessToken(serviceAccountJsonStr: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJsonStr);
  const { client_email, private_key, token_uri } = serviceAccount;
  if (!client_email || !private_key) {
    throw new DriveUnavailableError("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: client_email,
    scope:
      "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
    aud: token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: unknown) => {
    return Buffer.from(JSON.stringify(obj)).toString("base64url");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const sign = createSign("RSA-SHA256");
  sign.update(`${encodedHeader}.${encodedPayload}`);

  const formattedPrivateKey = private_key.replace(/\\n/g, "\n");
  const signature = sign.sign(formattedPrivateKey, "base64url");

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

  const response = await fetch(token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain Google access token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getCachedAccessToken(): Promise<string> {
  const serviceAccountJson = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  if (!serviceAccountJson) {
    throw new DriveUnavailableError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");
  }

  if (cachedAccessToken && cachedTokenExpiry > Date.now() + 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const token = await getAccessToken(serviceAccountJson);
  cachedAccessToken = token;
  cachedTokenExpiry = Date.now() + 55 * 60 * 1000;
  return token;
}

/* -------------------------------------------------------------- config ---- */

export function extractFolderId(val: string): string {
  const trimmed = val.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) return fileMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return trimmed;
}

function getEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new DriveUnavailableError(`${name} is not configured`);
  }
  return extractFolderId(value);
}

function config() {
  return {
    rootId: getEnv("MEDIA_CLUB_DRIVE_ROOT_ID"),
  };
}

/* --------------------------------------------------------------- cache ---- */

type Entry = { value: unknown; expires: number };
let cache: Map<string, Entry> | undefined;

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  cache ??= new Map();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);
  return load().then((value) => {
    cache!.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  });
}

/** Listings live 60s so Drive additions/removals surface quickly. */
const LIST_TTL = 60_000;
/** Folder ancestry is structural; safe to hold longer. */
const ANCESTRY_TTL = 10 * 60_000;

/* ---------------------------------------------------------------- http ---- */

async function driveRequest(path: string, params: Record<string, string>): Promise<Response> {
  const token = await getCachedAccessToken();
  const url = new URL(`${GATEWAY}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function driveJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await driveRequest(path, params);
  if (!res.ok) {
    const body = await res.text();
    console.error(`[drive] ${path} failed [${res.status}]: ${body.slice(0, 500)}`);
    throw new DriveUnavailableError(`Drive request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function listChildren(parentId: string, extra: string, limit = 500): Promise<RawFile[]> {
  const files: RawFile[] = [];
  let pageToken: string | undefined;
  do {
    const params: Record<string, string> = {
      q: `'${parentId}' in parents and trashed=false${extra}`,
      fields:
        "nextPageToken,files(id,name,mimeType,modifiedTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height))",
      pageSize: String(Math.min(limit, 200)),
      orderBy: "name_natural",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    };
    if (pageToken) params["pageToken"] = pageToken;
    const page = await driveJson<{ files?: RawFile[]; nextPageToken?: string }>("/files", params);
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && files.length < limit);
  return files.slice(0, limit);
}

const FOLDERS_ONLY = " and mimeType='application/vnd.google-apps.folder'";
const NOT_FOLDER = " and mimeType!='application/vnd.google-apps.folder'";

async function childFolderId(parentId: string, name: string): Promise<string | null> {
  const folders = await listChildren(parentId, FOLDERS_ONLY);
  const match = folders.find((f) => f.name.trim().toUpperCase() === name.toUpperCase());
  return match?.id ?? null;
}

async function resolveFolderId(
  name: string,
  envVar: string,
  fallbackEnvVar?: string,
  alternativeName?: string
): Promise<string> {
  const envVal = process.env[envVar] || (fallbackEnvVar ? process.env[fallbackEnvVar] : undefined);
  if (envVal) return extractFolderId(envVal);

  const rootId = getEnv("MEDIA_CLUB_DRIVE_ROOT_ID");
  return cached(`folder:${name}`, ANCESTRY_TTL, async () => {
    let id = await childFolderId(rootId, name);
    if (!id && alternativeName) {
      id = await childFolderId(rootId, alternativeName);
    }
    if (!id) {
      throw new DriveUnavailableError(
        `Folder "${name}"${alternativeName ? ` or "${alternativeName}"` : ""} not found under root "${rootId}"`
      );
    }
    return id;
  });
}

function toMedia(file: RawFile): DriveMedia | null {
  const kind = IMAGE_MIMES.test(file.mimeType)
    ? "image"
    : VIDEO_MIMES.test(file.mimeType)
      ? "video"
      : null;
  if (!kind) return null;
  const meta = file.imageMediaMetadata ?? file.videoMediaMetadata;
  const portrait = !!meta?.width && !!meta.height && meta.height > meta.width;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    kind,
    modifiedTime: file.modifiedTime ?? null,
    orientation: portrait ? "portrait" : "landscape",
  };
}

async function listMediaIn(folderId: string, kind?: "image" | "video"): Promise<DriveMedia[]> {
  const files = await listChildren(folderId, NOT_FOLDER);
  return files.map(toMedia).filter((m): m is DriveMedia => !!m && (!kind || m.kind === kind));
}

/* ------------------------------------------------------------- queries ---- */

/** Direct child folders of EVENTS, with photo/video counts and a cover frame. */
export function listEvents(): Promise<ArchiveEvent[]> {
  return cached("events", LIST_TTL, async () => {
    const eventsId = await resolveFolderId(
      "EVENTS",
      "EVENTS_DRIVE_FOLDER_ID",
      "MEDIA_CLUB_DRIVE_EVENTS_ID"
    );
    const folders = await listChildren(eventsId, FOLDERS_ONLY);
    return Promise.all(
      folders.map(async (folder): Promise<ArchiveEvent> => {
        const detail = await eventDetail(folder.id, folder.name);
        return {
          id: folder.id,
          name: folder.name.trim(),
          coverFileId: detail.photos[0]?.id ?? null,
          photoCount: detail.photos.length,
          videoCount: detail.videos.length,
          modifiedTime: folder.modifiedTime ?? null,
        };
      })
    );
  });
}

async function eventDetail(folderId: string, name: string): Promise<ArchiveEventDetail> {
  const [photosFolder, videosFolder] = await Promise.all([
    childFolderId(folderId, "PHOTOS"),
    childFolderId(folderId, "VIDEOS"),
  ]);
  const [photos, videos] = await Promise.all([
    photosFolder ? listMediaIn(photosFolder, "image") : Promise.resolve([]),
    videosFolder ? listMediaIn(videosFolder, "video") : Promise.resolve([]),
  ]);
  return {
    event: { id: folderId, name: name.trim() },
    photos,
    videos,
    hasPhotosFolder: !!photosFolder,
    hasVideosFolder: !!videosFolder,
  };
}

/** One event's media. Only PHOTOS/ images and VIDEOS/ videos, never mixed. */
export function getEvent(eventFolderId: string): Promise<ArchiveEventDetail> {
  return cached(`event:${eventFolderId}`, LIST_TTL, async () => {
    const eventsId = await resolveFolderId(
      "EVENTS",
      "EVENTS_DRIVE_FOLDER_ID",
      "MEDIA_CLUB_DRIVE_EVENTS_ID"
    );
    const folders = await listChildren(eventsId, FOLDERS_ONLY);
    const folder = folders.find((f) => f.id === eventFolderId);
    if (!folder) {
      return {
        event: null,
        photos: [],
        videos: [],
        hasPhotosFolder: false,
        hasVideosFolder: false,
      };
    }
    return eventDetail(folder.id, folder.name);
  });
}

/** Media inside HIGHLIGHTS/, NEWS/ or the top-level VIDEOS/ folder. */
export function listSection(section: DriveSection): Promise<DriveMedia[]> {
  return cached(`section:${section}`, LIST_TTL, async () => {
    let folderId = "";
    if (section === "HIGHLIGHTS") {
      folderId = await resolveFolderId(
        "HIGHLIGHTS",
        "HIGHLIGHTS_DRIVE_FOLDER_ID",
        "MEDIA_CLUB_DRIVE_HIGHLIGHTS_ID"
      );
    } else if (section === "NEWS") {
      folderId = await resolveFolderId("NEWS", "NEWS_DRIVE_FOLDER_ID", "MEDIA_CLUB_DRIVE_NEWS_ID");
    } else {
      try {
        folderId = await resolveFolderId(
          "SITE ASSETS",
          "SITE_ASSETS_DRIVE_FOLDER_ID",
          "MEDIA_CLUB_DRIVE_VIDEOS_ID",
          "VIDEOS"
        );
      } catch (err) {
        console.warn("[drive] Site Assets/Videos folder could not be resolved:", err);
        return [];
      }
    }
    return listMediaIn(folderId);
  });
}

/** One photo per TEAM role folder (the first image found). */
export function listTeamPhotos(): Promise<TeamRolePhoto[]> {
  return cached("team", LIST_TTL, async () => {
    const teamId = await resolveFolderId(
      "TEAM",
      "TEAM_DRIVE_FOLDER_ID",
      "MEDIA_CLUB_DRIVE_TEAM_ID"
    );
    const folders = await listChildren(teamId, FOLDERS_ONLY);
    return Promise.all(
      TEAM_ROLES.map(async (role): Promise<TeamRolePhoto> => {
        const folder = folders.find((f) => f.name.trim().toUpperCase() === role);
        if (!folder) return { role, fileId: null };
        const images = await listMediaIn(folder.id, "image");
        return { role, fileId: images[0]?.id ?? null };
      })
    );
  });
}

/* -------------------------------------------------------------- streaming - */

/**
 * True only when the file is a descendant of the MEDIA CLUB root folder.
 * Prevents the media proxy from being used to read unrelated Drive files.
 */
export function isInsideArchive(fileId: string): Promise<boolean> {
  return cached(`ancestor:${fileId}`, ANCESTRY_TTL, async () => {
    const { rootId } = config();
    let current = fileId;
    for (let depth = 0; depth < 8; depth += 1) {
      const file = await driveJson<RawFile>(`/files/${encodeURIComponent(current)}`, {
        fields: "id,name,mimeType,parents",
        supportsAllDrives: "true",
      });
      const parent = file.parents?.[0];
      if (!parent) return false;
      if (parent === rootId) return true;
      current = parent;
    }
    return false;
  });
}

/** Proxy the raw bytes of an archive file, honouring Range for video seeking. */
export async function streamFile(fileId: string, range: string | null): Promise<Response> {
  const token = await getCachedAccessToken();
  const url = new URL(`${GATEWAY}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (range) headers["Range"] = range;

  const upstream = await fetch(url, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    const body = await upstream.text();
    console.error(`[drive] stream ${fileId} failed [${upstream.status}]: ${body.slice(0, 300)}`);
    throw new DriveUnavailableError(`Drive stream failed with status ${upstream.status}`);
  }

  const out = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) out.set(key, value);
  }
  out.set("accept-ranges", out.get("accept-ranges") ?? "bytes");
  // Media is public archive content, not user-specific.
  out.set("cache-control", "public, max-age=600, stale-while-revalidate=86400");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/* ----------------------------------------------------------------- writes -- */
/**
 * Creator-only Drive writes. These are reached exclusively from server
 * functions that call requireCreator() first — the browser never gets Drive
 * credentials and normal visitors stay read-only.
 */

async function driveMutate<T>(
  url: URL,
  init: { method: string; body?: BodyInit; contentType?: string }
): Promise<T> {
  const token = await getCachedAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (init.contentType) headers["Content-Type"] = init.contentType;
  const res = await fetch(url, {
    method: init.method,
    headers,
    ...(init.body === undefined ? {} : { body: init.body }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[drive] ${init.method} ${url.pathname} failed [${res.status}]: ${body.slice(0, 400)}`
    );
    throw new DriveUnavailableError(`Drive request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function apiUrl(path: string, params: Record<string, string> = {}, upload = false): URL {
  const url = new URL(`${upload ? UPLOAD_GATEWAY : GATEWAY}${path}`);
  url.searchParams.set("supportsAllDrives", "true");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

/** Drop cached listings so creator edits surface immediately. */
export function invalidateDriveCache(prefix?: string): void {
  if (!cache) return;
  if (!prefix) cache.clear();
  else for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}

/** Find (or create) a folder with `name` directly under `parentId`. */
export async function ensureChildFolder(parentId: string, name: string): Promise<string> {
  const existing = await childFolderId(parentId, name);
  if (existing) return existing;
  const created = await driveMutate<{ id: string }>(apiUrl("/files", { fields: "id" }), {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  invalidateDriveCache();
  return created.id;
}

/** The TEAM/<ROLE> folder for a leadership role, creating it when missing. */
export async function ensureTeamFolder(role: string): Promise<string> {
  const teamId = await resolveFolderId("TEAM", "TEAM_DRIVE_FOLDER_ID", "MEDIA_CLUB_DRIVE_TEAM_ID");
  return ensureChildFolder(teamId, role.trim().toUpperCase());
}

export type UploadedPhoto = { id: string; name: string; mimeType: string };

/** Upload image bytes into `folderId`. Metadata first, then the raw media. */
export async function uploadImage(
  folderId: string,
  filename: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<UploadedPhoto> {
  const created = await driveMutate<{ id: string }>(apiUrl("/files", { fields: "id" }), {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ name: filename, mimeType, parents: [folderId] }),
  });
  const uploaded = await driveMutate<UploadedPhoto>(
    apiUrl(
      `/files/${encodeURIComponent(created.id)}`,
      { uploadType: "media", fields: "id,name,mimeType" },
      true
    ),
    {
      method: "PATCH",
      contentType: mimeType,
      body: bytes as unknown as BodyInit,
    }
  );
  invalidateDriveCache();
  return {
    id: created.id,
    name: uploaded.name ?? filename,
    mimeType: uploaded.mimeType ?? mimeType,
  };
}

/** Permanently delete one Drive file or folder created by this integration. */
export async function deleteDriveItem(id: string): Promise<void> {
  try {
    await driveMutate<void>(apiUrl(`/files/${encodeURIComponent(id)}`), {
      method: "DELETE",
    });
  } catch (error) {
    // A photo that was already removed in Drive must not block the DB update.
    console.error("[drive] delete failed", error);
  }
  invalidateDriveCache();
}
