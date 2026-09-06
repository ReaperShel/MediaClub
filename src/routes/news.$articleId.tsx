import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { LazyImage } from "@/components/lazy-image";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { driveKeys, listSectionMedia } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/news/$articleId")({
  head: () => ({
    meta: [
      { title: "Story — Media Club Campus News" },
      {
        name: "description",
        content: "A story published by the college Media Club.",
      },
      { property: "og:title", content: "Story — Media Club Campus News" },
      {
        property: "og:description",
        content: "A story published by the club's editorial desk.",
      },
    ],
  }),
  component: ArticleDetail,
});

function ArticleDetail() {
  const { articleId } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: driveKeys.section("NEWS"),
    queryFn: () => listSectionMedia({ data: { section: "NEWS" } }),
  });

  const item = (data?.media ?? []).find((m) => m.id === articleId) ?? null;
  const unavailable = isError || data?.unavailable;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link to="/news" className="label-caps text-muted-foreground hover:text-primary">
          ← Campus news
        </Link>
      </div>

      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          {isLoading ? (
            <SkeletonGrid count={1} />
          ) : unavailable ? (
            <>
              <ErrorState onRetry={() => refetch()} />
              <p className="mt-4 text-center text-sm font-light text-muted-foreground">
                {MEDIA_UNAVAILABLE_MESSAGE}
              </p>
            </>
          ) : !item ? (
            <EmptyState
              title="Story not found"
              description="This file is no longer in the news folder."
            />
          ) : (
            <>
              {item.kind === "image" ? (
                <LazyImage
                  src={driveMediaUrl(item.id)}
                  alt={driveTitle(item.name)}
                  aspect={item.orientation === "portrait" ? "aspect-4/5" : "aspect-3/2"}
                  className="border border-border"
                  eager
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  className="aspect-video w-full border border-border bg-black"
                  src={driveMediaUrl(item.id)}
                  controls
                  preload="metadata"
                  playsInline
                />
              )}
              <h1 className="mt-8 display-title text-3xl md:text-5xl">{driveTitle(item.name)}</h1>
              {item.modifiedTime ? (
                <p className="label-caps mt-4 text-muted-foreground">
                  {formatDate(item.modifiedTime)}
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
