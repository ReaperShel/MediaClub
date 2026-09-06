import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  aspect?: string;
  eager?: boolean;
};

/** Lazy-loading image with skeleton and failure state. */
export function LazyImage({ src, alt, className, imgClassName, aspect, eager }: Props) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className={cn("relative overflow-hidden bg-surface-low", aspect, className)}>
      {state === "loading" ? (
        <div className="skeleton absolute inset-0">
          <div className="skeleton-shimmer" />
        </div>
      ) : null}

      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="label-caps text-muted-foreground">Image unavailable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            state === "ready" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}
    </div>
  );
}
