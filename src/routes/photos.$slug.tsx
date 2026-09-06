import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { getEvent, events } from "@/lib/archive-data";

export const Route = createFileRoute("/photos/$slug")({
  loader: ({ params }) => {
    const event = getEvent(params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Gallery unavailable — Media Club" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { event } = loaderData;
    return {
      meta: [
        { title: `${event.title} — Media Club Archive` },
        { name: "description", content: event.blurb },
        {
          property: "og:title",
          content: `${event.title} — Media Club Archive`,
        },
        { property: "og:description", content: event.blurb },
        { property: "og:image", content: event.cover },
        { name: "twitter:image", content: event.cover },
      ],
    };
  },
  notFoundComponent: GalleryNotFound,
  component: EventGallery,
});

function GalleryNotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-5 py-32 text-center">
        <h1 className="display-title text-4xl">Archive Empty</h1>
        <p className="mt-4 font-light text-muted-foreground">
          No photographs have been cataloged in this archive yet. Return to the event index to
          select a different collection.
        </p>
        <Link
          to="/photos"
          className="label-caps mt-8 inline-block border border-primary px-6 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Back to Events
        </Link>
      </div>
    </SiteShell>
  );
}

function EventGallery() {
  const { event } = Route.useLoaderData();
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") setIndex((i) => ((i ?? 0) + 1) % event.photos.length);
      if (e.key === "ArrowLeft")
        setIndex((i) => ((i ?? 0) - 1 + event.photos.length) % event.photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, event.photos.length]);

  const related = events.filter((e) => e.slug !== event.slug).slice(0, 3);
  const active = index === null ? null : event.photos[index];

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-5 pt-16 md:px-8">
        <Link
          to="/photos"
          className="label-caps group flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span> All Events
        </Link>

        <div className="mt-12 max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="label-caps border border-secondary/40 bg-secondary/10 px-3 py-1 text-secondary">
              {event.date}
            </span>
            <span className="label-caps border border-border bg-surface px-3 py-1 text-muted-foreground">
              {event.photoCount} Photographs
            </span>
          </div>
          <h1 className="display-title mb-6 text-4xl md:text-7xl">{event.title}</h1>
          <p className="border-l-2 border-primary py-2 pl-6 text-lg font-light text-muted-foreground">
            {event.blurb}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {event.photos.map((p, i) => (
            <button
              key={`${p.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full break-inside-avoid overflow-hidden border border-border bg-surface-low text-left"
            >
              <img
                src={p.src}
                alt={p.title}
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-background/90 via-background/10 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="label-caps mb-2 text-primary">{p.tag}</span>
                <span className="font-display text-lg font-semibold">{p.title}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 border border-border bg-surface-low px-6 py-14 text-center">
          <h3 className="font-display text-2xl font-semibold uppercase">Load More</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {Math.max(event.photoCount - event.photos.length, 0)} photos remaining
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="mb-8 flex items-center gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight uppercase">More Events</h2>
          <div className="h-px flex-grow bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {related.map((e) => (
            <Link key={e.slug} to="/photos/$slug" params={{ slug: e.slug }} className="group block">
              <div className="aspect-4/3 overflow-hidden border border-border">
                <img
                  src={e.cover}
                  alt={e.title}
                  className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
              </div>
              <h4 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">
                {e.title}
              </h4>
            </Link>
          ))}
        </div>
      </section>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery lightbox"
          className="fixed inset-0 z-100 flex flex-col bg-background/98 backdrop-blur-sm"
        >
          <header className="flex items-center justify-between border-b border-border px-6 py-5">
            <div className="label-caps text-muted-foreground">
              <span className="text-foreground">{String((index ?? 0) + 1).padStart(2, "0")}</span> /{" "}
              {event.photos.length}
            </div>
            <button
              type="button"
              aria-label="Close gallery"
              onClick={() => setIndex(null)}
              className="text-2xl leading-none text-muted-foreground transition-colors hover:text-primary"
            >
              ×
            </button>
          </header>

          <div className="flex flex-1 items-center justify-between gap-4 px-4 py-6 md:px-10">
            <button
              type="button"
              aria-label="Previous image"
              onClick={() =>
                setIndex((i) => ((i ?? 0) - 1 + event.photos.length) % event.photos.length)
              }
              className="text-3xl text-muted-foreground transition-colors hover:text-primary"
            >
              ‹
            </button>
            <div className="flex h-full flex-1 items-center justify-center overflow-hidden border border-border">
              <img src={active.src} alt={active.title} className="max-h-[65vh] object-contain" />
            </div>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setIndex((i) => ((i ?? 0) + 1) % event.photos.length)}
              className="text-3xl text-muted-foreground transition-colors hover:text-primary"
            >
              ›
            </button>
          </div>

          <footer className="flex flex-col gap-4 border-t border-border px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold uppercase">{event.title}</h2>
              <div className="label-caps mt-2 flex gap-3 text-muted-foreground">
                <span>{active.tag}</span>
                <span>{active.title}</span>
              </div>
            </div>
            <div className="md:text-right">
              <p className="label-caps text-muted-foreground">Photographer</p>
              <p className="font-display text-lg text-primary">{active.photographer}</p>
            </div>
          </footer>
        </div>
      ) : null}
    </SiteShell>
  );
}
