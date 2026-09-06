import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { VideoCard } from "@/components/cards";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { LazyImage } from "@/components/lazy-image";
import { contentKeys, contentService } from "@/lib/content/service";
import { formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/videos/$videoId")({
  head: () => ({
    meta: [
      { title: "Watch — Media Club" },
      {
        name: "description",
        content: "Watch a film, interview or event film produced by the college Media Club.",
      },
      { property: "og:title", content: "Watch — Media Club" },
      {
        property: "og:description",
        content: "Moving image work from the Media Club film division.",
      },
    ],
  }),
  component: VideoDetail,
});

function VideoDetail() {
  const { videoId } = Route.useParams();

  const one = useQuery({
    queryKey: contentKeys.video(videoId),
    queryFn: () => contentService.getVideo(videoId),
  });
  const all = useQuery({
    queryKey: contentKeys.videos,
    queryFn: contentService.listVideos,
  });

  const video = one.data;
  const related = (all.data ?? [])
    .filter((v) => v.id !== videoId && v.category === video?.category)
    .slice(0, 3);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <Link to="/videos" className="label-caps text-muted-foreground hover:text-primary">
          ← Videos
        </Link>
      </div>

      {one.isLoading ? (
        <div className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
          <SkeletonGrid count={2} className="lg:grid-cols-2" />
        </div>
      ) : one.isError ? (
        <div className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
          <ErrorState onRetry={() => one.refetch()} />
        </div>
      ) : !video ? (
        <div className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
          <EmptyState title="Video not found" description="This film is no longer published." />
        </div>
      ) : (
        <>
          <article className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
            {video.videoUrl ? (
              <div className="aspect-video w-full border border-border bg-surface-low">
                <iframe
                  src={video.videoUrl}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <LazyImage
                src={video.thumbnail}
                alt={`${video.title} thumbnail`}
                aspect="aspect-video"
                className="border border-border"
                eager
              />
            )}

            <span className="label-caps mt-8 block text-primary">
              {titleCase(video.category)} · {video.duration}
            </span>
            <h1 className="mt-3 display-title text-4xl md:text-6xl">{video.title}</h1>
            <p className="label-caps mt-4 text-muted-foreground">
              {video.creator} · {formatDate(video.date)}
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed font-light text-muted-foreground">
              {video.description}
            </p>
            {video.eventId ? (
              <Link
                to="/photos/$eventId"
                params={{ eventId: video.eventId }}
                className="label-caps mt-8 inline-block border border-primary px-8 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Stills from this event
              </Link>
            ) : null}
          </article>

          {related.length ? (
            <section className="border-t border-border bg-surface/40 px-5 py-16 md:px-8">
              <div className="mx-auto max-w-7xl">
                <h2 className="mb-10 font-display text-2xl font-bold tracking-tight uppercase">
                  More like this
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </SiteShell>
  );
}
