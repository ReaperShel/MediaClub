import { useCallback, useEffect, useState } from "react";
import { LazyImage } from "@/components/lazy-image";
import type { ClubEvent, Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMediaViewer, type MediaItem } from "@/components/media-viewer";

export function PhotoGallery({ photos, event }: { photos: Photo[]; event?: ClubEvent }) {
  const { open } = useMediaViewer();

  const handleOpen = useCallback(
    (index: number) => {
      const items: MediaItem[] = photos.map((p) => {
        const base: MediaItem = {
          id: p.id,
          type: "image",
          url: p.imageUrl,
          title: p.photographer,
        };
        if (p.caption) {
          base.subtitle = p.caption;
          base.date = p.caption;
        }
        if (event?.name) {
          base.eventName = event.name;
        }
        return base;
      });
      open(items, index);
    },
    [photos, event, open]
  );

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => handleOpen(i)}
            aria-label={`Open photograph ${i + 1} of ${photos.length}`}
            className="group relative block w-full break-inside-avoid overflow-hidden border border-border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LazyImage
              src={photo.imageUrl}
              alt={photo.caption ?? `Photograph by ${photo.photographer}`}
              aspect={photo.orientation === "portrait" ? "aspect-4/5" : "aspect-3/2"}
              imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-background/95 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
              <span className="label-caps text-primary">{photo.photographer}</span>
              <span className="label-caps text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
