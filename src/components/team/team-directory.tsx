import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LazyImage } from "@/components/lazy-image";
import type { TeamRank } from "@/lib/team.schema";
import { cn } from "@/lib/utils";

/**
 * Unified, client-safe team person used by the public Team page.
 * Merges leads + members (both already published) and resolves the Drive
 * photo URL. Grouping/sorting happens here, purely for presentation.
 */
export type TeamPerson = {
  id: string;
  name: string;
  role: string;
  team: string;
  rank: TeamRank;
  bio: string;
  skills: string[];
  order: number;
  photo?: string | undefined;
  instagramUrl?: string | undefined;
};

function isInstagramUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "instagram.com" || parsed.hostname === "www.instagram.com")
    );
  } catch {
    return false;
  }
}

export type GroupedTeam = { team: string; people: TeamPerson[] };

/** Preferred editorial order for known teams; any other team sorts after. */
const TEAM_DISPLAY_ORDER = ["Leadership", "Photography", "Videography", "Tech", "Other"];

const RANK_PRIORITY: Record<string, number> = {
  president: 0,
  "vice-president": 1,
  lead: 2,
  member: 3,
};

function compareTeams(a: string, b: string): number {
  const ia = TEAM_DISPLAY_ORDER.indexOf(a);
  const ib = TEAM_DISPLAY_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

const RANK = (rank: string): number => RANK_PRIORITY[rank] ?? 4;

export function groupByTeam(people: TeamPerson[]): GroupedTeam[] {
  const map = new Map<string, TeamPerson[]>();
  for (const person of people) {
    const arr = map.get(person.team) ?? [];
    arr.push(person);
    map.set(person.team, arr);
  }
  const result: GroupedTeam[] = [];
  for (const team of [...map.keys()].sort(compareTeams)) {
    const arr = map.get(team);
    if (!arr) continue;
    arr.sort(
      (a, b) => RANK(a.rank) - RANK(b.rank) || a.order - b.order || a.name.localeCompare(b.name)
    );
    result.push({ team, people: arr });
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function PhotoSlot({
  photo,
  name,
  role,
  aspect,
}: {
  photo?: string | undefined;
  name: string;
  role: string;
  aspect: string;
}) {
  if (photo)
    return (
      <LazyImage
        src={photo}
        alt={`${name} — ${role}`}
        aspect={aspect}
        imgClassName="transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:brightness-100"
      />
    );
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-dashed border-border bg-surface-low",
        aspect
      )}
    >
      <span className="label-caps px-4 text-center text-muted-foreground">Photo coming soon</span>
    </div>
  );
}

const ChevronRightIcon = (
  <svg
    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
    viewBox="0 0 15 15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5.5 3.5L10 7.5L5.5 11.5" />
  </svg>
);

const panelVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delayChildren: 0.04, staggerChildren: 0.05 },
  },
};

const memberItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function MemberCard({
  person,
  index,
  onViewProfile,
}: {
  person: TeamPerson;
  index: number;
  onViewProfile: (person: TeamPerson) => void;
}) {
  const reversed = index % 2 === 1;
  return (
    <motion.article
      variants={memberItem}
      aria-labelledby={`member-name-${person.id}`}
      className={cn(
        "archive-frame group flex flex-col gap-6 sm:items-start sm:gap-8 sm:flex-row",
        reversed && "sm:flex-row-reverse",
        "border border-transparent transition-colors hover:border-primary"
      )}
    >
      <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-44">
        <PhotoSlot photo={person.photo} name={person.name} role={person.role} aspect="aspect-4/5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="label-caps text-sm text-primary/90 transition-colors group-hover:text-primary">
          {person.role}
        </span>
        <h3
          id={`member-name-${person.id}`}
          className="mt-2 font-display text-2xl font-bold uppercase text-foreground sm:text-3xl"
        >
          {person.name}
        </h3>
        {person.bio ? (
          <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-muted-foreground">
            {person.bio}
          </p>
        ) : null}
        <div className="mt-3.5 flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={() => onViewProfile(person)}
            className="label-caps inline-flex items-center gap-1.5 text-secondary transition-colors group-hover:text-primary"
          >
            View profile
            {ChevronRightIcon}
          </button>
          {isInstagramUrl(person.instagramUrl) ? (
            <a
              href={person.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${person.name} on Instagram`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:scale-105"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function ProfileModal({ person, onClose }: { person: TeamPerson; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const skills = person.skills ?? [];

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${person.name} profile`}
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="presentation"
        className="animate-in fade-in zoom-in-95 max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <span className="label-caps text-primary">{person.role}</span>
            <h3 className="mt-1 font-display text-2xl font-bold uppercase">{person.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <div className="mb-5 max-w-[14rem]">
            <PhotoSlot
              photo={person.photo}
              name={person.name}
              role={person.role}
              aspect="aspect-4/5"
            />
          </div>
          <p className="text-sm font-light text-muted-foreground">{person.bio}</p>
          <p className="label-caps mt-4 text-muted-foreground">Team · {person.team}</p>
          {skills.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {skills.map((s) => (
                <li key={s} className="label-caps border border-border px-3 py-1 text-secondary">
                  {s}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TeamDirectory({
  teams,
  activeTeam,
  onSelectTeam,
}: {
  teams: GroupedTeam[];
  activeTeam: string;
  onSelectTeam: (team: string) => void;
}) {
  const reduced = useReducedMotion();
  const [profile, setProfile] = useState<TeamPerson | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const active = teams.find((t) => t.team === activeTeam) ?? teams[0] ?? null;

  if (!active) return null;

  const activeSlug = slugify(active.team);
  const activeIndex = teams.indexOf(active);
  const activeNum = String(activeIndex + 1).padStart(2, "0");

  function handleKeydown(e: React.KeyboardEvent<HTMLDivElement>) {
    const tabs = navRef.current?.querySelectorAll('[role="tab"]');
    if (!tabs) return;
    const list = Array.from(tabs) as HTMLElement[];
    const idx = list.indexOf(document.activeElement as HTMLElement);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % list.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    else return;
    e.preventDefault();
    const el = list[next];
    el?.focus();
    el?.click();
  }

  return (
    <>
      <div
        ref={navRef}
        role="tablist"
        aria-label="Team categories"
        tabIndex={0}
        className="mb-8 flex flex-nowrap gap-6 gap-y-0.5 overflow-x-auto border-b border-border pb-3"
        onKeyDown={handleKeydown}
      >
        {teams.map((t, i) => {
          const slug = slugify(t.team);
          const isActive = t.team === activeTeam;
          return (
            <button
              key={slug}
              id={`tab-${slug}`}
              role="tab"
              aria-selected={isActive}
              aria-controls="team-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectTeam(t.team)}
              className={cn(
                "label-caps flex items-center gap-1.5 border-b-2 border-transparent pb-2 text-sm whitespace-nowrap transition-[color,_border-color] hover:text-foreground",
                isActive ? "border-primary text-foreground" : "text-muted-foreground"
              )}
            >
              <span className={isActive ? "text-primary" : "text-primary/40"}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {t.team.toUpperCase()}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active.team}
          id="team-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeSlug}`}
          variants={panelVariants}
          {...(!reduced ? { initial: "hidden", animate: "show", exit: "hidden" } : {})}
        >
          <header className="mb-10 flex items-baseline gap-5">
            <span className="font-display font-black text-2xl text-primary/35 sm:text-3xl">
              {activeNum}
            </span>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
              {active.team.toUpperCase()}
            </h2>
          </header>
          <div className="mb-10 h-px w-32 bg-border" />
          <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-2 lg:items-start">
            {active.people.map((person, idx) => (
              <MemberCard key={person.id} person={person} index={idx} onViewProfile={setProfile} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      {profile ? <ProfileModal person={profile} onClose={() => setProfile(null)} /> : null}
    </>
  );
}
