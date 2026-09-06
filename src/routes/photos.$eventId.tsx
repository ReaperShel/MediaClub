import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteShell } from "@/components/site-shell";
import { PhotoGallery } from "@/components/photo-gallery";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { LazyImage } from "@/components/lazy-image";
import { driveKeys, getArchiveEvent } from "@/lib/drive.functions";
import { driveMediaUrl, driveTitle, MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";
import { formatDate } from "@/lib/format";
import type { ClubEvent, Photo } from "@/lib/types";

export const Route = createFileRoute("/photos/$eventId")({
  head: () => ({
    meta: [
      { title: "Event Gallery — Media Club Photo Archive" },
      {
        name: "description",
        content: "Photographs from a Media Club event assignment.",
      },
      {
        property: "og:title",
        content: "Event Gallery — Media Club Photo Archive",
      },
      {
        property: "og:description",
        content: "Browse the full set of photographs from this club assignment.",
      },
    ],
  }),
  component: EventGallery,
});

function EventGallery() {
  const { eventId } = Route.useParams();

  const query = useQuery({
    queryKey: driveKeys.event(eventId),
    queryFn: () => getArchiveEvent({ data: { eventId } }),
  });

  const data = query.data;
  const event = data?.event ?? null;

  const photos = useMemo<Photo[]>(
    () =>
      (data?.photos ?? []).map((m): Photo => ({
        id: m.id,
        eventId,
        imageUrl: driveMediaUrl(m.id),
        orientation: m.orientation,
        photographer: driveTitle(m.name),
        caption: m.modifiedTime ? formatDate(m.modifiedTime) : undefined,
        tags: [],
        published: true,
        createdAt: m.modifiedTime ?? "",
      })),
    [data?.photos, eventId]
  );

  const shellEvent: ClubEvent | undefined = event
    ? {
        id: event.id,
        name: event.name,
        date: "",
        year: 0,
        description: "",
        coverImage: "",
        photoCount: photos.length,
        published: true,
        createdAt: "",
      }
    : undefined;

  const unavailable = query.isError || data?.unavailable;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link to="/photos" className="label-caps text-muted-foreground hover:text-primary">
          ← Photo archive
        </Link>
      </div>

      {query.isLoading ? (
        <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
          <SkeletonGrid count={3} />
        </div>
      ) : unavailable ? (
        <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
          <ErrorState onRetry={() => query.refetch()} />
          <p className="mt-4 text-center text-sm font-light text-muted-foreground">
            {MEDIA_UNAVAILABLE_MESSAGE}
          </p>
        </div>
      ) : !event ? (
        <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
          <EmptyState
            title="Event not found"
            description="This event folder is no longer in the archive."
          />
        </div>
      ) : (
        <>
          <section className="border-b border-border px-5 pb-14 md:px-8">
            <div className="mx-auto max-w-7xl">
              {photos[0] ? (
                <LazyImage
                  src={photos[0].imageUrl}
                  alt={`${event.name} cover photograph`}
                  aspect="aspect-21/9"
                  className="border border-border"
                  eager
                />
              ) : null}
              <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="label-caps text-primary">Photos</span>
                  <h1 className="mt-3 display-title text-4xl md:text-6xl">{event.name}</h1>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                  <p className="label-caps text-muted-foreground">{photos.length} frames</p>
                  {(data?.videos ?? []).length > 0 ? (
                    <Link
                      to="/videos/event/$eventId"
                      params={{ eventId: event.id }}
                      className="label-caps border border-primary px-5 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Videos ({data?.videos.length})
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="px-5 py-16 md:px-8">
            <div className="mx-auto max-w-7xl">
              {photos.length === 0 ? (
                <EmptyState
                  title="No photos available yet."
                  description="Add photographs to this event's PHOTOS folder and they appear here."
                />
              ) : (
                <PhotoGallery photos={photos} {...(shellEvent ? { event: shellEvent } : {})} />
              )}
            </div>
          </section>
        </>
      )}
    </SiteShell>
  );
}
