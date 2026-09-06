/**
 * Shared archive search index — plain, serializable data structures and
 * pure search logic. Used by both the Archive Timeline and Archive Search.
 *
 * The search index is built from real Google Drive data via
 * `drive.server.ts` — no mock content, no duplicate sources.
 */
import type { ArchiveEvent, ArchiveEventDetail, DriveMedia } from "@/lib/drive/media";
import { driveTitle, driveMediaUrl } from "@/lib/drive/media";

export type SearchResultKind = "event" | "photo" | "highlight" | "video" | "news";

export type SearchableItem = {
  id: string;
  kind: SearchResultKind;
  /** e.g. "TedX 2024", "Cam 02", "Campus News" */
  title: string;
  /** Associated event name, if this item belongs to an event folder. */
  eventName: string | null;
  /** Searchable category label. */
  category: "photos" | "highlights" | "videos" | "news";
  /** Public proxied thumbnail URL, or null. */
  thumbnail: string | null;
  /** Public proxied media URL, for MediaViewer. */
  mediaUrl: string | null;
  /** ISO string or null. */
  date: string | null;
  /** Derived from date, or "undated". */
  year: number | "undated";
  /** Destination URL for event-level results, or null for standalone items. */
  destination: string | null;
  /** Counts for event-level results. */
  photoCount: number;
  videoCount: number;
  /** Individual file name from Drive (for standalone items). */
  fileDisplayName: string | null;
  /** Normalized searchable text blob. */
  searchText: string;
};

export type ArchiveSearchIndex = {
  unavailable: boolean;
  /** All searchable items, flat. */
  items: SearchableItem[];
  /** Distinct years present in the data, sorted descending. */
  years: (number | "undated")[];
  /** Totals per category. */
  totals: Record<"photos" | "highlights" | "videos" | "news", number>;
};

/**
 * Normalize text for case-insensitive, punctuation-tolerant, whitespace-tolerant
 * matching. Does NOT mutate the original display values.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the normalization function result for a single item.
 * Concatenates all searchable fields into one normalized blob.
 */
export function buildSearchText(item: {
  title: string;
  eventName: string | null;
  category: string;
  fileDisplayName: string | null;
}): string {
  const parts: string[] = [
    item.title,
    item.eventName ?? "",
    item.category,
    item.fileDisplayName ?? "",
  ];
  return normalizeSearchText(parts.join(" "));
}

/**
 * Rank a match for a given query. Returns a higher number = better match.
 * Ranking order:
 *   1. exact title match
 *   2. title starts with query
 *   3. title contains query
 *   4. event name contains query
 *   5. other searchable text (category, filename, etc.)
 */
export function rankMatch(item: SearchableItem, query: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const titleNorm = normalizeSearchText(item.title);
  if (titleNorm === q) return 100;
  if (titleNorm.startsWith(q)) return 90;
  if (titleNorm.includes(q)) return 80;

  const eventNorm = item.eventName ? normalizeSearchText(item.eventName) : null;
  if (eventNorm && eventNorm.includes(q)) return 70;

  if (item.searchText.includes(q)) return 50;
  return 0;
}

/**
 * Filter a search index by query string, category, and year.
 * Returns items sorted by relevance (highest rank first).
 */
export function searchIndex(
  index: ArchiveSearchIndex,
  query: string,
  category: "all" | "photos" | "highlights" | "videos" | "news",
  year: number | "undated" | "all"
): SearchableItem[] {
  const q = normalizeSearchText(query);
  if (!q) {
    return index.items.filter((item) => matchesFilters(item, category, year));
  }

  return index.items
    .filter((item) => {
      if (!matchesFilters(item, category, year)) return false;
      const score = rankMatch(item, q);
      return score > 0;
    })
    .sort((a, b) => rankMatch(b, q) - rankMatch(a, q));
}

function matchesCategory(
  item: SearchableItem,
  category: "all" | "photos" | "highlights" | "videos" | "news"
): boolean {
  if (category === "all") return true;
  return item.category === category;
}

function matchesYear(item: SearchableItem, year: number | "undated" | "all"): boolean {
  if (year === "all") return true;
  return item.year === year;
}

