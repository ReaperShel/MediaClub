import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export type MediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  title: string;
  subtitle?: string;
  date?: string;
  thumbnail?: string;
  eventName?: string;
};

type ViewerState = {
  items: MediaItem[];
  index: number;
};

type MediaViewerContextValue = {
  open: (items: MediaItem[], index: number) => void;
  close: () => void;
  state: ViewerState | null;
};

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

export function MediaViewerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewerState | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback((items: MediaItem[], index: number) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setState({ items, index });
  }, []);

  const close = useCallback(() => {
    setState(null);
    previousFocusRef.current?.focus?.();
  }, []);

  return (
    <MediaViewerContext.Provider value={{ open, close, state }}>
      {children}
      <AnimatePresence>
        {state ? (
          <MediaViewer items={state.items} initialIndex={state.index} onClose={close} />
        ) : null}
      </AnimatePresence>
    </MediaViewerContext.Provider>
  );
}

export function useMediaViewer() {
  const ctx = useContext(MediaViewerContext);
  if (!ctx) throw new Error("useMediaViewer must be used within MediaViewerProvider");
  return ctx;
}

function MediaViewer({
  items,
  initialIndex,
  onClose,
}: {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const current = items[index];
  const total = items.length;

  const go = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      setLoading(true);
      setError(false);
      setIndex((prev) => (prev + delta + total) % total);
    },
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    containerRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  useEffect(() => {
    if (!current || total <= 1) return;
    const prev = items[(index - 1 + total) % total];
    const next = items[(index + 1) % total];
    [prev, next].forEach((item) => {
      if (item && item.type === "image" && item.url) {
        const img = new window.Image();
        img.src = item.url;
      }
    });
  }, [current, index, items, total]);

  useEffect(() => {
    if (mediaRef.current && mediaRef.current.tagName === "VIDEO") {
      (mediaRef.current as HTMLVideoElement).pause();
    }
  }, [index]);

  const handleShare = async () => {
    if (!current) return;
    const shareData = {
      title: current.title,
      url: current.url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(current.url);
      }
    } catch {
      // ignore share errors
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (touch) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || total <= 1) return;
    const changedTouch = e.changedTouches[0];
    if (!changedTouch) return;
    const dx = changedTouch.clientX - touchStartRef.current.x;
    const dy = changedTouch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    touchStartRef.current = null;

    if (absDx > absDy && absDx > 60) {
      if (dx < 0) go(1);
      else go(-1);
    }
  };

  if (!current) return null;

  const navBtn =
    "flex h-12 w-12 items-center justify-center border border-border bg-background/70 text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-sm outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="flex items-center justify-between border-b border-white/10 px-5 py-4"
      >
        <div className="label-caps text-muted-foreground">
          {current.eventName ? (
            <span>
              {current.eventName}
              {current.subtitle ? <span className="mx-2 text-white/30">/</span> : null}
              {current.subtitle ? <span className="text-white/70">{current.subtitle}</span> : null}
            </span>
          ) : current.subtitle ? (
            <span className="text-white/70">{current.subtitle}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="label-caps text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media viewer"
            className={navBtn}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </button>
      <section
        className="flex flex-1 items-center justify-center overflow-hidden px-3 py-5 sm:px-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {total > 1 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous media"
            className={navBtn}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        <div
          className="relative flex flex-1 items-center justify-center"
          onClickCapture={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {loading && !error ? (
              <motion.div
                key="skeleton"
                className="skeleton absolute inset-0 max-h-full max-w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="skeleton-shimmer" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="label-caps text-muted-foreground">Media could not be loaded.</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {current.type === "image" ? (
            <img
              key={current.id}
              ref={mediaRef as React.RefObject<HTMLImageElement>}
              src={current.url}
              alt={current.title ?? ""}
              className="max-h-[75vh] max-w-full object-contain"
              style={{ visibility: loading && !error ? "hidden" : "visible" }}
              onLoad={() => setLoading(false)}
              onError={() => setError(true)}
            />
          ) : (
            <video
              key={current.id}
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={current.url}
              controls
              preload="auto"
              playsInline
              className="max-h-[75vh] max-w-full"
              onLoadedData={() => setLoading(false)}
              onError={() => setError(true)}
            />
          )}
        </div>

        {total > 1 ? (
          <button type="button" onClick={() => go(1)} aria-label="Next media" className={navBtn}>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </section>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-1">
          {current.date ? <span className="label-caps text-white/50">{current.date}</span> : null}
          <span className="label-caps text-primary">{current.title}</span>
          {current.eventName ? (
            <span className="label-caps text-white/50">{current.eventName}</span>
          ) : null}
        </div>
        <div className="mx-auto mt-3 flex max-w-4xl items-center justify-between">
          <span className="text-xs text-white/40">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share media"
            className="label-caps text-muted-foreground transition-colors hover:text-foreground"
          >
            Share
          </button>
        </div>
      </div>
    </motion.div>
  );
}
