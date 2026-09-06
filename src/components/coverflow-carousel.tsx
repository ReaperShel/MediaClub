import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { interactiveSpring } from "@/components/ui/motion-variants";

export type CoverflowSlide = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  onClick?: () => void;
};

type Props = {
  slides: CoverflowSlide[];
  className?: string;
  aspectRatio?: "3/2" | "16/10" | "4/3" | "video";
};

export function CoverflowCarousel({ slides, className, aspectRatio = "3/2" }: Props) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, delta: 0, dragging: false });

  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = ((index % count) + count) % count;
      setActive(next);
    },
    [count]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, delta: 0, dragging: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    dragState.current.delta = e.clientX - dragState.current.startX;
  };

  const onPointerUp = () => {
    if (!dragState.current.dragging) return;
    const threshold = 60;
    if (dragState.current.delta < -threshold) next();
    else if (dragState.current.delta > threshold) prev();
    dragState.current.dragging = false;
    dragState.current.delta = 0;
  };

  if (count === 0) return null;

  const aspectClass =
    aspectRatio === "16/10"
      ? "aspect-[16/10]"
      : aspectRatio === "4/3"
        ? "aspect-4/3"
        : aspectRatio === "video"
          ? "aspect-video"
          : "aspect-3/2";

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        ref={trackRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={{ perspective: "1200px", minHeight: "320px" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="region"
        aria-roledescription="carousel"
        aria-label="Media carousel"
      >
        {slides.map((slide, i) => {
          const offset = i - active;
          const absOffset = Math.abs(offset);

          const translateX = offset * 55;
          const translateZ = -absOffset * 120;
          const rotateY = offset * -25;
          const scale = offset === 0 ? 1 : 1 - absOffset * 0.12;
          const zIndex = count - absOffset;
          const blur = absOffset > 1 ? Math.min(absOffset - 1, 2) * 2 : 0;

          return (
            <motion.div
              key={slide.id}
              className={cn("absolute flex cursor-pointer flex-col", offset === 0 ? "z-10" : "")}
              style={{
                zIndex,
                opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.25,
                pointerEvents: absOffset > 3 ? "none" : "auto",
                transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                filter: blur > 0 ? `blur(${blur}px)` : undefined,
              }}
              animate={{
                x: translateX,
                scale: Math.max(scale, 0.4),
                transition: { ...interactiveSpring, duration: 0.5 },
              }}
              {...(absOffset === 0 ? { whileTap: { scale: 0.99 } } : {})}
              onClick={() => {
                if (offset !== 0) {
                  goTo(i);
                } else {
                  slide.onClick?.();
                }
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slide.title}, ${i + 1} of ${count}`}
            >
              <div
                className={cn(
                  "relative w-[55vw] max-w-2xl overflow-hidden border bg-surface-low",
                  "border-primary/30",
                  offset === 0 && "border-primary/70",
                  "md:w-[45vw]",
                  aspectClass
                )}
                style={{
                  boxShadow:
                    offset === 0
                      ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px oklch(0.74 0.17 62 / 0.3)"
                      : "0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px oklch(0.74 0.17 62 / 0.15)",
                  transition: "box-shadow 0.5s ease-out, border-color 0.5s ease-out",
                }}
              >
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    loading={absOffset > 1 ? "lazy" : "eager"}
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="label-caps text-muted-foreground">No preview</span>
                  </div>
                )}
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-4 pt-12 transition-opacity duration-500",
                    absOffset > 2 ? "opacity-0" : "opacity-100"
                  )}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center transition-all duration-500",
                      offset === 0 ? "scale-100" : "scale-75"
                    )}
                  >
                    <h3
                      className={cn(
                        "font-display font-bold uppercase tracking-tight text-white",
                        offset === 0 ? "text-lg md:text-2xl" : "text-sm md:text-lg",
                        "transition-all duration-500"
                      )}
                      style={{
                        letterSpacing: offset === 0 ? "-0.02em" : "-0.01em",
                      }}
                    >
                      {slide.title}
                    </h3>
                    <div
                      className={cn(
                        "mt-1 h-px bg-primary transition-all duration-500",
                        offset === 0 ? "w-12 md:w-16" : "w-6 md:w-10"
                      )}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <motion.button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground"
          whileHover={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
          }}
          whileTap={{ scale: 0.975 }}
          transition={interactiveSpring}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <div className="flex items-center gap-2" role="tablist" aria-label="Slide indicators">
          {slides.map((slide, i) => (
            <motion.button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}: ${slide.title}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full",
                i === active ? "w-8 bg-primary" : "w-1.5 bg-border"
              )}
              {...(i === active
                ? { animate: { backgroundColor: "var(--color-primary)" } }
                : {
                    whileHover: {
                      backgroundColor: "var(--color-muted-foreground)",
                    },
                  })}
              whileTap={{ scale: 0.95 }}
              transition={interactiveSpring}
            />
          ))}
        </div>

        <motion.button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground"
          whileHover={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
          }}
          whileTap={{ scale: 0.975 }}
          transition={interactiveSpring}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
