/**
 * Public Archive Search — server function.
 *
 * Builds a flat, JSON-serializable search index from real Google Drive data.
 * Reuses the same `drive.server.ts` data sources as Archive Timeline —
 * no duplicate Drive integration, no mock content.
 *
 * The index includes:
 *   - Event-level results (event folder name + photo/video counts)
 *   - Individual media items within events (photos, videos)
 *   - Standalone media from HIGHLIGHTS/, NEWS/, VIDEOS/ sections
 */
import { createServerFn } from "@tanstack/react-start";
import type { ArchiveEvent } from "@/lib/drive/media";
import {
  buildEventItem,
  buildEventMediaItems,
  buildMediaItems,
  type ArchiveSearchIndex,
  type SearchableItem,
} from "@/lib/archive-search-core";

const SECTION_TITLES: Record<"highlights" | "videos" | "news", string> = {
  highlights: "Highlights",
  videos: "Videos & Clips",
  news: "Campus News",
};

const SECTION_DESTINATIONS: Record<"highlights" | "videos" | "news", string | null> = {
  highlights: "/highlights",
  videos: "/videos",
  news: "/news",
};

export const getArchiveSearchIndex = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArchiveSearchIndex> => {
    const empty: ArchiveSearchIndex = {
      unavailable: false,
      items: [],
      years: [],
      totals: { photos: 0, highlights: 0, videos: 0, news: 0 },
    };

    let events: ArchiveEvent[] = [];
    let highlights: SearchableItem[] = [];
    let news: SearchableItem[] = [];
    let videos: SearchableItem[] = [];
    let unavailable = false;

    try {
      const drive = await import("@/lib/drive.server");

      // Fetch event folders (these have photo/video counts)
      events = await drive.listEvents();

      // Fetch standalone section media
      const [hiRes, newsRes, vRes] = await Promise.all([
        drive.listSection("HIGHLIGHTS").catch(() => {
          unavailable = true;
          return [];
        }),
        drive.listSection("NEWS").catch(() => {
          unavailable = true;
          return [];
        }),
        drive.listSection("VIDEOS").catch(() => {
          unavailable = true;
          return [];
        }),
      ]);

      highlights = buildMediaItems(
        hiRes,
        "highlights",
        SECTION_TITLES.highlights,
        SECTION_DESTINATIONS.highlights
      );
      news = buildMediaItems(newsRes, "news", SECTION_TITLES.news, SECTION_DESTINATIONS.news);
      videos = buildMediaItems(vRes, "videos", SECTION_TITLES.videos, SECTION_DESTINATIONS.videos);
    } catch (err) {
      console.error("[archive-search] drive unavailable", err);
      return { ...empty, unavailable: true };
    }

    // Fetch individual event media (photos + videos per event folder)
    const items: SearchableItem[] = [];

    for (const ev of events) {
      if (ev.photoCount === 0 && ev.videoCount === 0) continue;

      // Event-level result
      items.push(buildEventItem(ev));

      // Individual media items within the event
      try {
        const drive = await import("@/lib/drive.server");
        const detail = await drive.getEvent(ev.id);
        items.push(...buildEventMediaItems(detail, ev));
      } catch (err) {
        console.warn(`[archive-search] could not fetch event detail for ${ev.id}`, err);
      }
    }

    // Add standalone section items
    items.push(...highlights);
    items.push(...news);
    items.push(...videos);

    // Compute distinct years
    const yearSet = new Set<number>();
    let hasUndated = false;
    for (const item of items) {
      if (typeof item.year === "number") yearSet.add(item.year);
      if (item.year === "undated") hasUndated = true;
    }
    const years: (number | "undated")[] = [...yearSet].sort((a, b) => b - a);
    if (hasUndated) years.push("undated");

    // Compute totals
    const totals = {
      photos: items.filter((i) => i.category === "photos").length,
      highlights: items.filter((i) => i.category === "highlights").length,
      videos: items.filter((i) => i.category === "videos").length,
      news: items.filter((i) => i.category === "news").length,
    };

    return { unavailable, items, years, totals };
  }
);
