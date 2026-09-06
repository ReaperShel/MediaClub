import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { driveKeys, getArchiveEvent } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/videos/event/$eventId")({
  head: () => ({
    meta: [
      { title: "Event Videos — Media Club" },
      {
        name: "description",
        content: "Video coverage from a Media Club event assignment.",
      },
      { property: "og:title", content: "Event Videos — Media Club" },
      {
        property: "og:description",
        content: "Watch the club's video coverage from this event.",
      },
    ],
  }),
  component: EventVideos,
});

function EventVideos() {
  const { eventId } = Route.useParams();
  const query = useQuery({
    queryKey: driveKeys.event(eventId),
    queryFn: () => getArchiveEvent({ data: { eventId } }),
  });
  const [playing, setPlaying] = useState<string | null>(null);

  const data = query.data;
  const event = data?.event ?? null;
  const videos = data?.videos ?? [];
  const unavailable = query.isError || data?.unavailable;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link to="/videos" className="label-caps text-muted-foreground hover:text-primary">
          ← Video archive
        </Link>
      </div>

      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          {query.isLoading ? (
            <SkeletonGrid count={3} />
          ) : unavailable ? (
            <>
              <ErrorState onRetry={() => query.refetch()} />
              <p className="mt-4 text-center text-sm font-light text-muted-foreground">
                {MEDIA_UNAVAILABLE_MESSAGE}
              </p>
            </>
          ) : !event ? (
            <EmptyState
              title="Event not found"
              description="This event folder is no longer in the archive."
            />
          ) : (
            <>
              <div className="mb-12 border-b border-border pb-8">
                <span className="label-caps text-primary">Videos</span>
                <h1 className="mt-3 display-title text-4xl md:text-6xl">{event.name}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <p className="label-caps text-muted-foreground">{videos.length} videos</p>
                  <Link
                    to="/photos/$eventId"
                    params={{ eventId: event.id }}
                    className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    View photos
                  </Link>
                </div>
              </div>

              {videos.length === 0 ? (
                <EmptyState
                  title="No videos available yet."
                  description="Add footage to this event's VIDEOS folder and it appears here."
                />
              ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {videos.map((v) => (
                    <article key={v.id} className="archive-frame overflow-hidden">
                      {playing === v.id ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          className="aspect-video w-full bg-black"
                          src={driveMediaUrl(v.id)}
                          controls
                          autoPlay
                          preload="metadata"
                          playsInline
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPlaying(v.id)}
                          className="group relative flex aspect-video w-full items-center justify-center bg-surface-low"
                          aria-label={`Play ${driveTitle(v.name)}`}
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-foreground/30 bg-background/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:border-primary motion-reduce:transition-none">
                            <svg
                              className="ml-1 h-6 w-6 fill-current"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
                            </svg>
                          </span>
                        </button>
                      )}
                      <div className="p-5">
                        <h3 className="font-display text-xl font-bold uppercase">
                          {driveTitle(v.name)}
                        </h3>
                        {v.modifiedTime ? (
                          <p className="mt-2 text-xs tracking-wider text-muted-foreground uppercase">
                            {formatDate(v.modifiedTime)}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
