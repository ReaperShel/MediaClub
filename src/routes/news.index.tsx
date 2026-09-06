import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/coverflow-carousel";
import { driveKeys, listSectionMedia } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Campus News — Media Club" },
      {
        name: "description",
        content: "Reporting, features and press coverage published by the college Media Club.",
      },
      { property: "og:title", content: "Campus News — Media Club" },
      {
        property: "og:description",
        content: "Read the club's latest campus reporting and press coverage.",
      },
    ],
  }),
  component: NewsIndex,
});

function NewsIndex() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: driveKeys.section("NEWS"),
    queryFn: () => listSectionMedia({ data: { section: "NEWS" } }),
  });

  const media = data?.media ?? [];
  const unavailable = isError || data?.unavailable;

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 04</p>
          <h1 className="display-title text-4xl md:text-6xl">Campus News</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            Coverage and features published by the club's editorial desk.
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
              title="No news available yet."
              description="Files added to the NEWS folder appear here automatically."
            />
          ) : (
            <CoverflowCarousel
              slides={media
                .filter((m) => m.kind === "image")
                .map((m): CoverflowSlide => ({
                  id: m.id,
                  title: driveTitle(m.name),
                  image: driveMediaUrl(m.id),
                  onClick: () =>
                    navigate({
                      to: "/news/$articleId",
                      params: { articleId: m.id },
                    }),
                  ...(m.modifiedTime ? { subtitle: formatDate(m.modifiedTime) } : {}),
                }))}
              aspectRatio="3/2"
            />
          )}
        </div>
      </section>
    </SiteShell>
  );
}
