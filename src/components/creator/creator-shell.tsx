import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "motion/react";
import { lockCreator } from "@/lib/creator.functions";
import { CreatorPasswordGate } from "./creator-password-gate";
import type { CreatorSection } from "./creator-types";

import { useQuery } from "@tanstack/react-query";
import { creatorStatus } from "@/lib/creator.functions";
import { interactiveSpring } from "@/components/ui/motion-variants";

export type { CreatorSection };

export function CreatorShell({
  children,
  onSelectSection,
  currentSection,
}: {
  children: React.ReactNode;
  onSelectSection?: (section: CreatorSection) => void;
  currentSection?: CreatorSection;
}) {
  const [locked, setLocked] = useState(false);

  return (
    <CreatorAuthGate onLocked={() => setLocked(true)}>
      <div className="flex min-h-screen bg-background">
        <CreatorSidebar
          active={currentSection ?? "overview"}
          onSelect={onSelectSection ?? (() => {})}
          onLocked={() => setLocked(true)}
        />
        <div className="flex-1">
          <CreatorHeader currentSection={currentSection ?? "overview"} />
          <main className="pb-14">{children}</main>
        </div>
      </div>
    </CreatorAuthGate>
  );
}

function CreatorAuthGate({
  children,
  onLocked,
}: {
  children: React.ReactNode;
  onLocked: () => void;
}) {
  const fetchStatus = useServerFn(creatorStatus);
  const statusQuery = useQuery({
    queryKey: ["creator", "status"],
    queryFn: () => fetchStatus({}),
  });
  const [locked, setLocked] = useState(false);

  const isUnlocked = statusQuery.data?.unlocked === true;

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="label-caps text-muted-foreground animate-pulse">Checking session…</p>
      </div>
    );
  }

  if (locked || !isUnlocked) {
    return (
      <CreatorPasswordGate
        onUnlocked={async () => {
          setLocked(false);
          onLocked();
          await statusQuery.refetch();
        }}
      />
    );
  }

  return <>{children}</>;
}

const SECTIONS: { id: CreatorSection; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "featured-story", label: "Featured Story", icon: "⭐" },
  { id: "create-event", label: "Add Event", icon: "➕" },
  { id: "events", label: "Manage Events", icon: "📅" },
  { id: "registrations", label: "Registrations", icon: "📝" },
  { id: "team", label: "Team", icon: "👥" },
  { id: "requests", label: "Requests", icon: "✉️" },
];

function CreatorSidebar({
  active,
  onSelect,
  onLocked,
}: {
  active: CreatorSection;
  onSelect: (section: CreatorSection) => void;
  onLocked: () => void;
}) {
  return (
    <nav className="hidden h-screen w-60 flex-col overflow-y-auto border-r border-border bg-surface-low px-5 py-8 md:flex">
      <div className="mb-10 flex flex-col gap-2">
        <span className="label-caps text-primary">Creator Mode</span>
        <h1 className="font-display text-lg font-bold text-primary">Media Club</h1>
        <p className="text-xs text-muted-foreground">Management Portal</p>
      </div>

      <ul className="flex flex-grow flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <motion.button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={active === s.id ? "page" : undefined}
              className={`label-caps flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left ${
                active === s.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-surface-high hover:text-foreground"
              }`}
              whileHover={{ x: active === s.id ? 0 : 2 }}
              whileTap={{ scale: 0.98 }}
              transition={interactiveSpring}
            >
              <span className="text-sm">{s.icon}</span>
              {s.label}
            </motion.button>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-border pt-4">
        <SidebarLockButton onLocked={onLocked} />
      </div>
    </nav>
  );
}

function SidebarLockButton({ onLocked }: { onLocked: () => void }) {
  const lock = useServerFn(lockCreator);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => lock({}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator"] });
      onLocked();
    },
  });

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (window.confirm("Lock Creator Mode? You'll need the password to return.")) {
          void mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      className="label-caps flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-muted-foreground hover:bg-surface-high hover:text-foreground disabled:opacity-60"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={interactiveSpring}
    >
      <span className="text-sm">🔒</span>
      {mutation.isPending ? "Locking…" : "Lock"}
    </motion.button>
  );
}

function CreatorLockButton({ onLocked }: { onLocked: () => void }) {
  const lock = useServerFn(lockCreator);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => lock({}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator"] });
      onLocked();
    },
  });

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (window.confirm("Lock Creator Mode? You'll need the password to return.")) {
          void mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      className="label-caps border border-border px-3 py-3 text-muted-foreground disabled:opacity-60"
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.975 }}
      transition={interactiveSpring}
    >
      {mutation.isPending ? "Locking…" : "Lock Creator Mode"}
    </motion.button>
  );
}

function CreatorHeader({ currentSection }: { currentSection: CreatorSection }) {
  const label = SECTIONS.find((s) => s.id === currentSection)?.label ?? "Creator";
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-5 backdrop-blur-md md:px-8">
      <span className="label-caps text-primary">{label}</span>
      <span className="label-caps text-xs text-muted-foreground">Creator session active</span>
    </header>
  );
}
