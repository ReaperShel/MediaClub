import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { MotionLink } from "@/components/ui/motion-link";
import { SkeletonBlock } from "@/components/ui/skeleton-shimmer";
import type { FeaturedContent } from "@/lib/featured.functions";

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

function contentLink(content: FeaturedContent): { to: string; label: string } {
  const map: Record<FeaturedContent["content_type"], string> = {
    photos: `/photos/${content.content_id}`,
    highlights: `/highlights/${content.content_id}`,
    videos: `/videos/${content.content_id}`,
    news: `/news/${content.content_id}`,
  };
  const labelMap: Record<FeaturedContent["content_type"], string> = {
    photos: "VIEW PHOTOS",
    highlights: "WATCH HIGHLIGHTS",
    videos: "WATCH VIDEO",
    news: "READ ARTICLE",
  };
  return {
    to: map[content.content_type],
    label: labelMap[content.content_type],
  };
}

export function FeaturedStory({ data }: { data: FeaturedContent | null }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [imageError, setImageError] = useState(false);

  if (!data) return null;

  if (import.meta.env.DEV) {
    console.log("[FeaturedStory] Drive item loading", !imageError && !!data.image_url);
    console.log("[FeaturedStory] final render state", {
      contentType: data.content_type,
      contentId: data.content_id,
      hasImageUrl: !!data.image_url,
      imageError,
    });
  }

  const link = contentLink(data);
  const title = data.custom_title || "Featured Story";
  const excerpt = data.custom_excerpt;
  const imageSrc = data.image_url || "";

  return (
    <section aria-labelledby="featured-story-title" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Link
            to={link.to}
            className="group block focus:outline-none"
            aria-label={`${title} — ${link.label}`}
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
              <motion.div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface-low"
                whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }
                }
              >
                {imageSrc && !imageError ? (
                  <img
                    src={imageSrc}
                    alt={title}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="label-caps text-muted-foreground">Media Club</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </motion.div>

              <div className="flex flex-col justify-center">
                <span className="label-caps text-primary">{data.content_type.toUpperCase()}</span>
                <h2
                  id="featured-story-title"
                  className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl lg:text-5xl"
                >
                  {title}
                </h2>
                {excerpt && (
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                    {excerpt}
                  </p>
                )}
                <div className="mt-6">
                  <MotionLink
                    to={link.to}
                    underline={false}
                    className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 text-sm font-medium transition-colors group-hover:border-primary group-hover:text-primary"
                    style={{
                      color: "var(--foreground)",
                    }}
                  >
                    <span className="label-caps">{link.label}</span>
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </MotionLink>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export function FeaturedStorySkeleton() {
  return (
    <section aria-hidden="true" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <SkeletonBlock className="aspect-[4/3] w-full" rounded="sm" />
          <div className="flex flex-col justify-center gap-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-5 w-full" />
            <SkeletonBlock className="h-5 w-5/6" />
            <SkeletonBlock className="h-12 w-40" />
          </div>
        </div>
      </div>
    </section>
  );
}
