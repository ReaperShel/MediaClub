/**
 * Public Archive Timeline — server function.
 *
 * Fetches all Google Drive sections and normalises them into a single
 * chronological timeline. Uses the existing `drive.functions.ts` /
 * `drive.server.ts` services — no second Drive integration, no new table,
 * no copy of Drive content into Supabase.
 *
 * Every value comes from real Drive metadata:
 *   - Events: real folder names + modified times from the EVENTS/ folder
 *   - Standalone media: real filenames + modified times from the
 *     HIGHLIGHTS/, NEWS/ and VIDEOS/ folders
 *
 * If a piece of media has no usable date, it is placed in the
 * "Undated" group rather than fabricated.
 */
import { createServerFn } from "@tanstack/react-start";
import type { ArchiveEvent, DriveMedia, DriveResult } from "@/lib/drive/media";

export type ArchiveCategory = "photos" | "highlights" | "videos" | "news";

export type ArchiveEntryKind = "event" | "standalone";

/** A single photo / clip / article in the timeline. */
export type ArchiveItem = {
  id: string;
  category: ArchiveCategory;
  title: string;
  /** Public proxied URL, or null when no thumbnail exists. */
  thumbnail: string | null;
  /** Public proxied URL to the full media, for the MediaViewer. */
  mediaUrl: string | null;
  kind: "image" | "video";
};

/** A group of related content shown as one timeline row. */
export type ArchiveEntry = {
  /** Stable client-side id for the row. */
  id: string;
  /** Discriminator: Drive event folder vs. standalone media group. */
  kind: ArchiveEntryKind;
  /** Title shown in the timeline. */
  title: string;
  /**
   * Best-known chronological anchor for the row.
   * Year+month+day are derived from this; "undated" rows have null.
   */
  date: string | null;
  /** Sorted-by source order (newest first). */
  year: number | "undated";
  /**
   * Sub-label displayed next to the title — e.g. an event folder name
   * (which is the same as title for event rows) or a category hint.
   */
  subLabel: string;
  /**
   * Representative thumbnail for the row (first available media cover).
   */
  thumbnail: string | null;
  /** True if this row has at least one photo category. */
  hasPhotos: boolean;
  /** True if this row has at least one highlights category. */
  hasHighlights: boolean;
  /** True if this row has at least one videos category. */
  hasVideos: boolean;
  /** True if this row has at least one news category. */
  hasNews: boolean;
  /** Photo count for the row (event folder's photoCount). */
  photoCount: number;
  /** Video count for the row (event folder's videoCount). */
  videoCount: number;
  /**
   * Items belonging to the row, normalised. Up to 6 representative
   * items are included for the expanded preview; the full set is not
   * shipped with the timeline to keep payloads light.
   */
  items: ArchiveItem[];
  /**
   * Destination URL for the row's primary action (the event folder).
   * Null for standalone media that has no folder destination.
   */
  destination: string | null;
};

export type ArchiveTimeline = {
  unavailable: boolean;
  entries: ArchiveEntry[];
  /** Year+month+day+title tuple of every entry, newest first. */
  yearRange: { earliest: number | null; latest: number | null };
  /** Counts per category across the whole archive. */
  totals: Record<ArchiveCategory, number>;
};

function toYear(d: string | null | undefined): number | "undated" {
  if (!d) return "undated";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "undated";
  return new Date(t).getUTCFullYear();
}

function buildEventEntry(ev: ArchiveEvent, items: ArchiveItem[]): ArchiveEntry {
  const hasPhotos = ev.photoCount > 0;
  const hasVideos = ev.videoCount > 0;
  // Events from Drive do not currently expose highlights/news counts,
  // so those remain false until Drive is enriched.
  return {
    id: `event:${ev.id}`,
    kind: "event",
    title: ev.name,
    date: ev.modifiedTime ?? null,
    year: toYear(ev.modifiedTime),
    subLabel:
      hasPhotos && hasVideos
        ? "Event folder"
        : hasPhotos
          ? "Photo event"
          : hasVideos
            ? "Video event"
            : "Event folder",
    thumbnail: ev.coverFileId
      ? `/api/public/drive/${encodeURIComponent(ev.coverFileId)}?v=thumb`
      : null,
    hasPhotos,
    hasHighlights: false,
    hasVideos,
    hasNews: false,
    photoCount: ev.photoCount,
    videoCount: ev.videoCount,
    items,
    destination: `/photos/${encodeURIComponent(ev.id)}`,
  };
}

