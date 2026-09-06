import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteShell } from "@/components/site-shell";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/coverflow-carousel";
import { driveKeys, listSectionMedia } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";
import { useMediaViewer, type MediaItem } from "@/components/media-viewer";

export const Route = createFileRoute("/highlights/")({
  head: () => ({
    meta: [
      { title: "Highlights — Media Club" },
      {
        name: "description",
        content: "Standout frames, films and moments selected by the college Media Club.",
      },
      { property: "og:title", content: "Highlights — Media Club" },
      {
        property: "og:description",
        content: "A curated reel of the club's best work.",
      },
    ],
  }),
  component: HighlightsIndex,
});

function HighlightsIndex() {
  const { open } = useMediaViewer();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: driveKeys.section("HIGHLIGHTS"),
    queryFn: () => listSectionMedia({ data: { section: "HIGHLIGHTS" } }),
  });

  const media = data?.media ?? [];
  const unavailable = isError || data?.unavailable;

  const imageMedia = useMemo<MediaItem[]>(() => {
    return media
      .filter((m) => m.kind === "image")
      .map((m) => {
        const base = {
          id: m.id,
          type: "image" as const,
          url: driveMediaUrl(m.id),
          title: driveTitle(m.name),
        };
        if (!m.modifiedTime) return base;
        return {
          ...base,
          subtitle: formatDate(m.modifiedTime),
          date: formatDate(m.modifiedTime),
        };
      });
  }, [media]);

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 02</p>
          <h1 className="display-title text-4xl md:text-6xl">Highlights</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            The frames and films the club keeps coming back to.
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
          ) : media.length === 0 ? (
            <EmptyState
              title="No highlights available yet."
              description="Files added to the HIGHLIGHTS folder appear here automatically."
            />
          ) : (
            <CoverflowCarousel
              slides={imageMedia.map((m, i): CoverflowSlide => {
                const base = {
                  id: m.id,
                  title: m.title,
                  image: m.url,
                  onClick: () => open(imageMedia, i),
                };
                if (!m.subtitle) return base;
                return { ...base, subtitle: m.subtitle };
              })}
              aspectRatio="3/2"
            />
          )}
        </div>
      </section>
    </SiteShell>
  );
}
