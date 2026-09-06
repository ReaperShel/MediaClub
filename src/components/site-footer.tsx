import { useState, useRef, useEffect } from "react";
import { MotionLink } from "@/components/ui/motion-link";
import { motion, type MotionProps, type Variants } from "motion/react";
import { interactiveSpring } from "@/components/ui/motion-variants";

const EXPLORE_LINKS = [
  { label: "Photos", to: "/photos/" },
  { label: "Highlights", to: "/highlights/" },
  { label: "Videos & Clips", to: "/videos/" },
  { label: "Campus News", to: "/news/" },
  { label: "Archive", to: "/archive" },
];

const INFO_LINKS = [
  { label: "The Team", to: "/team" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "mailto:manishsurvi1234@gmail.com" },
];

const INVOLVED_LINKS = [
  { label: "Register for Events", to: "/events" },
  { label: "Request an Event", to: "/register" },
];

const LEGAL_LINKS = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

const WORDMARK_CHARS = "MEDIA CLUB".split("");

function FooterLink({
  to,
  children,
  arrow = false,
}: {
  to: string;
  children: React.ReactNode;
  arrow?: boolean;
}) {
  return (
    <MotionLink
      to={to}
      underline={false}
      className="group relative inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {arrow && (
        <motion.span
          className="inline-flex items-center gap-1 text-primary opacity-0 transition-all duration-300 group-hover:gap-2 group-hover:opacity-100"
          aria-hidden="true"
        >
          <span className="block h-px w-2 bg-primary" />
          <ArrowRightIcon className="h-3 w-3" />
        </motion.span>
      )}
      {children}
      <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary/50 transition-all duration-300 group-hover:w-full" />
    </MotionLink>
  );
}

function ExternalFooterLink({
  href,
  children,
  arrow = false,
}: {
  href: string;
  children: React.ReactNode;
  arrow?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="group relative inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {arrow && (
        <motion.span
          className="inline-flex items-center gap-1 text-primary opacity-0 transition-all duration-300 group-hover:gap-2 group-hover:opacity-100"
          aria-hidden="true"
        >
          <span className="block h-px w-2 bg-primary" />
          <ArrowRightIcon className="h-3 w-3" />
        </motion.span>
      )}
      {children}
      <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary/50 transition-all duration-300 group-hover:w-full" />
    </motion.a>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 3.5L10 7.5L5.5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramLink() {
  const { hover, tap } = useHoverable();

  return (
    <motion.a
      href="https://www.instagram.com/mediaclub.siet?igsi=NWlvNXduYnppY2Vw"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Media Club Instagram"
      className="group inline-flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
      {...(hover ? { whileHover: { x: 4 } } : {})}
      {...(tap ? { whileTap: { scale: 0.975 } } : {})}
      transition={interactiveSpring}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 0 1 12.63 8 4 4 0 0 0 8 12.63 4 4 0 0 0 12 16 4 4 0 0 0 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </span>
      <span className="label-caps text-sm font-medium">Instagram</span>
      <ArrowRightIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.a>
  );
}

function useHoverable() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isTouchOnly = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(pointer: coarse)").matches;

  const disabled = prefersReduced || isTouchOnly();

  const hover = disabled ? undefined : ({ scale: 1.025, y: -2 } as MotionProps["whileHover"]);
  const tap = disabled ? undefined : ({ scale: 0.975 } as MotionProps["whileTap"]);

  return { hover, tap, disabled, prefersReduced };
}

