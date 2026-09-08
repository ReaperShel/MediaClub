import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CameraScene } from "@/components/3d/camera-scene";
import { categoryCards } from "./camera-hotspots";
import { useTransition } from "@/components/transition-context";
import { interactiveSpring } from "@/components/ui/motion-variants";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "@tanstack/react-router";
import { Camera, Sparkles, Video, Newspaper } from "lucide-react";

const routeToId: Record<string, string> = {
  "/photos": "photos",
  "/highlights": "highlights",
  "/videos": "videos",
  "/news": "news",
};

const idToRoute: Record<string, string> = Object.fromEntries(
  Object.entries(routeToId).map(([route, id]) => [id, route])
);

const labelText: Record<string, string> = {
  photos: "PHOTOS",
  highlights: "HIGHLIGHTS",
  videos: "VIDEOS",
  news: "CAMPUS NEWS",
};

const CameraLabels = memo(function CameraLabels({
  hoveredCameraId,
  breakpoint,
  onLabelClick,
}: {
  hoveredCameraId: string | null;
  breakpoint: string;
  onLabelClick: (id: string, e: React.MouseEvent) => void;
}) {
  const positions =
    breakpoint === "mobile"
      ? LABEL_POSITIONS_MOBILE
      : breakpoint === "tablet"
        ? LABEL_POSITIONS_TABLET
        : LABEL_POSITIONS;
  return (
    <>
      {LABEL_IDS.map((id) => {
        const isActive = hoveredCameraId === id;
        const left = positions[id]?.left ?? "50%";
        return (
          <motion.button
            key={id}
            type="button"
            onClick={(e) => onLabelClick(id, e)}
            className="label-caps absolute -translate-x-1/2 cursor-pointer select-none border-none bg-transparent p-0 text-left font-normal outline-none"
            style={{
              left: left,
              bottom: "10%",
              color: isActive ? "var(--primary, #f97316)" : "rgba(255,255,255,0.85)",
              opacity: isActive ? 1 : 0.65,
              letterSpacing: isActive ? "0.22em" : "0.16em",
              fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              whiteSpace: "nowrap",
              pointerEvents: "auto",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{
              ...interactiveSpring,
              ...(isActive
                ? {
                    color: { duration: 0.25 },
                    opacity: { duration: 0.25 },
                    letterSpacing: { duration: 0.25 },
                  }
                : {}),
            }}
          >
            {labelText[id] ?? id.toUpperCase()}
            <motion.span
              className="block h-px bg-primary"
              style={{
                margin: "4px auto 0",
                backgroundColor: "var(--primary, #f97316)",
                opacity: isActive ? 0.9 : 0,
              }}
              initial={{ width: "0%" }}
              animate={{ width: isActive ? "50%" : "0%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.button>
        );
      })}
    </>
  );
});

const LABEL_IDS: readonly string[] = ["photos", "highlights", "videos", "news"];

const LABEL_POSITIONS: Record<string, { left: string }> = {
  photos: { left: "16%" },
  highlights: { left: "38%" },
  videos: { left: "61%" },
  news: { left: "83%" },
};

const LABEL_POSITIONS_TABLET: Record<string, { left: string }> = {
  photos: { left: "15%" },
  highlights: { left: "37.5%" },
  videos: { left: "60%" },
  news: { left: "82.5%" },
};

const LABEL_POSITIONS_MOBILE: Record<string, { left: string }> = {
  photos: { left: "25%" },
  highlights: { left: "50%" },
  videos: { left: "75%" },
  news: { left: "90%" },
};

const ZOOM_DURATION = 400;
const FADE_DURATION = 300;

function LensZoomOverlay() {
  const navigate = useNavigate();
  const { isTransitioning, focusPoint, pendingRoute, resetTransition } = useTransition();
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<"idle" | "zooming" | "fading" | "done">("idle");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isTransitioning || !focusPoint) return;
    setShowOverlay(true);
    setPhase("zooming");
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const duration = prefersReducedMotion ? ZOOM_DURATION * 0.5 : ZOOM_DURATION;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const scale = prefersReducedMotion ? 1 + eased * 1 : 1 + eased * 3;
      const opacity = progress > 0.6 ? (progress - 0.6) / 0.4 : 0;
      const vignetteOpacity = Math.min(progress * 1.5, 1);

      setZoomStyle({
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        transformOrigin: `${focusPoint.x}px ${focusPoint.y}px`,
        transform: `scale(${scale})`,
        opacity: 1 - eased,
        transition: "none",
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase("fading");
        setTimeout(
          () => {
            setPhase("done");
            if (pendingRoute) {
              navigate({ to: pendingRoute });
            }
            resetTransition();
          },
          prefersReducedMotion ? 100 : 200
        );
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isTransitioning, focusPoint, pendingRoute, resetTransition, navigate, prefersReducedMotion]);

  if (!showOverlay || phase === "idle" || phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div style={zoomStyle} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          pointerEvents: "none",
          background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
          opacity:
            phase === "zooming"
              ? Math.min(
                  (performance.now() - (startTimeRef.current || 0)) / (ZOOM_DURATION * 0.8),
                  1
                )
              : 1,
          transition: phase === "fading" ? `opacity ${FADE_DURATION}ms ease` : "none",
        }}
      />
    </div>
  );
}

