import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { SearchInput } from "@/components/filter-bar";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/coverflow-carousel";
import { driveKeys, listArchiveEvents } from "@/lib/drive.functions";
import { driveMediaUrl, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { ArchiveEventCard } from "@/components/cards";

export const Route = createFileRoute("/photos/")({
  head: () => ({
    meta: [
      { title: "Photo Archive — Media Club" },
      {
        name: "description",
        content:
          "Every Media Club photo assignment, organised by event — festivals, sports, ceremonies and campus life.",
      },
      { property: "og:title", content: "Photo Archive — Media Club" },
      {
        property: "og:description",
        content: "Browse the club's complete photographic archive by event.",
      },
    ],
  }),
  component: PhotosIndex,
});

function PhotosIndex() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: driveKeys.events,
    queryFn: () => listArchiveEvents(),
  });
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => (data?.events ?? []).filter((e) => e.photoCount > 0 || e.videoCount > 0),
    [data?.events]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => q === "" || e.name.toLowerCase().includes(q));
  }, [events, search]);

  const unavailable = isError || data?.unavailable;

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 01</p>
          <h1 className="display-title text-4xl md:text-6xl">Photo Archive</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            Every assignment the club has photographed, catalogued by event.
          </p>
        </div>
      </section>

      {isLoading ? (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <SkeletonGrid />
          </div>
        </section>
      ) : unavailable ? (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <ErrorState onRetry={() => refetch()} />
            <p className="mt-4 text-center text-sm font-light text-muted-foreground">
              {MEDIA_UNAVAILABLE_MESSAGE}
            </p>
          </div>
        </section>
      ) : events.length === 0 ? (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <EmptyState
              title="No photos available yet."
              description="Events appear here as soon as their folders hold photographs."
            />
          </div>
        </section>
      ) : (
        <>
          {events.length > 0 ? (
            <section className="border-b border-border bg-surface/40 px-5 py-16 md:px-8">
              <div className="mx-auto max-w-7xl">
                <p className="label-caps mb-2 text-primary">Featured Events</p>
                <h2 className="mb-10 font-display text-2xl font-bold tracking-tight uppercase md:text-3xl">
                  Browse the Archive
                </h2>
                <CoverflowCarousel
                  slides={events.map((e): CoverflowSlide => ({
                    id: e.id,
                    title: e.name,
                    subtitle: `${e.photoCount} frames · ${e.videoCount} videos`,
                    image: e.coverFileId ? driveMediaUrl(e.coverFileId) : "",
                    onClick: () =>
                      navigate({
                        to: "/photos/$eventId",
                        params: { eventId: e.id },
                      }),
                  }))}
                  aspectRatio="3/2"
                />
              </div>
            </section>
          ) : null}

          <section className="px-5 py-16 md:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-3xl font-bold tracking-tight uppercase">
                  Event Archive
                </h2>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  label="Search events"
                  placeholder="Search events"
                />
              </div>

              {filtered.length === 0 ? (
                <EmptyState title="No events found" description="Try a different search term." />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((e) => (
                    <ArchiveEventCard key={e.id} event={e} to="photos" />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </SiteShell>
  );
}