function FooterColumn({
  title,
  links,
  isInView,
  stagger,
  item,
}: {
  title: string;
  links: { label: string; to: string }[];
  isInView: boolean;
  stagger: Variants;
  item: Variants;
}) {
  return (
    <motion.div
      initial={isInView ? "show" : "hidden"}
      animate={isInView ? "show" : "hidden"}
      variants={stagger}
    >
      <h3 className="label-caps mb-6 text-primary">{title}</h3>
      <ul className="space-y-3.5 text-sm font-light">
        {links.map((link) => (
          <motion.li key={link.to} variants={item}>
            {link.to.startsWith("http") ? (
              <ExternalFooterLink href={link.to} arrow>
                {link.label}
              </ExternalFooterLink>
            ) : (
              <FooterLink to={link.to} arrow>
                {link.label}
              </FooterLink>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [wordmarkOffset, setWordmarkOffset] = useState({ x: 0, y: 0 });
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const animationStartedRef = useRef(false);
  const spotLightRafRef = useRef<number | null>(null);
  const wordmarkRafRef = useRef<number | null>(null);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);

  const { hover, tap, disabled } = useHoverable();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!footerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !animationStartedRef.current) {
          setIsInView(true);
          animationStartedRef.current = true;
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (disabled || prefersReduced) return;
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseXRef.current = e.clientX;
      lastMouseYRef.current = e.clientY;
    };
    const throttledTick = () => {
      setMousePos({ x: lastMouseXRef.current, y: lastMouseYRef.current });
      spotLightRafRef.current = requestAnimationFrame(throttledTick);
    };
    spotLightRafRef.current = requestAnimationFrame(throttledTick);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (spotLightRafRef.current) {
        cancelAnimationFrame(spotLightRafRef.current);
      }
    };
  }, [disabled, prefersReduced]);

  useEffect(() => {
    if (disabled || prefersReduced) return;
    const tick = () => {
      const dx = (lastMouseXRef.current / window.innerWidth - 0.5) * 8;
      const dy = (lastMouseYRef.current / window.innerHeight - 0.5) * 4;
      setWordmarkOffset({ x: dx, y: dy });
      wordmarkRafRef.current = requestAnimationFrame(tick);
    };
    wordmarkRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (wordmarkRafRef.current) {
        cancelAnimationFrame(wordmarkRafRef.current);
      }
    };
  }, [disabled, prefersReduced]);

  const handleBackToTop = () => {
    if (prefersReduced) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const stagger: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.08,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const isTouchOnly = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(pointer: coarse)").matches;

  const showEffects = !disabled && !prefersReduced && !isTouchOnly();

  return (
    <footer
      ref={footerRef}
      className="relative w-full border-t border-border/40 px-5 pb-8 pt-12 md:px-8"
      style={{
        backgroundColor: "rgba(10, 12, 14, 0.92)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      {/* Subtle cursor spotlight */}
      {showEffects && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-60"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 145, 0, 0.05) 0%, transparent 30%)`,
          }}
        />
      )}

      {/* Large atmospheric wordmark */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
        style={{
          transform: prefersReduced
            ? "none"
            : `translate(${wordmarkOffset.x}px, ${wordmarkOffset.y}px)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <div
          className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 transform select-none font-display text-[10vw] font-black uppercase tracking-[-0.04em] text-foreground/5"
          style={{
            opacity: 0.035,
            letterSpacing: "-0.04em",
            textShadow: "0 0 40px rgba(0,0,0,0.3)",
          }}
        >
          {WORDMARK_CHARS.map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                display: "inline-block",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>
      </div>

      {/* Main navigation grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 lg:grid-cols-5">
        {/* Left: Brand + description + Instagram */}
        <motion.div
          initial={isInView ? "show" : "hidden"}
          animate={isInView ? "show" : "hidden"}
          variants={stagger}
          className="lg:col-span-1"
        >
          <motion.h2
            variants={item}
            className="mb-6 font-display text-2xl font-bold tracking-widest uppercase text-foreground"
          >
            Media Club
          </motion.h2>
          <motion.p
            variants={item}
            className="mb-6 max-w-xs text-sm font-light text-muted-foreground"
          >
            An independent editorial platform dedicated to the visual arts. Documenting the culture
            of image-making on campus and beyond.
          </motion.p>
          <motion.div variants={item}>
            <InstagramLink />
          </motion.div>
        </motion.div>

        {/* EXPLORE */}
        <FooterColumn
          title="Explore"
          links={EXPLORE_LINKS}
          isInView={isInView}
          stagger={stagger}
          item={item}
        />

        {/* INFORMATION */}
        <FooterColumn
          title="Information"
          links={INFO_LINKS}
          isInView={isInView}
          stagger={stagger}
          item={item}
        />

        {/* GET INVOLVED */}
        <FooterColumn
          title="Get Involved"
          links={INVOLVED_LINKS}
          isInView={isInView}
          stagger={stagger}
          item={item}
        />

        {/* LEGAL */}
        <FooterColumn
          title="Legal"
          links={LEGAL_LINKS}
          isInView={isInView}
          stagger={stagger}
          item={item}
        />
      </div>

      {/* Bottom divider with shimmer */}
      <motion.div
        initial={isInView ? "show" : "hidden"}
        animate={isInView ? "show" : "hidden"}
        variants={stagger}
        className="relative z-10 mx-auto mt-10 mb-6 max-w-7xl"
      >
        <motion.div
          variants={item}
          className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-60"
        />
      </motion.div>

      {/* Bottom strip: copyright + location + back to top */}
      <motion.div
        initial={isInView ? "show" : "hidden"}
        animate={isInView ? "show" : "hidden"}
        variants={stagger}
        className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs font-light text-muted-foreground md:flex-row"
      >
        <motion.p variants={item}>© 2026 Media Club Archive. All rights archived.</motion.p>
        <motion.div variants={item} className="flex items-center gap-6 tracking-widest uppercase">
          <span className="text-muted-foreground">SREYAS · HYDERABAD, INDIA</span>
          <button
            type="button"
            onClick={handleBackToTop}
            aria-label="Back to top"
            className="group relative inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <motion.span
              className="text-xs uppercase"
              {...(!disabled ? { whileHover: { y: -3 } } : {})}
              transition={interactiveSpring}
            >
              BACK TO TOP
            </motion.span>
            <motion.span
              className="block"
              aria-hidden="true"
              {...(!disabled ? { whileHover: { y: -3 } } : {})}
              transition={interactiveSpring}
            >
              ↑
            </motion.span>
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary/50 transition-all duration-300 group-hover:w-full" />
          </button>
        </motion.div>
      </motion.div>
    </footer>
  );
}
