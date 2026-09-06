/**
 * Public, read-only server functions exposing the Google Drive media archive.
 * Server-only Drive code is imported inside handlers so credentials never
 * enter the client bundle. Every handler degrades to an "unavailable" flag
 * instead of throwing, so pages stay functional when Drive is down.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  ArchiveEvent,
  ArchiveEventDetail,
  DriveMedia,
  DriveResult,
  TeamRolePhoto,
} from "@/lib/drive/media";

const sectionSchema = z.object({
  section: z.enum(["HIGHLIGHTS", "NEWS", "VIDEOS"]),
});
const eventSchema = z.object({ eventId: z.string().min(1).max(200) });

export const listArchiveEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriveResult<{ events: ArchiveEvent[] }>> => {
    try {
      const drive = await import("@/lib/drive.server");
      return { unavailable: false, events: await drive.listEvents() };
    } catch (error) {
      console.error("[drive] listArchiveEvents", error);
      return { unavailable: true, events: [] };
    }
  }
);

export const getArchiveEvent = createServerFn({ method: "GET" })
  .validator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data }): Promise<DriveResult<ArchiveEventDetail>> => {
    try {
      const drive = await import("@/lib/drive.server");
      return { unavailable: false, ...(await drive.getEvent(data.eventId)) };
    } catch (error) {
      console.error("[drive] getArchiveEvent", error);
      return {
        unavailable: true,
        event: null,
        photos: [],
        videos: [],
        hasPhotosFolder: false,
        hasVideosFolder: false,
      };
    }
  });

export const listSectionMedia = createServerFn({ method: "GET" })
  .validator((input: unknown) => sectionSchema.parse(input))
  .handler(async ({ data }): Promise<DriveResult<{ media: DriveMedia[] }>> => {
    try {
      const drive = await import("@/lib/drive.server");
      return {
        unavailable: false,
        media: await drive.listSection(data.section),
      };
    } catch (error) {
      console.error("[drive] listSectionMedia", error);
      return { unavailable: true, media: [] };
    }
  });

export const listTeamPhotos = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriveResult<{ roles: TeamRolePhoto[] }>> => {
    try {
      const drive = await import("@/lib/drive.server");
      return { unavailable: false, roles: await drive.listTeamPhotos() };
    } catch (error) {
      console.error("[drive] listTeamPhotos", error);
      return { unavailable: true, roles: [] };
    }
  }
);

export const driveKeys = {
  events: ["drive", "events"] as const,
  event: (id: string) => ["drive", "event", id] as const,
  section: (section: "HIGHLIGHTS" | "NEWS" | "VIDEOS") => ["drive", "section", section] as const,
  team: ["drive", "team"] as const,
};
