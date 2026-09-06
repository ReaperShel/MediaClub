import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import logoAsset from "@/assets/media-club-logo.png.asset.json";
import { MotionLink } from "@/components/ui/motion-link";
import { MotionButton } from "@/components/ui/motion-button";
import { interactiveSpring } from "@/components/ui/motion-variants";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/team", label: "Team" },
  { to: "/archive", label: "Archive" },
] as const;

const registerLinks = [{ to: "/events", label: "Register for Club Events" }] as const;

function RegisterMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const open = hovered || clicked;

  const close = () => {
    setHovered(false);
    setClicked(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setClicked((v) => !v || hovered)}
        className="label-caps flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        Register
        <motion.svg
          className="h-3 w-3"
          animate={{ rotate: open ? 180 : 0 }}
          transition={interactiveSpring}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 border border-border bg-surface pt-1 shadow-lg"
        >
          {registerLinks.map((l) => (
            <MotionLink
              key={l.to}
              to={l.to}
              role="menuitem"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              activeProps={{ className: "text-primary" }}
              className="label-caps block border-b border-border px-5 py-4 text-muted-foreground last:border-0 hover:bg-surface-high hover:text-primary"
              underline={false}
            >
              {l.label}
            </MotionLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
          <motion.img
            src={logoAsset.url}
            alt="Media Club logo"
            className="h-24 w-auto md:h-32"
            data-logo
            whileHover={{ opacity: 0.9 }}
            transition={interactiveSpring}
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((l) => (
            <MotionLink
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="label-caps text-muted-foreground hover:text-foreground"
              underline={false}
            >
              {l.label}
            </MotionLink>
          ))}
          <RegisterMenu />
          <MotionLink
            to="/search"
            aria-label="Search archive"
            className="text-muted-foreground hover:text-primary"
            underline={false}
          >
            <Search className="h-5 w-5" />
          </MotionLink>
        </nav>

        <MotionButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground md:hidden"
        >
          <motion.svg
            className="h-6 w-6"
            animate={{ rotate: open ? 0 : 0 }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <motion.path
              d={open ? "M6 6l12 12M18 6L6 18" : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </MotionButton>
      </div>

      {open ? (
        <nav className="flex flex-col border-t border-border bg-surface px-5 py-4 md:hidden">
          {links.map((l) => (
            <MotionLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="label-caps border-b border-border py-4 text-muted-foreground last:border-0 hover:text-primary"
              underline={false}
            >
              {l.label}
            </MotionLink>
          ))}
          <MotionLink
            to="/search"
            onClick={() => setOpen(false)}
            className="label-caps border-b border-border py-4 text-muted-foreground hover:text-primary"
            underline={false}
          >
            <span className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </span>
          </MotionLink>
          <span className="label-caps border-b border-border pt-4 pb-2 text-primary">Register</span>
          {registerLinks.map((l) => (
            <MotionLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="label-caps border-b border-border py-4 pl-4 text-muted-foreground hover:text-primary"
              underline={false}
            >
              {l.label}
            </MotionLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
