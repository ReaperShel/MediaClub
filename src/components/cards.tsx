import { Link } from "@tanstack/react-router";
import { LazyImage } from "@/components/lazy-image";
import type { ClubEvent, Highlight, NewsArticle, Video } from "@/lib/types";
import { formatDate } from "@/lib/format";
import type { ArchiveEvent } from "@/lib/drive/media";
import { driveMediaUrl } from "@/lib/drive/media";

export function EventCard({ event }: { event: ClubEvent }) {
  return (
    <article className="archive-frame group transition-colors hover:border-primary">
      <Link to="/photos/$eventId" params={{ eventId: event.id }} className="block">
        <LazyImage
          src={event.coverImage}
          alt={`${event.name} cover photograph`}
          aspect="aspect-4/3"
          imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
        />
        <div className="p-5">
          <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
            <span>{formatDate(event.date)}</span>
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span>{event.photoCount} frames</span>
          </div>
          <h3 className="font-display text-2xl font-bold uppercase transition-colors group-hover:text-primary">
            {event.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-light text-muted-foreground">
            {event.description}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function HighlightCard({ highlight }: { highlight: Highlight }) {
  return (
    <article className="archive-frame group transition-colors hover:border-primary">
      <Link to="/highlights/$highlightId" params={{ highlightId: highlight.id }} className="block">
        <LazyImage
          src={highlight.coverImage}
          alt={highlight.title}
          aspect="aspect-4/5"
          imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
        />
        <div className="p-5">
          <span className="label-caps text-secondary">{highlight.category}</span>
          <h3 className="mt-2 font-display text-2xl font-bold uppercase transition-colors group-hover:text-primary">
            {highlight.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-light text-muted-foreground">
            {highlight.description}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function VideoCard({ video }: { video: Video }) {
  return (
    <article className="archive-frame group transition-colors hover:border-primary">
      <Link to="/videos/$videoId" params={{ videoId: video.id }} className="block">
        <div className="relative">
          <LazyImage
            src={video.thumbnail}
            alt={`${video.title} thumbnail`}
            aspect="aspect-video"
            imgClassName="opacity-80 transition-all duration-500 group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/30 bg-background/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:border-primary motion-reduce:transition-none">
              <svg className="ml-0.5 h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
              </svg>
            </span>
          </span>
          <span className="label-caps absolute right-3 bottom-3 border border-border bg-background/85 px-2 py-1 backdrop-blur">
            {video.duration}
          </span>
        </div>
        <div className="p-5">
          <span className="label-caps text-secondary">{video.category.replace(/-/g, " ")}</span>
          <h3 className="mt-2 font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
            {video.title}
          </h3>
          <p className="mt-2 text-xs tracking-wider text-muted-foreground uppercase">
            {video.creator} · {formatDate(video.date)}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="group flex flex-col gap-4">
      <Link to="/news/$articleId" params={{ articleId: article.id }} className="block">
        <LazyImage
          src={article.coverImage}
          alt={article.title}
          aspect="aspect-3/2"
          className="border border-border"
          imgClassName="grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 motion-reduce:transition-none"
        />
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
            <span className="text-primary">{article.category.replace(/-/g, " ")}</span>
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span>{article.readingTime} min read</span>
          </div>
          <h3 className="font-display text-2xl font-semibold transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-light text-muted-foreground">
            {article.subtitle}
          </p>
          <p className="mt-3 text-xs tracking-wider text-muted-foreground uppercase">
            {article.author} · {formatDate(article.publishedDate)}
          </p>
        </div>
      </Link>
    </article>
  );
}

/** Card for a Drive-backed event folder (photos or videos section). */
export function ArchiveEventCard({ event, to }: { event: ArchiveEvent; to: "photos" | "videos" }) {
  const count = to === "photos" ? event.photoCount : event.videoCount;
  return (
    <article className="archive-frame group transition-colors hover:border-primary">
      <Link
        to={to === "photos" ? "/photos/$eventId" : "/videos/event/$eventId"}
        params={{ eventId: event.id }}
        className="block"
      >
        {event.coverFileId ? (
          <LazyImage
            src={driveMediaUrl(event.coverFileId)}
            alt={`${event.name} cover photograph`}
            aspect="aspect-4/3"
            imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="flex aspect-4/3 items-center justify-center border-b border-dashed border-border bg-surface-low">
            <span className="label-caps text-muted-foreground">No cover yet</span>
          </div>
        )}
        <div className="p-5">
          <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
            {event.modifiedTime ? <span>{formatDate(event.modifiedTime)}</span> : null}
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span>
              {count} {to === "photos" ? "frames" : "videos"}
            </span>
          </div>
          <h3 className="font-display text-2xl font-bold uppercase transition-colors group-hover:text-primary">
            {event.name}
          </h3>
        </div>
      </Link>
    </article>
  );
}