export function CameraHero() {
  const { startTransition } = useTransition();
  const [hovered3DCamera, setHovered3DCamera] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const width = window.innerWidth;
    if (width >= 1200) return "desktop";
    if (width >= 768) return "tablet";
    return "mobile";
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1200) setBreakpoint("desktop");
      else if (width >= 768) setBreakpoint("tablet");
      else setBreakpoint("mobile");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);

  const handle3DHover = useCallback((id: string | null) => {
    setHovered3DCamera(id);
  }, []);

  const handleLabelClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      const route = idToRoute[id];
      if (!route) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startTransition(id, route, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    },
    [startTransition]
  );

  return (
    <section
      aria-labelledby="hero-title"
      className="relative w-full border-b border-border px-5 pt-8 pb-12 md:px-8"
    >
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-4 text-center md:mb-6">
          <p className="label-caps mb-2 text-primary md:mb-3">The Digital Archive</p>
          <h1
            id="hero-title"
            className="display-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Create. Capture. Inspire.
          </h1>
          <p className="mt-2 text-sm font-light text-muted-foreground md:mt-3">
            {isTouchDevice
              ? "Tap or rotate a camera to explore."
              : "Hover or click a camera to explore."}
          </p>
        </div>
      </div>

      {!isMobile && (
        <div
          className="relative w-full"
          style={{
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
            width: "100vw",
          }}
        >
          <CameraScene onHover={handle3DHover} />
          <LensZoomOverlay />
          <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 2 }}>
            <CameraLabels
              hoveredCameraId={hovered3DCamera}
              breakpoint={breakpoint}
              onLabelClick={handleLabelClick}
            />
          </div>
        </div>
      )}

      <div className="mt-6 md:mt-8">
        <div className="mx-auto max-w-[1150px] px-5 md:px-8">
          <CategoryGrid />
        </div>
      </div>
    </section>
  );
}

const CategoryGrid = memo(function CategoryGrid() {
  return (
    <div className="category-grid grid grid-cols-1 md:grid-cols-2">
      {categoryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.id}
            to={card.to}
            className="category-card group relative flex flex-col justify-between overflow-hidden bg-background px-7 py-8 md:px-9 md:py-10 transition-colors duration-300 hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ minHeight: "clamp(240px, 28vw, 310px)" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.35] transition-opacity duration-300 group-hover:opacity-[0.55]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 22px)",
                maskImage:
                  "radial-gradient(ellipse 80% 55% at 50% -10%, black 30%, transparent 70%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 80% 55% at 50% -10%, black 30%, transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <Icon
                  className="h-5 w-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h3 className="label-caps text-sm tracking-widest text-muted-foreground transition-colors duration-300 group-hover:text-primary mb-2">
                  {card.label}
                </h3>
                <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-[280px]">
                  {card.description}
                </p>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="absolute bottom-5 right-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-0 group-hover:opacity-100"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 3L9 7L5 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        );
      })}
    </div>
  );
});
