import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="archive-frame">
          <div className="skeleton aspect-4/3">
            <div className="skeleton-shimmer" />
          </div>
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="archive-frame flex flex-col items-center gap-3 px-6 py-20 text-center">
      <span className="label-caps text-primary">Nothing here</span>
      <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm font-light text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="archive-frame flex flex-col items-center gap-3 px-6 py-20 text-center">
      <span className="label-caps text-secondary">Signal lost</span>
      <h3 className="font-display text-2xl font-bold uppercase">This didn't load</h3>
      <p className="max-w-md text-sm font-light text-muted-foreground">
        Something interrupted the request. Try again in a moment.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="label-caps mt-2 border border-primary px-6 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
