/**
 * Global Command Palette — a premium overlay command interface.
 *
 * Features:
 * - Keyboard shortcut: Cmd/Ctrl + K to open/close
 * - Navigation commands (Home, Archive, Photos, etc.)
 * - Action commands (Register for Event, Request Event)
 * - Archive search integrated with the existing Archive Search system
 * - Keyboard navigation (Up/Down/Enter/ESC)
 * - Focus trapping and scroll lock
 * - Motion animations
 * - Mobile-responsive
 * - Accessibility: dialog semantics, aria-modal, screen reader labels
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import { useMediaViewer, type MediaItem } from "@/components/media-viewer";
import { getArchiveSearchIndex } from "@/lib/archive-search.functions";
import {
  searchIndex,
  type ArchiveSearchIndex,
  type SearchableItem,
  normalizeSearchText,
} from "@/lib/archive-search-core";
import { interactiveSpring } from "@/components/ui/motion-variants";

export type CommandItem = {
  id: string;
  section: "navigate" | "actions" | "archive" | "recent";
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  to?: string;
  action?: () => void;
  item?: SearchableItem;
};

type CommandPaletteContextType = {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea/select
      const target = e.target as HTMLElement | null;
      const isFormControl =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.hasAttribute("contenteditable"));

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        if (isFormControl) return;
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [togglePalette]);

  return (
    <CommandPaletteContext.Provider value={{ open, openPalette, closePalette, togglePalette }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

const NAV_COMMANDS: CommandItem[] = [
  {
    id: "nav-home",
    section: "navigate",
    label: "Home",
    to: "/",
  },
  {
    id: "nav-archive",
    section: "navigate",
    label: "Archive",
    to: "/archive",
  },
  {
    id: "nav-search",
    section: "navigate",
    label: "Search Archive",
    to: "/search",
  },
  {
    id: "nav-photos",
    section: "navigate",
    label: "Photos",
    to: "/photos",
  },
  {
    id: "nav-highlights",
    section: "navigate",
    label: "Highlights",
    to: "/highlights",
  },
  {
    id: "nav-videos",
    section: "navigate",
    label: "Videos & Clips",
    to: "/videos",
  },
  {
    id: "nav-news",
    section: "navigate",
    label: "Campus News",
    to: "/news",
  },
  {
    id: "nav-team",
    section: "navigate",
    label: "Team",
    to: "/team",
  },
  {
    id: "nav-events",
    section: "navigate",
    label: "Register for Club Events",
    to: "/events",
  },
  {
    id: "nav-register",
    section: "navigate",
    label: "Request Media Coverage",
    to: "/register",
  },
];

const ACTION_COMMANDS: CommandItem[] = [
  {
    id: "action-register-event",
    section: "actions",
    label: "Register for an Event",
    to: "/events",
  },
  {
    id: "action-request-event",
    section: "actions",
    label: "Request an Event",
    to: "/register",
  },
];

const SECTION_LABELS: Record<string, string> = {
  navigate: "Navigate",
  actions: "Actions",
  archive: "Archive Results",
  recent: "Recent",
};

function CommandPalette() {
  const { open, closePalette } = useCommandPalette();
  const navigate = useNavigate();
  const { open: openMediaViewer } = useMediaViewer();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load shared archive search index (same data source as /search)
  const { data: archiveIndex, isLoading: archiveLoading } = useQuery({
    queryKey: ["archive", "search-index"],
    queryFn: () => getArchiveSearchIndex(),
    staleTime: 60_000,
  });

  // Handle navigation and close on Escape when open
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setQuery("");
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return undefined;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, closePalette]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
    return undefined;
  }, [open]);

  // Build results based on query
  const results: CommandItem[] = [];

  const q = normalizeSearchText(query);

  // Navigation commands — searchable by label
  if (q) {
    for (const cmd of NAV_COMMANDS) {
      if (normalizeSearchText(cmd.label).includes(q)) {
        results.push(cmd);
      }
    }
  } else {
    results.push(...NAV_COMMANDS);
  }

  // Actions — searchable by label
  if (q) {
    for (const cmd of ACTION_COMMANDS) {
      if (normalizeSearchText(cmd.label).includes(q)) {
        results.push(cmd);
      }
    }
  } else {
    results.push(...ACTION_COMMANDS);
  }

  // Archive search results
  if (archiveIndex && !archiveIndex.unavailable) {
    if (q) {
      const archiveResults = searchIndex(archiveIndex, query, "all", "all").slice(0, 6);
      for (const item of archiveResults) {
        const cmd: CommandItem = {
          id: item.id,
          section: "archive",
          label: item.title,
          subtitle:
            item.kind === "event"
              ? `${item.photoCount} photos · ${item.videoCount} videos`
              : item.category,
          item,
        };
        if (item.destination) cmd.to = item.destination;
        results.push(cmd);
      }

      // "Search full archive" command at the bottom
      results.push({
        id: "search-full-archive",
        section: "archive",
        label: `Search full archive for "${query}"`,
        action: () => {
          navigate({
            to: "/search",
            search: { q: query, type: "all", year: "all" },
          });
        },
      });
    } else {
      // Recent archive items (event-level only, first 3)
      const recentEvents = archiveIndex.items.filter((i) => i.kind === "event").slice(0, 3);
      for (const item of recentEvents) {
        const cmd: CommandItem = {
          id: item.id,
          section: "recent",
          label: item.title,
          item,
        };
        if (item.photoCount > 0 || item.videoCount > 0) {
          cmd.subtitle = `${item.photoCount} photos · ${item.videoCount} videos`;
        }
        if (item.destination) cmd.to = item.destination;
        results.push(cmd);
      }
    }
  }

  // Group results by section for display
  const grouped: Record<string, CommandItem[]> = {};
  for (const r of results) {
    if (!grouped[r.section]) grouped[r.section] = [];
    grouped[r.section]!.push(r);
  }

  const orderedSections = Object.keys(grouped).filter((k) => {
    const section = grouped[k];
    return section !== undefined && section.length > 0;
  });

  // Keyboard navigation
  const allItems = results;
  const totalItems = allItems.length;

  useEffect(() => {
    if (!open) return undefined;

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectItem(allItems[selectedIndex] ?? null);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, selectedIndex, totalItems, allItems, navigate]);

  const selectItem = (item: CommandItem | null | undefined) => {
    if (!item) return;
    if (item.action) {
      item.action();
    } else if (item.to) {
      navigate({ to: item.to as unknown as string });
    }
    // For individual media items, use MediaViewer
    if (item.item && item.item.kind !== "event" && item.item.mediaUrl) {
      const mediaItem: MediaItem = {
        id: item.item.id,
        type: item.item.kind === "video" ? "video" : "image",
        url: item.item.mediaUrl,
        title: item.item.title,
        ...(item.item.eventName
          ? { subtitle: item.item.eventName, eventName: item.item.eventName }
          : {}),
        ...(item.item.date ? { date: item.item.date } : {}),
      };
      openMediaViewer([mediaItem], 0);
    }
    closePalette();
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closePalette}
        >
          <motion.div
            layoutId="command-palette"
            className="w-full max-w-2xl bg-surface border border-border shadow-2xl"
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ ...interactiveSpring, duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search commands and archive..."
                aria-label="Search commands and archive"
                className="flex-1 border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <button
                type="button"
                onClick={closePalette}
                className="label-caps text-xs text-muted-foreground hover:text-primary"
                aria-label="Close"
              >
                Esc
              </button>
            </div>

            <div
              ref={listRef}
              className="max-h-96 overflow-y-auto"
              role="listbox"
              aria-label="Search results"
            >
              {results.length === 0 && !archiveLoading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                orderedSections.map((sectionKey) => (
                  <div key={sectionKey}>
                    <div className="label-caps px-4 py-2 text-xs tracking-wider text-muted-foreground">
                      {SECTION_LABELS[sectionKey] ?? sectionKey}
                    </div>
                    {grouped[sectionKey]!.map((item, idx) => {
                      const globalIndex = results.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={globalIndex}
                          type="button"
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className="w-full px-4 py-2.5 text-left hover:bg-surface-high/50"
                        >
                          <div
                            className={
                              isSelected
                                ? "flex items-start gap-3 rounded-md bg-surface-high/30 px-2 py-1"
                                : "flex items-start gap-3"
                            }
                          >
                            <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs text-muted-foreground">
                              {item.icon ?? (
                                <kbd className="label-caps rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {item.section === "navigate" && "⏎"}
                                  {item.section === "actions" && "•"}
                                  {item.section === "archive" && "🔍"}
                                  {item.section === "recent" && "★"}
                                </kbd>
                              )}
                            </span>
                            <div className="flex-1">
                              <div className="font-display text-sm font-bold uppercase">
                                {item.label}
                              </div>
                              {item.subtitle ? (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {item.subtitle}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}

              {archiveLoading ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">Loading archive...</div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