function buildStandaloneGroup(
  category: ArchiveCategory,
  bucket: DriveMedia[]
): ArchiveEntry | null {
  if (bucket.length === 0) return null;

  // Group all media in a standalone section under one row per category.
  // The "title" is the section name; the row's date is the newest item.
  const sorted = [...bucket].sort((a, b) => {
    const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
    const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
    return tb - ta;
  });

  const newest = sorted[0];
  const sample = sorted.slice(0, 6);
  const items: ArchiveItem[] = sample.map((m) => ({
    id: m.id,
    category,
    title:
      m.name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim() || m.name,
    thumbnail: `/api/public/drive/${encodeURIComponent(m.id)}?v=thumb`,
    mediaUrl: `/api/public/drive/${encodeURIComponent(m.id)}`,
    kind: m.kind,
  }));

  const labelMap: Record<ArchiveCategory, string> = {
    photos: "Photos",
    highlights: "Highlights",
    videos: "Videos & Clips",
    news: "Campus News",
  };

  return {
    id: `standalone:${category}`,
    kind: "standalone",
    title: labelMap[category],
    date: newest?.modifiedTime ?? null,
    year: toYear(newest?.modifiedTime),
    subLabel: `${bucket.length} ${labelMap[category].toLowerCase()}`,
    thumbnail: items[0]?.thumbnail ?? null,
    hasPhotos: category === "photos",
    hasHighlights: category === "highlights",
    hasVideos: category === "videos",
    hasNews: category === "news",
    photoCount: category === "photos" ? bucket.length : 0,
    videoCount: category === "videos" ? bucket.length : 0,
    items,
    destination: null,
  };
}

export const getArchiveTimeline = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArchiveTimeline> => {
    const empty: ArchiveTimeline = {
      unavailable: false,
      entries: [],
      yearRange: { earliest: null, latest: null },
      totals: { photos: 0, highlights: 0, videos: 0, news: 0 },
    };

    let events: ArchiveEvent[] = [];
    let highlights: DriveMedia[] = [];
    let news: DriveMedia[] = [];
    let videos: DriveMedia[] = [];
    let unavailable = false;

    try {
      const drive = await import("@/lib/drive.server");
      const [evRes, hiRes, newsRes, vRes] = await Promise.all([
        drive.listEvents(),
        drive.listSection("HIGHLIGHTS").catch(() => {
          unavailable = true;
          return [] as DriveMedia[];
        }),
        drive.listSection("NEWS").catch(() => {
          unavailable = true;
          return [] as DriveMedia[];
        }),
        drive.listSection("VIDEOS").catch(() => {
          unavailable = true;
          return [] as DriveMedia[];
        }),
      ]);
      events = evRes;
      highlights = hiRes;
      news = newsRes;
      videos = vRes;
    } catch (err) {
      console.error("[archive] drive unavailable", err);
      return { ...empty, unavailable: true };
    }

    const entries: ArchiveEntry[] = [];

    for (const ev of events) {
      if (ev.photoCount === 0 && ev.videoCount === 0) continue;
      entries.push(buildEventEntry(ev, []));
    }

    const highlightRow = buildStandaloneGroup("highlights", highlights);
    if (highlightRow) entries.push(highlightRow);
    const newsRow = buildStandaloneGroup("news", news);
    if (newsRow) entries.push(newsRow);
    const videosRow = buildStandaloneGroup("videos", videos);
    if (videosRow) entries.push(videosRow);

    entries.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : -Infinity;
      const tb = b.date ? new Date(b.date).getTime() : -Infinity;
      if (ta !== tb) return tb - ta;
      return a.title.localeCompare(b.title);
    });

    const yearRange: ArchiveTimeline["yearRange"] = {
      earliest: null,
      latest: null,
    };
    for (const e of entries) {
      if (typeof e.year === "number") {
        if (yearRange.earliest === null || e.year < yearRange.earliest) {
          yearRange.earliest = e.year;
        }
        if (yearRange.latest === null || e.year > yearRange.latest) {
          yearRange.latest = e.year;
        }
      }
    }

    const totals: Record<ArchiveCategory, number> = {
      photos: events.reduce((sum, e) => sum + e.photoCount, 0),
      highlights: highlights.length,
      videos: videos.length + events.reduce((sum, e) => sum + e.videoCount, 0),
      news: news.length,
    };

    return { unavailable, entries, yearRange, totals };
  }
);
