/**
 * Content service — the single data access boundary for the public site.
 * Currently backed by the local dataset; swapping this module for a
 * database-backed implementation requires no UI changes.
 */
import { events, highlights, news, photos, teamLeads, teamMembers, videos } from "./data";
import type {
  ClubEvent,
  Highlight,
  NewsArticle,
  Photo,
  TeamLead,
  TeamMember,
  Video,
} from "@/lib/types";

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 120));

const isPublished = <T extends { published: boolean }>(rows: T[]) =>
  rows.filter((r) => r.published);

const byDateDesc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

export const contentService = {
  listEvents: () =>
    delay(isPublished(events).sort((a, b) => byDateDesc(a.date, b.date)) as ClubEvent[]),

  getEvent: (id: string) => delay(isPublished(events).find((e) => e.id === id) ?? null),

  listPhotos: (eventId?: string) =>
    delay(isPublished(photos).filter((p) => (eventId ? p.eventId === eventId : true)) as Photo[]),

  listHighlights: () =>
    delay(isPublished(highlights).sort((a, b) => byDateDesc(a.date, b.date)) as Highlight[]),

  getHighlight: (id: string) => delay(isPublished(highlights).find((h) => h.id === id) ?? null),

  listVideos: () =>
    delay(isPublished(videos).sort((a, b) => byDateDesc(a.date, b.date)) as Video[]),

  getVideo: (id: string) => delay(isPublished(videos).find((v) => v.id === id) ?? null),

  listNews: () =>
    delay(
      isPublished(news).sort((a, b) =>
        byDateDesc(a.publishedDate, b.publishedDate)
      ) as NewsArticle[]
    ),

  getArticle: (id: string) => delay(isPublished(news).find((a) => a.id === id) ?? null),

  listTeam: () =>
    delay({
      leads: isPublished(teamLeads).sort((a, b) => a.order - b.order) as TeamLead[],
      members: isPublished(teamMembers).sort((a, b) => a.order - b.order) as TeamMember[],
    }),
};

export const contentKeys = {
  events: ["events"] as const,
  event: (id: string) => ["events", id] as const,
  photos: (eventId?: string) => ["photos", eventId ?? "all"] as const,
  highlights: ["highlights"] as const,
  highlight: (id: string) => ["highlights", id] as const,
  videos: ["videos"] as const,
  video: (id: string) => ["videos", id] as const,
  news: ["news"] as const,
  article: (id: string) => ["news", id] as const,
  team: ["team"] as const,
};
