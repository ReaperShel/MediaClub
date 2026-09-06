import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SiteShell } from "@/components/site-shell";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { LazyImage } from "@/components/lazy-image";
import { MotionLink } from "@/components/ui/motion-link";
import { staggerChildren } from "@/components/ui/motion-variants";
import { useMediaViewer, type MediaItem } from "@/components/media-viewer";
import { getArchiveSearchIndex } from "@/lib/archive-search.functions";
import {
  searchIndex,
  type ArchiveSearchIndex,
  type SearchableItem,
} from "@/lib/archive-search-core";
import { formatDate } from "@/lib/format";
import { MEDIA_UNAVAILABLE_MESSAGE } from "@/lib/drive/media";

type CategoryValue = "all" | "photos" | "highlights" | "videos" | "news";
type YearValue = "all" | "undated" | string;

const categoryFilters: FilterOption<CategoryValue>[] = [
  { value: "all", label: "All" },
  { value: "photos", label: "Photos" },
  { value: "highlights", label: "Highlights" },
  { value: "videos", label: "Videos & Clips" },
  { value: "news", label: "Campus News" },
];

const yearFilters = [
  { value: "all" as YearValue, label: "All Years" },
  { value: "undated" as YearValue, label: "Undated" },
];

function parseSearch(search: Record<string, unknown>): {
  q: string;
  type: CategoryValue;
  year: YearValue;
} {
  const rawQ = typeof search["q"] === "string" ? search["q"] : "";
  const rawType = typeof search["type"] === "string" ? search["type"] : "all";
  const type: CategoryValue = ["all", "photos", "highlights", "videos", "news"].includes(rawType)
    ? (rawType as CategoryValue)
    : "all";
  const rawYear = search["year"];
  let year: YearValue;
  if (typeof rawYear === "string") {
    if (rawYear === "undated") {
      year = "undated";
    } else {
      const n = parseInt(rawYear, 10);
      year = Number.isNaN(n) ? "all" : rawYear;
    }
  } else if (typeof rawYear === "number" && !Number.isNaN(rawYear)) {
    year = String(rawYear);
  } else {
    year = "all";
  }
  return { q: rawQ, type, year };
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => parseSearch(search),
  head: () => ({
    meta: [
      { title: "Search the Archive — Media Club" },
      {
        name: "description",
        content:
          "Search across every photo, highlight, video and campus story in the Media Club archive.",
      },
      { property: "og:title", content: "Search the Archive — Media Club" },
      {
        property: "og:description",
        content: "Search across the Media Club's complete photo, video and news archive.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const {
    q: initialQ = "",
    type: initialType = "all",
    year: initialYear = "all",
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });

  const {
    data: index,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["archive", "search-index"],
    queryFn: () => getArchiveSearchIndex(),
  });

  const { open } = useMediaViewer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(initialQ);

  const [category, setCategory] = useState<CategoryValue>(initialType);

  const [year, setYear] = useState<YearValue>(initialYear);

  // Focus the search input on desktop load
  useEffect(() => {
    if (inputRef.current && window.matchMedia("(hover: hover)").matches) {
      inputRef.current.focus();
    }
  }, []);

  // ESC key: clear search first, then navigate to archive
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (search) {
          setSearch("");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search]);

  // Sync URL state
  useEffect(() => {
    navigate({
      to: "/search",
      search: {
        q: search,
        type: category,
        year,
      },
      replace: true,
    });
  }, [search, category, year, navigate]);

  // Build dynamic year options from loaded data
  const yearOptions: FilterOption<YearValue>[] = useMemo(() => {
    if (!index) return [...yearFilters];
    const dynamic: FilterOption<YearValue>[] = [];
    for (const y of index.years) {
      if (typeof y === "number") {
        dynamic.push({ value: String(y), label: String(y) });
      }
    }
    return [...yearFilters, ...dynamic];
  }, [index?.years]);

  const searchYear = useMemo<"all" | "undated" | number>(() => {
    if (year === "all" || year === "undated") return year;
    const n = parseInt(year, 10);
    return Number.isNaN(n) ? "all" : n;
  }, [year]);

  const results = useMemo(() => {
    if (!index || index.unavailable) return null;
    return searchIndex(index, search, category, searchYear);
  }, [index, search, category, searchYear]);

  const hasFilters = search.length > 0 || category !== "all" || year !== "all";

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps mb-4 text-primary">Cam 05</p>
          <h1 className="display-title text-4xl md:text-6xl">Search the Archive</h1>
          <p className="mt-5 max-w-xl text-base font-light text-muted-foreground">
            Search across every photo assignment, highlight reel, video clip and campus story.
          </p>
        </div>
      </section>

      <section className="border-b border-border px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, photos, videos..."
              aria-label="Search archive"
              className="w-full border border-border bg-surface-low px-4 py-3.5 pl-11 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-3.586-3.586m0 0A7.5 7.5 0 1116.414 16.414A7.5 7.5 0 0121 21z"
              />
            </svg>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Category filters">
            <FilterBar
              options={categoryFilters}
              value={category}
              onChange={setCategory}
              label="Filter search by category"
            />
          </div>

          {index && index.years.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Year filters">
              <FilterBar
                options={yearOptions}
                value={year}
                onChange={setYear}
                label="Filter search by year"
              />
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          {isLoading ? (
            <SkeletonGrid count={8} />
          ) : index?.unavailable || isError ? (
            <>
              <ErrorState onRetry={() => refetch()} />
              <p className="mt-4 text-center text-sm font-light text-muted-foreground">
                {MEDIA_UNAVAILABLE_MESSAGE}
              </p>
            </>
          ) : !search && !hasFilters ? (
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold uppercase text-muted-foreground">
                  Search Across The Archive
                </h2>
                {index && index.totals ? (
                  <p className="mt-3 text-sm font-light text-muted-foreground">
                    {index.totals.photos} photos · {index.totals.highlights} highlights ·{" "}
                    {index.totals.videos} videos · {index.totals.news} news articles
                  </p>
                ) : null}
              </div>

              {index && index.items.filter((i) => i.kind === "event").length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {index.items
                    .filter((i) => i.kind === "event")
                    .slice(0, 9)
                    .map((item) => (
                      <SearchResultCard
                        key={item.id}
                        item={item}
                        open={open}
                        categoryFilters={categoryFilters}
                        currentCategory={category}
                        setCategory={setCategory}
                      />
                    ))}
                </div>
              ) : null}
            </div>
          ) : results && results.length === 0 ? (
            <EmptyState
              title={`No results for "${search}"`}
              description="Try a different keyword or adjust the category/year filters."
            />
          ) : results ? (
            <AnimatePresence>
              <motion.div
                key="results"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="show"
                variants={staggerChildren}
              >
                {results.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{
                      duration: 0.18,
                      ease: "easeOut",
                    }}
                  >
                    <SearchResultCard
                      item={item}
                      open={open}
                      categoryFilters={categoryFilters}
                      currentCategory={category}
                      setCategory={setCategory}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}

function SearchResultCard({
  item,
  open,
  categoryFilters,
  currentCategory,
  setCategory,
}: {
  item: SearchableItem;
  open: (items: MediaItem[], index: number) => void;
  categoryFilters: FilterOption<CategoryValue>[];
  currentCategory: CategoryValue;
  setCategory: (v: CategoryValue) => void;
}) {
  const catLabel = categoryFilters.find((f) => f.value === item.category)?.label ?? item.category;
  const totalItems = item.photoCount + item.videoCount;

  if (item.kind === "event") {
    return (
      <article className="archive-frame group transition-colors hover:border-primary">
        <MotionLink to={item.destination ?? "#"} className="block" underline={false}>
          {item.thumbnail ? (
            <LazyImage
              src={item.thumbnail}
              alt={`${item.title} cover`}
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
              <span className="label-caps text-secondary">{catLabel}</span>
              {item.date ? <span>{formatDate(item.date)}</span> : null}
              <span className="h-1 w-1 rounded-full bg-primary" />
              {totalItems > 0 ? (
                <span>
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              ) : null}
            </div>
            <h3 className="font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            {item.eventName ? (
              <p className="mt-1 text-sm font-light text-muted-foreground">{item.eventName}</p>
            ) : null}
          </div>
        </MotionLink>
      </article>
    );
  }

  return (
    <article className="archive-frame group transition-colors hover:border-primary">
      {item.mediaUrl ? (
        <button
          type="button"
          onClick={() => {
            const mediaItem: MediaItem = {
              id: item.id,
              type: item.kind === "video" ? "video" : "image",
              url: item.mediaUrl!,
              title: item.title,
              ...(item.eventName ? { subtitle: item.eventName, eventName: item.eventName } : {}),
              ...(item.date ? { date: item.date } : {}),
            };
            open([mediaItem], 0);
          }}
          className="block w-full text-left"
        >
          {item.thumbnail ? (
            <LazyImage
              src={item.thumbnail}
              alt={item.title}
              aspect={item.kind === "video" ? "aspect-video" : "aspect-4/3"}
              imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex aspect-4/3 items-center justify-center border-b border-dashed border-border bg-surface-low">
              <span className="label-caps text-muted-foreground">No thumbnail</span>
            </div>
          )}
          <div className="p-5">
            <div className="mb-2 flex items-center gap-3 text-xs tracking-wider text-muted-foreground uppercase">
              <span className="label-caps text-secondary">{catLabel}</span>
              {item.date ? <span>{formatDate(item.date)}</span> : <span>Undated</span>}
            </div>
            <h3 className="font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            {item.eventName ? (
              <p className="mt-1 text-sm font-light text-muted-foreground">{item.eventName}</p>
            ) : null}
          </div>
        </button>
      ) : (
        <div className="block w-full">
          {item.thumbnail ? (
            <LazyImage
              src={item.thumbnail}
              alt={item.title}
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
              <span className="label-caps text-secondary">{catLabel}</span>
              {item.date ? <span>{formatDate(item.date)}</span> : null}
              <span className="h-1 w-1 rounded-full bg-primary" />
            </div>
            <h3 className="font-display text-xl font-bold uppercase transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            {item.eventName ? (
              <p className="mt-1 text-sm font-light text-muted-foreground">{item.eventName}</p>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
