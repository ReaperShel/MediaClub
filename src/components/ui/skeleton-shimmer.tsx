import { motion, type MotionProps } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SHIMMER_DURATION = 1.5;

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

const skeletonBase = "relative overflow-hidden rounded-md bg-[oklch(0.235_0.009_260)]";

interface SkeletonBlockProps {
  className?: string;
  style?: CSSProperties;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function SkeletonBlock({ className, style, rounded = "md" }: SkeletonBlockProps) {
  const prefersReduced = usePrefersReducedMotion();

  const radiusClass =
    rounded === "full"
      ? "rounded-full"
      : rounded === "lg"
        ? "rounded-lg"
        : rounded === "sm"
          ? "rounded-sm"
          : "rounded-md";

  return (
    <div className={cn(skeletonBase, radiusClass, className)} style={style}>
      {!prefersReduced ? (
        <motion.div
          className="absolute inset-0"
          aria-hidden="true"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: SHIMMER_DURATION,
            ease: "linear",
            repeat: Infinity,
          }}
          style={
            {
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.32 0.012 260 / 0.45) 50%, transparent 100%)",
            } satisfies MotionProps["style"]
          }
        />
      ) : null}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="archive-frame flex flex-col">
      <SkeletonBlock className="aspect-4/3 w-full" rounded="sm" />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="p-5 pt-0">
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}

export function EventCardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RegistrationFormSkeleton() {
  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
      <div className="flex flex-wrap gap-4 pt-3">
        <SkeletonBlock className="h-12 w-40" />
        <SkeletonBlock className="h-12 w-24" />
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-low p-6">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-8 w-16" />
      <SkeletonBlock className="h-8 w-full" />
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartCardSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <SkeletonBlock className="w-full" style={{ height: `${height}px` }} rounded="sm" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3">
      <div className="space-y-2">
        <SkeletonBlock className="h-3.5 w-32" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
      <SkeletonBlock className="h-5 w-16" />
    </div>
  );
}

export function ListCardSkeleton({ title, count = 5 }: { title?: string; count?: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <SkeletonBlock className="h-3 w-28" />
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <KpiGridSkeleton />
      <ChartCardSkeleton height={280} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCardSkeleton height={220} />
        <ChartCardSkeleton height={220} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCardSkeleton count={5} />
        <ListCardSkeleton count={5} />
      </div>
    </div>
  );
}
