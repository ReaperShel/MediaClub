import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { SearchInput } from "@/components/filter-bar";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/coverflow-carousel";
import { driveKeys, listArchiveEvents, listSectionMedia } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";
import { useMediaViewer, type MediaItem } from "@/components/media-viewer";

export const Route = createFileRoute("/videos/")({
  head: () => ({
    meta: [
      { title: "Videos & Clips — Media Club" },
      {
        name: "description",
        content:
          "Films, event coverage, interviews, reels and behind-the-scenes work from the college Media Club.",
      },
      { property: "og:title", content: "Videos & Clips — Media Club" },
      {
        property: "og:description",
        content: "Watch the club's films, aftermovies, interviews and student projects.",
      },
    ],
  }),
  component: VideosIndex,
});

function VideosIndex() {
  const navigate = useNavigate();
  const { open } = useMediaViewer();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: driveKeys.events,
    queryFn: () => listArchiveEvents(),
  });
  const clipsQuery = useQuery({
    queryKey: driveKeys.section("VIDEOS"),
    queryFn: () => listSectionMedia({ data: { section: "VIDEOS" } }),
  });
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => (data?.events ?? []).filter((e) => e.videoCount > 0),
    [data?.events]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => q === "" || e.name.toLowerCase().includes(q));
  }, [events, search]);

  const clips = useMemo(
    () => (clipsQuery.data?.media ?? []).filter((m) => m.kind === "video"),
    [clipsQuery.data?.media]
  );

  const clipItems = useMemo<MediaItem[]>(() => {
    return clips.map((m) => {
      const base = {
        id: m.id,
        type: "video" as const,
        url: driveMediaUrl(m.id),
        title: driveTitle(m.name),
      };
      if (!m.modifiedTime) return base;
      return { ...base, date: formatDate(m.modifiedTime) };
    });
  }, [clips]);

  const unavailable = isError || data?.unavailable;

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 03</p>
          <h1 className="display-title text-4xl md:text-6xl">Videos &amp; Clips</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            Moving image work from the club's film division, grouped by event.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          {isLoading ? (
            <SkeletonGrid />
          ) : unavailable ? (
            <>
              <ErrorState onRetry={() => refetch()} />
              <p className="mt-4 text-center text-sm font-light text-muted-foreground">
                {MEDIA_UNAVAILABLE_MESSAGE}
              </p>
            </>
          ) : events.length === 0 && clips.length === 0 ? (
            <EmptyState
              title="No videos available yet."
              description="Clips added to the VIDEOS folder — or to an event's VIDEOS folder — appear here automatically."
            />
          ) : (
            <>
              {events.length > 0 ? (
                <>
                  <div className="mb-10 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-3xl font-bold tracking-tight uppercase">
                      Video Archive
                    </h2>
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      label="Search events"
                      placeholder="Search events"
                    />
                  </div>
                  {filtered.length === 0 ? (
                    <EmptyState
                      title="No events found"
                      description="Try a different search term."
                    />
                  ) : (
                    <CoverflowCarousel
                      slides={filtered.map((e): CoverflowSlide => ({
                        id: e.id,
                        title: e.name,
                        subtitle: `${e.videoCount} videos`,
                        image: e.coverFileId ? driveMediaUrl(e.coverFileId) : "",
                        onClick: () =>
                          navigate({
                            to: "/videos/event/$eventId",
                            params: { eventId: e.id },
                          }),
                      }))}
                      aspectRatio="3/2"
                    />
                  )}
                </>
              ) : null}

              {clips.length > 0 ? (
                <div className={events.length > 0 ? "mt-20" : ""}>
                  <div className="mb-10 border-b border-border pb-6">
                    <h2 className="font-display text-3xl font-bold tracking-tight uppercase">
                      Clips
                    </h2>
                    <p className="mt-2 text-sm font-light text-muted-foreground">
                      Standalone films and clips from the club's VIDEOS folder.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {clips.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => open(clipItems, i)}
                        className="archive-frame overflow-hidden text-left"
                      >
                        <div className="relative flex aspect-video w-full items-center justify-center bg-surface-low">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/30 bg-background/50 backdrop-blur-sm transition-transform duration-300 hover:scale-110 hover:border-primary">
                            <svg
                              className="ml-0.5 h-5 w-5 fill-current"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
                            </svg>
                          </span>
                        </div>
                        <div className="p-5">
                          <h3 className="font-display text-xl font-bold uppercase">
                            {driveTitle(m.name)}
                          </h3>
                          {m.modifiedTime ? (
                            <p className="mt-2 text-xs tracking-wider text-muted-foreground uppercase">
                              {formatDate(m.modifiedTime)}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