function matchesFilters(
  item: SearchableItem,
  category: "all" | "photos" | "highlights" | "videos" | "news",
  year: number | "undated" | "all"
): boolean {
  return matchesCategory(item, category) && matchesYear(item, year);
}

/**
 * Build a SearchableItem for an event-level result.
 */
export function buildEventItem(ev: ArchiveEvent): SearchableItem {
  const title = ev.name.trim();
  const year = ev.modifiedTime ? new Date(ev.modifiedTime).getUTCFullYear() : "undated";
  return {
    id: `event:${ev.id}`,
    kind: "event",
    title,
    eventName: null,
    category: "photos",
    thumbnail: ev.coverFileId ? driveMediaUrl(ev.coverFileId, "thumb") : null,
    mediaUrl: null,
    date: ev.modifiedTime ?? null,
    year,
    destination: `/photos/${encodeURIComponent(ev.id)}`,
    photoCount: ev.photoCount,
    videoCount: ev.videoCount,
    fileDisplayName: null,
    searchText: buildSearchText({
      title,
      eventName: null,
      category: "photos",
      fileDisplayName: null,
    }),
  };
}

/**
 * Build SearchableItems for individual media within a section.
 */
export function buildMediaItems(
  media: DriveMedia[],
  category: "highlights" | "videos" | "news",
  sectionTitle: string,
  destination: string | null
): SearchableItem[] {
  return media.map((m): SearchableItem => {
    const title = driveTitle(m.name);
    const year = m.modifiedTime ? new Date(m.modifiedTime).getUTCFullYear() : "undated";
    return {
      id: `media:${m.id}`,
      kind:
        category === "videos"
          ? "video"
          : category === "news"
            ? "news"
            : category === "highlights"
              ? "highlight"
              : "photo",
      title,
      eventName: null,
      category,
      thumbnail: driveMediaUrl(m.id, "thumb"),
      mediaUrl: driveMediaUrl(m.id),
      date: m.modifiedTime ?? null,
      year,
      destination,
      photoCount: 0,
      videoCount: 0,
      fileDisplayName: m.name,
      searchText: buildSearchText({
        title,
        eventName: sectionTitle,
        category: sectionTitle,
        fileDisplayName: m.name,
      }),
    };
  });
}

/**
 * Build SearchableItems for photos/videos within an event folder.
 * These are individual file-level results under an event.
 */
export function buildEventMediaItems(
  detail: ArchiveEventDetail,
  event: ArchiveEvent
): SearchableItem[] {
  const year = event.modifiedTime ? new Date(event.modifiedTime).getUTCFullYear() : "undated";
  const dest = `/photos/${encodeURIComponent(event.id)}`;
  const items: SearchableItem[] = [];

  for (const photo of detail.photos) {
    const title = driveTitle(photo.name);
    items.push({
      id: `event-photo:${event.id}:${photo.id}`,
      kind: "photo",
      title,
      eventName: event.name.trim(),
      category: "photos",
      thumbnail: driveMediaUrl(photo.id, "thumb"),
      mediaUrl: driveMediaUrl(photo.id),
      date: photo.modifiedTime ?? null,
      year,
      destination: dest,
      photoCount: 0,
      videoCount: 0,
      fileDisplayName: photo.name,
      searchText: buildSearchText({
        title,
        eventName: event.name,
        category: "photos",
        fileDisplayName: photo.name,
      }),
    });
  }

  for (const video of detail.videos) {
    const title = driveTitle(video.name);
    items.push({
      id: `event-video:${event.id}:${video.id}`,
      kind: "video",
      title,
      eventName: event.name.trim(),
      category: "videos",
      thumbnail: driveMediaUrl(video.id, "thumb"),
      mediaUrl: driveMediaUrl(video.id),
      date: video.modifiedTime ?? null,
      year,
      destination: dest,
      photoCount: 0,
      videoCount: 0,
      fileDisplayName: video.name,
      searchText: buildSearchText({
        title,
        eventName: event.name,
        category: "videos",
        fileDisplayName: video.name,
      }),
    });
  }

  return items;
}
