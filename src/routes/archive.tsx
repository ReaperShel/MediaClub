import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { SiteShell } from "@/components/site-shell";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { LazyImage } from "@/components/lazy-image";
import { MotionLink } from "@/components/ui/motion-link";
import { staggerChildren } from "@/components/ui/motion-variants";
import {
  getArchiveTimeline,
  type ArchiveEntry,
  type ArchiveTimeline,
} from "@/lib/archive.functions";
import { formatDate } from "@/lib/format";
import { MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";

type FilterValue = "all" | "photos" | "highlights" | "videos" | "news";

const filterOptions: FilterOption<FilterValue>[] = [
  { value: "all", label: "All" },
  { value: "photos", label: "Photos" },
  { value: "highlights", label: "Highlights" },
  { value: "videos", label: "Videos" },
  { value: "news", label: "News" },
];

function categoryMatches(entry: ArchiveEntry, filter: FilterValue): boolean {
  if (filter === "all") return true;
  const flag = {
    photos: entry.hasPhotos,
    highlights: entry.hasHighlights,
    videos: entry.hasVideos,
    news: entry.hasNews,
  }[filter];
  return flag;
}

function groupByYear(
  entries: ArchiveEntry[]
): { year: number | "undated"; items: ArchiveEntry[] }[] {
  const groups = new Map<number | "undated", ArchiveEntry[]>();
  for (const e of entries) {
    const key = e.year;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const sorted = [...groups.entries()].sort((a, b) => {
    if (a[0] === "undated") return 1;
    if (b[0] === "undated") return -1;
    return (b[0] as number) - (a[0] as number);
  });
  return sorted.map(([year, items]) => ({ year, items }));
}

function categoryBadges(entry: ArchiveEntry): { label: string; show: boolean }[] {
  return [
    { label: "Photos", show: entry.hasPhotos },
    { label: "Highlights", show: entry.hasHighlights },
    { label: "Videos", show: entry.hasVideos },
    { label: "News", show: entry.hasNews },
  ];
}

function EntryCard({ entry }: { entry: ArchiveEntry }) {
  const thumbnail = entry.thumbnail ?? entry.items[0]?.thumbnail ?? null;
  const total = entry.photoCount + entry.videoCount;
  const badges = categoryBadges(entry).filter((b) => b.show);

  return (
    <motion.article
      layout
      className="archive-frame group transition-colors hover:border-primary"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
    >
      {entry.destination ? (
        <MotionLink to={entry.destination} className="block" underline={false}>
          {thumbnail ? (
            <LazyImage
              src={thumbnail}
              alt={`${entry.title} cover`}
              aspect="aspect-4/3"
              imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex aspect-4/3 items-center justify-center border-b border-dashed border-border bg-surface-low">
              <span className="label-caps text-muted-foreground">No cover</span>
            </div>
          )}
          <div className="p-5">
            <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
              {entry.date ? <span>{formatDate(entry.date)}</span> : null}
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span>
                {total} {total === 1 ? "item" : "items"}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
              {entry.title}
            </h3>
            <p className="mt-1 text-sm font-light text-muted-foreground">{entry.subLabel}</p>
          </div>
        </MotionLink>
      ) : (
        <div className="block">
          {thumbnail ? (
            <LazyImage
              src={thumbnail}
              alt={`${entry.title} cover`}
              aspect="aspect-4/3"
              imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex aspect-4/3 items-center justify-center border-b border-dashed border-border bg-surface-low">
              <span className="label-caps text-muted-foreground">No cover</span>
            </div>
          )}
          <div className="p-5">
            <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
              {entry.date ? <span>{formatDate(entry.date)}</span> : <span>Undated</span>}
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span>
                {total} {total === 1 ? "item" : "items"}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
              {entry.title}
            </h3>
            <p className="mt-1 text-sm font-light text-muted-foreground">{entry.subLabel}</p>
          </div>
        </div>
      )}

      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
          {badges.map((b) => (
            <span
              key={b.label}
              className="label-caps border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {b.label}
            </span>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive Timeline — Media Club" },
      {
        name: "description",
        content:
          "A chronological archive of all Media Club content — photo events, highlights, videos and campus news.",
      },
      { property: "og:title", content: "Archive Timeline — Media Club" },
      {
        property: "og:description",
        content:
          "Browse every photo assignment, highlight reel, video clip and campus story from the Media Club archive.",
      },
    ],
  }),
  component: ArchiveTimeline,
});

function ArchiveTimeline() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["archive", "timeline"],
    queryFn: () => getArchiveTimeline(),
  });

  const [filter, setFilter] = useState<FilterValue>("all");

  const timeline: ArchiveTimeline | undefined = data;
  const unavailable = isError || timeline?.unavailable;

  const allEntries = useMemo(() => timeline?.entries ?? [], [timeline?.entries]);

  const filtered = useMemo(
    () => allEntries.filter((e) => categoryMatches(e, filter)),
    [allEntries, filter]
  );

  const grouped = useMemo(() => groupByYear(filtered), [filtered]);

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 07</p>
          <h1 className="display-title text-4xl md:text-6xl">Archive Timeline</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            A chronological record of every photo assignment, highlight reel, video clip and campus
            story published by the Media Club.
          </p>
          <MotionLink
            to="/search"
            className="label-caps mt-5 inline-flex items-center gap-2 border-b border-primary pb-px text-sm text-primary transition-colors hover:text-secondary"
            underline={false}
          >
            Search the full archive
          </MotionLink>
        </div>
      </section>

      <section className="flex flex-col gap-6 border-b border-border px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <FilterBar
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            label="Filter archive by category"
          />
          {timeline?.totals ? (
            <div className="mt-4 flex flex-wrap gap-4 text-xs tracking-wider text-muted-foreground uppercase">
              <span>{timeline.totals.photos} photos</span>
              <span>{timeline.totals.highlights} highlights</span>
              <span>{timeline.totals.videos} videos</span>
              <span>{timeline.totals.news} news</span>
            </div>
          ) : null}
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
      ) : allEntries.length === 0 ? (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <EmptyState
              title="No archive entries yet."
              description="Content appears here as soon as the Media Club publishes to Drive."
            />
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <EmptyState
              title="No entries match that filter."
              description="Try selecting a different category or 'All'."
            />
          </div>
        </section>
      ) : (
        <section className="px-5 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            {grouped.map(({ year, items }) => (
              <motion.div
                key={String(year)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerChildren}
              >
                <h2 className="font-display text-3xl font-bold tracking-tight uppercase md:text-4xl">
                  {year === "undated" ? "Undated" : year}
                </h2>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
