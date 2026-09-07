import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CameraScene } from "@/components/3d/camera-scene";
import { cameraHotspots } from "./camera-hotspots";
import { useTransition } from "@/components/transition-context";
import { MotionLink } from "@/components/ui/motion-link";
import { interactiveSpring } from "@/components/ui/motion-variants";
import { useIsMobile } from "@/hooks/use-mobile";

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

const LABEL_IDS = ["photos", "highlights", "videos", "news"] as const;

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
  const [hoveredBottomCard, setHoveredBottomCard] = useState<string | null>(null);
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

  const handleCardHover = useCallback((camId: string | null) => {
    setHoveredBottomCard(camId);
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
          <CameraScene hoveredId={hovered3DCamera} onHover={handle3DHover} />
          <LensZoomOverlay />
          <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 2 }}>
            {LABEL_IDS.map((id) => {
              const isActive = hovered3DCamera === id;
              const positions =
                breakpoint === "mobile"
                  ? LABEL_POSITIONS_MOBILE
                  : breakpoint === "tablet"
                    ? LABEL_POSITIONS_TABLET
                    : LABEL_POSITIONS;
              const left = positions[id]?.left ?? "50%";
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={(e) => handleLabelClick(id, e)}
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
          </div>
        </div>
      )}

      <ul className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[5px] pb-2 md:mt-7 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:place-items-center md:overflow-visible md:px-0 lg:grid-cols-4 lg:gap-4">
        {cameraHotspots.map((h) => {
          const camId = routeToId[h.to] ?? null;
          const active = hoveredBottomCard === camId && camId !== null;
          return (
            <li
              key={h.cam}
              className="snap-start shrink-0 md:shrink-0"
              style={{ width: "clamp(150px, 40vw, 200px)" }}
            >
              <MotionLink
                to={h.to}
                onMouseEnter={() => handleCardHover(camId)}
                onMouseLeave={() => handleCardHover(null)}
                className="group flex w-full min-w-0 h-auto flex-col items-center justify-center gap-1.5 rounded-[14px] border px-4 py-3.5 text-center backdrop-blur-sm md:h-[130px] md:w-[220px] md:max-w-[220px] md:min-w-[220px]"
                style={{
                  borderColor: active ? "var(--primary)" : "rgba(255,255,255,0.12)",
                  background: active ? "rgba(255,154,60,0.06)" : "rgba(255,255,255,0.02)",
                  boxShadow: active
                    ? "0 8px 32px rgba(255,154,60,0.14), 0 2px 8px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.2)",
                }}
                underline={false}
              >
                <span
                  className="label-caps whitespace-nowrap leading-none transition-colors duration-300"
                  style={{
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                  }}
                >
                  {h.cam}
                </span>
                <span
                  className="font-display whitespace-nowrap text-[0.95rem] font-semibold uppercase leading-tight tracking-tight transition-colors duration-300"
                  style={{
                    color: "var(--foreground)",
                    opacity: active ? 1 : 0.85,
                  }}
                >
                  {h.label}
                </span>
              </MotionLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
