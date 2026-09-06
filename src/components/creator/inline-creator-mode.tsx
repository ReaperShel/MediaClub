import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { interactiveSpring } from "@/components/ui/motion-variants";
import { SkeletonBlock } from "@/components/ui/skeleton-shimmer";
import { creatorStatus, lockCreator, creatorOverviewStats } from "@/lib/creator.functions";
import {
  creatorDeleteClubEvent,
  creatorDeleteEventRegistration,
  creatorListClubEvents,
  creatorSaveClubEvent,
  creatorListEventRegistrations,
  creatorExportRegistrationsCsv,
} from "@/lib/club-events.functions";
import { creatorSearchRegistrations } from "@/lib/creator.functions";
import {
  creatorListEventRequests,
  creatorSetEventRequestStatus,
} from "@/lib/event-requests.functions";
import {
  STATUS_LABELS,
  CLUB_EVENT_STATUSES,
  clubEventSchema,
  type ClubEventRecord,
} from "@/lib/club-events.schema";
import { formatDate } from "@/lib/format";
import { CreatorPasswordGate } from "./creator-password-gate";
import { FormBuilder } from "@/components/events/form-builder";
import { RegistrationFields } from "@/components/events/registration-fields";
import { TeamManager } from "@/components/team/team-manager";
import { CreatorFeaturedStoryPanel } from "@/components/creator/creator-featured-story-panel";
import { ImageUpload } from "@/components/creator/image-upload";
import type { EventRequestRecord } from "@/lib/event-requests.schema";
import type { RegistrationFormConfig } from "@/lib/registration-form";
import {
  defaultFormConfig,
  normalizeFormConfig,
  configsEqual,
  fieldLabel,
} from "@/lib/registration-form";

const PRIMARY = "var(--primary, oklch(0.74 0.17 62))";
const PRIMARY_SOFT = "oklch(0.74 0.17 62 / 0.15)";

const areaChartConfig: ChartConfig = {
  count: { label: "Registrations", color: PRIMARY },
};

const barChartConfig: ChartConfig = {
  count: { label: "Registrations", color: PRIMARY },
};

type Range = "7" | "30" | "90";

type Tab =
  "overview" | "featured-story" | "events" | "registrations" | "create-event" | "team" | "requests";

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";

function EventPosterUpload({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <ImageUpload
        folder="event-posters"
        value={value}
        onChange={onChange}
        label="Upload poster image"
        folderLabel="media-club-assets/event-posters"
      />
    </div>
  );
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InlineCreatorMode() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [active, setActive] = useState<Tab>("overview");

  const statusQuery = useQuery({
    queryKey: ["creator", "status"],
    queryFn: () => creatorStatus({}),
    staleTime: 60_000,
  });

  const isUnlocked = unlocked || (statusQuery.data?.unlocked ?? false);

  if (!panelOpen) {
    return (
      <div className="mt-12 flex justify-center">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Creator Mode
        </button>
      </div>
    );
  }

  if (locked || !isUnlocked) {
    return (
      <CreatorPasswordGate
        onUnlocked={() => {
          setLocked(false);
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="archive-frame mt-10 overflow-hidden bg-surface-low">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="label-caps text-primary">Creator Mode</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {active.charAt(0).toUpperCase() + active.slice(1)}
          </span>
        </div>
        <LockButton
          onLocked={() => {
            setLocked(true);
            setUnlocked(false);
          }}
        />
      </div>

      <div className="flex flex-col md:flex-row">
        <CreatorNav active={active} onSelect={setActive} />

        <div className="min-w-0 flex-1 p-5">
          {active === "overview" && <OverviewPanel onNavigate={setActive} />}
          {active === "featured-story" && <CreatorFeaturedStoryPanel />}
          {active === "events" && <EventsPanel />}
          {active === "registrations" && <RegistrationsPanel />}
          {active === "create-event" && <CreateEventPanel onCreated={() => setActive("events")} />}
          {active === "team" && <TeamPanel />}
          {active === "requests" && <RequestsPanel />}
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS: { id: Tab; label: string; icon: string; group: string }[] = [
  { id: "overview", label: "Overview", icon: "📊", group: "General" },
  { id: "create-event", label: "Add Event", icon: "➕", group: "Events" },
  { id: "events", label: "Manage Events", icon: "📅", group: "Events" },
  {
    id: "featured-story",
    label: "Featured Story",
    icon: "⭐",
    group: "Content",
  },
  {
    id: "registrations",
    label: "Registrations",
    icon: "📝",
    group: "Registrations",
  },
  { id: "team", label: "Manage Team", icon: "👥", group: "Team" },
  { id: "requests", label: "Requests", icon: "✉️", group: "Team" },
];

function CreatorNav({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof NAV_ITEMS>();
    for (const item of NAV_ITEMS) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <nav
      aria-label="Creator navigation"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface-low p-3 md:w-56 md:flex-col md:gap-0.5 md:overflow-visible md:border-b-0 md:border-r md:p-4"
    >
      <div className="mb-2 hidden md:block">
        <span className="label-caps text-primary">Dashboard</span>
        <h2 className="mt-1 font-display text-base font-bold">Media Club</h2>
        <p className="text-xs text-muted-foreground">Management Portal</p>
      </div>
      {groups.map(([group, items]) => (
        <div key={group} className="flex flex-col gap-0.5 md:mt-3 md:w-full">
          <span className="label-caps hidden px-3 text-muted-foreground md:block">{group}</span>
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`label-caps flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-left text-xs md:w-full ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-surface-high hover:text-foreground"
                }`}
                whileHover={{ x: isActive ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
                transition={interactiveSpring}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </motion.button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function LockButton({ onLocked }: { onLocked: () => void }) {
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
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Lock Creator Mode?")) {
          void mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      className="label-caps border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:opacity-60"
    >
      {mutation.isPending ? "Locking…" : "Lock"}
    </button>
  );
}

function OverviewPanel({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const stats = useQuery({
    queryKey: ["creator", "overview"],
    queryFn: () => creatorOverviewStats({}),
  });
  const [range, setRange] = useState<Range>("30");
  const [capacityEventId, setCapacityEventId] = useState<string | null>(null);

  if (stats.isLoading) {
    return <OverviewSkeleton />;
  }
  if (stats.isError) {
    return <p className="py-6 text-sm text-secondary">{(stats.error as Error).message}</p>;
  }

  const s = stats.data!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Creator Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Overview of Media Club activity</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Events" value={s.activeEvents} sparkline={s.registrationsByDay} />
        <KpiCard
          label="Total Registrations"
          value={s.totalRegistrations}
          sparkline={s.registrationsByDay}
        />
        <KpiCard label="Pending Requests" value={s.requestCounts["pending"] ?? 0} />
        <KpiCard label="Team Members" value={s.totalTeam} />
      </div>

      <RegistrationsOverTimeChart
        data={s.registrationsByDay}
        range={range}
        onRangeChange={setRange}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RegistrationsByEventChart data={s.registrationsByEvent} />
        <EventCapacityCard
          events={s.registrationsByEvent}
          selectedId={capacityEventId}
          onSelect={setCapacityEventId}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentListCard
          title="Recent Registrations"
          viewAllLabel="VIEW ALL"
          onViewAll={() => onNavigate("registrations")}
          items={s.recentRegistrations.map((r) => ({
            id: r.id,
            primary: r.full_name,
            secondary: r.event_title,
            meta: formatDate(r.created_at),
          }))}
          emptyText="No registrations yet."
        />
        <RecentListCard
          title="Recent Requests"
          viewAllLabel="VIEW ALL"
          onViewAll={() => onNavigate("requests")}
          items={s.recentRequests.map((r) => ({
            id: r.id,
            primary: r.name,
            secondary: r.event_title,
            meta: r.status,
          }))}
          emptyText="No pending requests."
        />
      </div>

      <QuickActions onNavigate={onNavigate} />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-3.5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border bg-surface-low p-5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <SkeletonBlock className="h-64 w-full" rounded="sm" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
          <SkeletonBlock className="h-3 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-b border-border py-3"
            >
              <div className="space-y-2">
                <SkeletonBlock className="h-3.5 w-32" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
              <SkeletonBlock className="h-5 w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
          <SkeletonBlock className="h-3 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-b border-border py-3"
            >
              <div className="space-y-2">
                <SkeletonBlock className="h-3.5 w-32" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
              <SkeletonBlock className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="font-display text-3xl font-bold tabular-nums"
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

function Sparkline({ data }: { data: { count: number }[] }) {
  const chartData = data.map((d, i) => ({ i, v: d.count }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={PRIMARY}
            strokeWidth={1.5}
            fill="url(#sparkGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sparkline,
}: {
  label: string;
  value: number;
  sparkline?: { count: number }[];
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-low p-5">
      <span className="label-caps text-muted-foreground">{label}</span>
      <div>
        <AnimatedNumber value={value} />
      </div>
      {sparkline && sparkline.length > 1 ? (
        <Sparkline data={sparkline} />
      ) : (
        <div className="h-10" />
      )}
    </div>
  );
}

function RegistrationsOverTimeChart({
  data,
  range,
  onRangeChange,
}: {
  data: { date: string; count: number }[];
  range: Range;
  onRangeChange: (r: Range) => void;
}) {
  const sliced = useMemo(() => {
    const days = parseInt(range, 10);
    return data.slice(-days);
  }, [data, range]);

  const total = sliced.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="label-caps text-muted-foreground">Registrations over time</h3>
          <p className="mt-1 font-display text-lg font-semibold">
            {total} registration{total === 1 ? "" : "s"} · last {range} days
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-background p-0.5">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`label-caps rounded px-3 py-1.5 text-xs transition-colors ${
                range === r
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ChartContainer config={areaChartConfig} className="h-full w-full">
          <AreaChart data={sliced} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillReg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.3 0.01 260 / 0.4)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "oklch(0.7 0.012 260)", fontSize: 10 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "oklch(0.7 0.012 260)", fontSize: 10 }}
              allowDecimals={false}
              width={30}
            />
            <Tooltip
              cursor={{
                stroke: PRIMARY,
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value: string) => {
                    const d = new Date(value);
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={PRIMARY}
              strokeWidth={2}
              fill="url(#fillReg)"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function RegistrationsByEventChart({
  data,
}: {
  data: {
    eventId: string;
    eventTitle: string;
    count: number;
    capacity: number;
  }[];
}) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.eventTitle.length > 18 ? `${d.eventTitle.slice(0, 16)}…` : d.eventTitle,
      fullName: d.eventTitle,
      count: d.count,
      capacity: d.capacity,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
        <div>
          <h3 className="label-caps text-muted-foreground">Registrations by event</h3>
          <p className="mt-1 font-display text-lg font-semibold">No data yet</p>
        </div>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No registrations recorded across events.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div>
        <h3 className="label-caps text-muted-foreground">Registrations by event</h3>
        <p className="mt-1 font-display text-lg font-semibold">
          Top {chartData.length} event{chartData.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="h-56">
        <ChartContainer config={barChartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.3 0.01 260 / 0.4)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "oklch(0.7 0.012 260)", fontSize: 10 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "oklch(0.7 0.012 260)", fontSize: 11 }}
              width={100}
            />
            <Tooltip
              cursor={{ fill: PRIMARY_SOFT }}
              content={
                <ChartTooltipContent
                  labelFormatter={(
                    _: unknown,
                    payload: readonly { payload?: { fullName?: string } }[]
                  ) => payload?.[0]?.payload?.fullName ?? ""}
                />
              }
            />
            <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function EventCapacityCard({
  events,
  selectedId,
  onSelect,
}: {
  events: {
    eventId: string;
    eventTitle: string;
    count: number;
    capacity: number;
  }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = events.find((e) => e.eventId === selectedId) ?? events[0] ?? null;

  if (!selected) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
        <div>
          <h3 className="label-caps text-muted-foreground">Event capacity</h3>
          <p className="mt-1 font-display text-lg font-semibold">No data</p>
        </div>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No events with registrations yet.
        </div>
      </div>
    );
  }

  const pct =
    selected.capacity > 0
      ? Math.min(100, Math.round((selected.count / selected.capacity) * 100))
      : 0;
  const available = Math.max(0, selected.capacity - selected.count);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div>
        <h3 className="label-caps text-muted-foreground">Event capacity</h3>
        <p className="mt-1 font-display text-lg font-semibold">{selected.eventTitle}</p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="oklch(0.3 0.01 260 / 0.5)"
              strokeWidth="8"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={PRIMARY}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tabular-nums">{pct}%</span>
            <span className="label-caps text-muted-foreground">full</span>
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <div>
            <p className="label-caps text-muted-foreground">Registered</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums">{selected.count}</p>
          </div>
          <div>
            <p className="label-caps text-muted-foreground">Capacity</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums">
              {selected.capacity}
            </p>
          </div>
          <div>
            <p className="label-caps text-muted-foreground">Available</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums">{available}</p>
          </div>
        </div>
      </div>
      {events.length > 1 ? (
        <select
          value={selected.eventId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Select event for capacity view"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {events.map((e) => (
            <option key={e.eventId} value={e.eventId}>
              {e.eventTitle}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function RecentListCard({
  title,
  viewAllLabel,
  onViewAll,
  items,
  emptyText,
}: {
  title: string;
  viewAllLabel: string;
  onViewAll: () => void;
  items: { id: string; primary: string; secondary: string; meta: string }[];
  emptyText: string;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div className="flex items-center justify-between">
        <h3 className="label-caps text-muted-foreground">{title}</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="label-caps text-xs text-primary transition-colors hover:text-primary/80"
        >
          {viewAllLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.primary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.secondary}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{r.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickActions({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const actions: { id: Tab; label: string; icon: string }[] = [
    { id: "create-event", label: "Add Event", icon: "➕" },
    { id: "events", label: "Manage Events", icon: "📅" },
    { id: "registrations", label: "View Registrations", icon: "📝" },
    { id: "team", label: "Manage Team", icon: "👥" },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <h3 className="label-caps text-muted-foreground">Quick actions</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => (
          <motion.button
            key={a.id}
            type="button"
            onClick={() => onNavigate(a.id)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={interactiveSpring}
            className="flex flex-col items-center gap-2 rounded-md border border-border bg-background px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-surface-high"
          >
            <span className="text-xl" aria-hidden="true">
              {a.icon}
            </span>
            <span className="label-caps text-xs">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EVENTS — manage existing events                                            */
/* -------------------------------------------------------------------------- */

function EventsPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ClubEventRecord | null>(null);
  const [editingFormEventId, setEditingFormEventId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["creator", "club-events"],
    queryFn: () => creatorListClubEvents({}),
  });

  const remove = useMutation({
    mutationFn: (id: string) => creatorDeleteClubEvent({ data: { id } }),
    onSuccess: () => {
      setSelectedId(null);
      setEditingEvent(null);
      setEditingFormEventId(null);
      setDeleteConfirmId(null);
      void events.refetch();
    },
  });

  const selectedEvent = events.data?.find((e) => e.id === selectedId) ?? null;

  const visibleEvents = (events.data ?? []).filter((e) => e.status !== "removed");

  if (editingEvent) {
    return (
      <EventEditForm
        event={editingEvent}
        onCancel={() => setEditingEvent(null)}
        onSaved={() => {
          setEditingEvent(null);
          void events.refetch();
        }}
      />
    );
  }

  if (editingFormEventId) {
    const ev = events.data?.find((e) => e.id === editingFormEventId) ?? null;
    if (!ev) {
      setEditingFormEventId(null);
      return null;
    }
    return (
      <EventFormEditor
        event={ev}
        onCancel={() => setEditingFormEventId(null)}
        onSaved={() => {
          setEditingFormEventId(null);
          void events.refetch();
        }}
      />
    );
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        onBack={() => setSelectedId(null)}
        onEdit={() => setEditingEvent(selectedEvent)}
        onEditForm={() => setEditingFormEventId(selectedEvent.id)}
        onDelete={() => setDeleteConfirmId(selectedEvent.id)}
        deletePending={remove.isPending && deleteConfirmId === selectedEvent.id}
        deleteOpen={deleteConfirmId === selectedEvent.id}
        onConfirmDelete={() => {
          if (deleteConfirmId) void remove.mutate(deleteConfirmId);
        }}
        onCancelDelete={() => setDeleteConfirmId(null)}
      />
    );
  }

  return (
    <div>
      <h3 className="font-display text-xl font-bold uppercase">Club Events</h3>
      {events.isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading events…</p>
      ) : events.isError ? (
        <p className="py-6 text-sm text-secondary">{(events.error as Error).message}</p>
      ) : visibleEvents.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No club events yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              className="archive-frame text-left transition-colors hover:border-primary"
            >
              {e.poster_url ? (
                <img
                  src={e.poster_url}
                  alt={`${e.title} poster`}
                  loading="lazy"
                  className="aspect-4/3 w-full border-b border-border object-cover"
                />
              ) : null}
              <div className="p-4">
                <span
                  className={`label-caps border px-2 py-1 text-xs ${
                    e.status === "cancelled" || e.status === "removed"
                      ? "border-border text-muted-foreground"
                      : "border-primary text-primary"
                  }`}
                >
                  {STATUS_LABELS[e.status] ?? e.status}
                </span>
                <h4 className="mt-2 font-display text-lg font-bold uppercase">{e.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(e.event_date)} · {e.registered} / {e.max_participants}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventDetail({
  event,
  onBack,
  onEdit,
  onEditForm,
  onDelete,
  deletePending,
  deleteOpen,
  onConfirmDelete,
  onCancelDelete,
}: {
  event: ClubEventRecord & { registered: number };
  onBack: () => void;
  onEdit: () => void;
  onEditForm: () => void;
  onDelete: () => void;
  deletePending: boolean;
  deleteOpen: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {event.poster_url ? (
            <img
              src={event.poster_url}
              alt={`${event.title} poster`}
              className="w-full border border-border object-cover"
            />
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h3 className="font-display text-2xl font-bold uppercase">{event.title}</h3>
            <span
              className={`label-caps border px-3 py-1 ${
                event.status === "cancelled" || event.status === "removed"
                  ? "border-border text-muted-foreground"
                  : "border-primary text-primary"
              }`}
            >
              {STATUS_LABELS[event.status] ?? event.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(event.event_date)} · {event.venue} · {event.registered} /{" "}
            {event.max_participants} registered
          </p>
          {event.description ? (
            <p className="mt-4 whitespace-pre-line text-sm font-light text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={onEdit}
            className="label-caps w-full border border-primary px-4 py-3 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Edit Event
          </button>
          <button
            type="button"
            onClick={onEditForm}
            className="label-caps w-full border border-border px-4 py-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Edit Registration Form
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="label-caps w-full border border-secondary px-4 py-3 text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Delete Event
          </button>
        </div>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
          <div className="archive-frame max-w-md bg-surface-low p-6 md:p-8">
            <h3 className="font-display text-xl font-bold uppercase">Delete Event?</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Are you sure you want to remove <span className="text-foreground">{event.title}</span>
              ? This will hide it from the public registration page. Historical registrations are
              preserved.
            </p>
            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={onCancelDelete}
                className="label-caps border border-border px-5 py-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePending}
                onClick={onConfirmDelete}
                className="label-caps border border-secondary bg-secondary px-5 py-3 text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deletePending ? "Removing…" : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EventEditForm({
  event,
  onCancel,
  onSaved,
}: {
  event: ClubEventRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState(event.poster_url ?? "");
  const save = useServerFn(creatorSaveClubEvent);

  const mutation = useMutation({
    mutationFn: (input: unknown) => save({ data: input as never }),
    onSuccess: onSaved,
    onError: (err: Error) => setFormError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const parsed = clubEventSchema.safeParse({
      id: event.id,
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      shortDescription: String(fd.get("shortDescription") ?? ""),
      additionalInfo: String(fd.get("additionalInfo") ?? ""),
      posterUrl: posterUrl,
      eventDate: String(fd.get("eventDate") ?? ""),
      startTime: String(fd.get("startTime") ?? ""),
      endTime: String(fd.get("endTime") ?? ""),
      venue: String(fd.get("venue") ?? ""),
      maxParticipants: String(fd.get("maxParticipants") ?? "50"),
      registrationDeadline: String(fd.get("registrationDeadline") ?? ""),
      status: String(fd.get("status") ?? "registration_open"),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="archive-frame bg-surface-low p-6">
      <h3 className="font-display text-xl font-bold uppercase">Edit Event</h3>
      <fieldset
        disabled={mutation.isPending}
        className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        <label className="block sm:col-span-2">
          <span className={labelClass}>Event name *</span>
          <input name="title" defaultValue={event.title} className={inputClass} required />
          {errors["title"] ? (
            <span className="mt-2 block text-xs text-secondary">{errors["title"]}</span>
          ) : null}
        </label>
        <div className="block sm:col-span-2">
          <span className={labelClass}>Event poster (optional)</span>
          <EventPosterUpload
            value={posterUrl}
            onChange={setPosterUrl}
            disabled={mutation.isPending}
          />
        </div>
        <label className="block">
          <span className={labelClass}>Event date *</span>
          <input
            name="eventDate"
            type="date"
            defaultValue={event.event_date}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>Venue *</span>
          <input name="venue" defaultValue={event.venue} className={inputClass} required />
        </label>
        <label className="block">
          <span className={labelClass}>Start time</span>
          <input
            name="startTime"
            type="time"
            defaultValue={event.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>End time</span>
          <input
            name="endTime"
            type="time"
            defaultValue={event.end_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Maximum participants *</span>
          <input
            name="maxParticipants"
            type="number"
            min="1"
            defaultValue={event.max_participants}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>Registration deadline</span>
          <input
            name="registrationDeadline"
            type="date"
            defaultValue={event.registration_deadline ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Short description</span>
          <input
            name="shortDescription"
            defaultValue={event.short_description ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Additional information</span>
          <textarea
            name="additionalInfo"
            rows={2}
            defaultValue={event.additional_info ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Status *</span>
          <select name="status" defaultValue={event.status} className={inputClass}>
            {CLUB_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {formError ? <p className="mt-5 text-sm text-secondary">{formError}</p> : null}
      <div className="mt-7 flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="label-caps border border-primary bg-primary px-6 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EventFormEditor({
  event,
  onCancel,
  onSaved,
}: {
  event: ClubEventRecord & { registered: number };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<RegistrationFormConfig>(() =>
    normalizeFormConfig(event.form_config)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(creatorSaveClubEvent);
  const queryClient = useQueryClient();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = clubEventSchema.safeParse({
        id: event.id,
        title: event.title,
        description: event.description,
        shortDescription: event.short_description,
        additionalInfo: event.additional_info ?? "",
        posterUrl: event.poster_url ?? "",
        eventDate: event.event_date,
        startTime: event.start_time ?? "",
        endTime: event.end_time ?? "",
        venue: event.venue,
        maxParticipants: event.max_participants,
        registrationDeadline: event.registration_deadline ?? "",
        status: event.status,
        formConfig: config,
      });
      if (!payload.success) {
        setError(payload.error.issues[0]?.message ?? "Invalid form data.");
        return;
      }
      await save({ data: payload.data as never });
      void queryClient.invalidateQueries({
        queryKey: ["creator", "club-events"],
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save form.");
    } finally {
      setSaving(false);
    }
  }

  const formChanged = !configsEqual(normalizeFormConfig(event.form_config), config);

  return (
    <div className="archive-frame bg-surface-low p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="label-caps text-primary">Registration form</span>
          <h3 className="mt-2 font-display text-xl font-bold uppercase">{event.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Form version: {event.form_version}
            {formChanged ? " (unsaved changes)" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
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
      <div className="mt-6">
        <FormBuilder config={config} onChange={setConfig} />
      </div>
      {error ? <p className="mt-4 text-sm text-secondary">{error}</p> : null}
      <div className="mt-6 flex gap-4 border-t border-border pt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !formChanged}
          className="label-caps border border-primary bg-primary px-6 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save form"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* REGISTRATIONS — view & delete submissions for one event                    */
/* -------------------------------------------------------------------------- */

function RegistrationsPanel() {
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const events = useQuery({
    queryKey: ["creator", "club-events"],
    queryFn: () => creatorListClubEvents({}),
  });

  const allRegs = useQuery({
    queryKey: ["creator", "registrations", "all"],
    queryFn: () => creatorSearchRegistrations({ data: { limit: 200 } }),
  });

  const eventRegs = useQuery({
    queryKey: ["creator", "registrations", filterEventId],
    queryFn: () =>
      creatorListEventRegistrations({
        data: { eventId: filterEventId, limit: 500 },
      }),
    enabled: !!filterEventId,
  });

  const exportCsv = useServerFn(creatorExportRegistrationsCsv);

  const selectedRegistration = (
    filterEventId
      ? eventRegs.data?.registrations.find((r) => r.id === selectedRegId)
      : allRegs.data?.registrations.find((r) => r.id === selectedRegId)
  ) as import("@/lib/club-events.schema").EventRegistrationRecord | null;

  const remove = useMutation({
    mutationFn: (id: string) => creatorDeleteEventRegistration({ data: { id } }),
    onSuccess: () => {
      setSelectedRegId(null);
      setDeleteConfirmId(null);
      if (filterEventId) void eventRegs.refetch();
      else void allRegs.refetch();
    },
  });

  function eventName(id: string): string {
    return events.data?.find((e) => e.id === id)?.title ?? id.slice(0, 8);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      if (filterEventId) {
        const res = await exportCsv({ data: { eventId: filterEventId } });
        downloadText(res.filename || "registrations.csv", res.csv);
      } else {
        const eventNameById = new Map((events.data ?? []).map((e) => [e.id, e.title]));
        const headers = ["Name", "Email", "Phone", "Event", "Registered"];
        const rows = (allRegs.data?.registrations ?? []).map((r) => [
          r.full_name,
          r.email,
          r.phone ?? "",
          eventNameById.get(r.event_id) ?? r.event_id,
          formatDate(r.created_at),
        ]);
        const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
        downloadText("registrations-all.csv", csv);
      }
    } finally {
      setDownloading(false);
    }
  }

  if (selectedRegId && selectedRegistration) {
    return (
      <div>
        <RegistrationDetail
          registration={selectedRegistration}
          onBack={() => setSelectedRegId(null)}
          onDelete={() => setDeleteConfirmId(selectedRegistration.id)}
        />
        {deleteConfirmId === selectedRegistration.id ? (
          <DeleteConfirm
            title="Delete Registration?"
            message="Are you sure you want to delete this registration? The event and other registrations are unaffected."
            pending={remove.isPending}
            onConfirm={() => {
              void remove.mutate(selectedRegistration.id);
            }}
            onCancel={() => setDeleteConfirmId(null)}
          />
        ) : null}
      </div>
    );
  }

  const showAll = !filterEventId;
  const listQuery = showAll ? allRegs : eventRegs;
  const listRows = showAll
    ? (allRegs.data?.registrations ?? [])
    : (eventRegs.data?.registrations ?? []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterEventId}
          onChange={(e) => {
            setFilterEventId(e.target.value);
            setSelectedRegId(null);
          }}
          className="border border-border bg-surface-low px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All events</option>
          {(events.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading || listRows.length === 0}
          className="label-caps border border-primary bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download CSV"}
        </button>
        <span className="label-caps text-muted-foreground">
          {listRows.length} registration{listRows.length === 1 ? "" : "s"}
        </span>
      </div>

      {listQuery.isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : listQuery.isError ? (
        <p className="py-6 text-sm text-secondary">{(listQuery.error as Error).message}</p>
      ) : listRows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No registrations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-muted-foreground">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                {showAll ? <th className="py-2 pr-4">Event</th> : null}
                <th className="py-2 pr-4">Registered</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {listRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    if (showAll) setFilterEventId(r.event_id);
                    setSelectedRegId(r.id);
                  }}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                >
                  <td className="py-2 pr-4">{r.full_name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{r.email}</td>
                  {showAll ? (
                    <td className="py-2 pr-4 text-muted-foreground">{eventName(r.event_id)}</td>
                  ) : null}
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showAll) setFilterEventId(r.event_id);
                        setSelectedRegId(r.id);
                      }}
                      className="label-caps text-muted-foreground transition-colors hover:text-primary"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RegistrationDetail({
  registration,
  onBack,
  onDelete,
}: {
  registration: import("@/lib/club-events.schema").EventRegistrationRecord;
  onBack: () => void;
  onDelete: () => void;
}) {
  const snapshot = normalizeFormConfig(registration.form_snapshot);
  const customRows = snapshot.fields
    .filter((f) => f.kind === "custom")
    .map((f) => ({
      label: fieldLabel(f),
      value: registration.responses?.[f.id] ?? "—",
    }));

  const standardRows: Array<[string, string | null]> = [
    ["Full Name", registration.full_name],
    ["Email", registration.email],
    ["Phone", registration.phone],
    ["College / University ID", registration.college_id],
    ["Department / Course", registration.department],
    ["Year of Study", registration.year_of_study],
    ["Additional Info", registration.additional_info],
    ["Registered", formatDate(registration.created_at)],
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <span className="label-caps text-primary">Registration details</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {standardRows.map(([label, value]) => (
          <div key={label}>
            <dt className="label-caps text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm text-foreground">{value ?? "—"}</dd>
          </div>
        ))}
        {customRows.map((row) => (
          <div key={row.label}>
            <dt className="label-caps text-muted-foreground">{row.label}</dt>
            <dd className="mt-1 break-words text-sm text-foreground">{row.value || "—"}</dd>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-4 border-t border-border pt-5">
        <button
          type="button"
          onClick={onDelete}
          className="label-caps border border-secondary px-5 py-3 text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
        >
          Delete Registration
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({
  title,
  message,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
      <div className="archive-frame max-w-md bg-surface-low p-6 md:p-8">
        <h3 className="font-display text-xl font-bold uppercase">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="label-caps border border-border px-5 py-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="label-caps border border-secondary bg-secondary px-5 py-3 text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CREATE EVENT — new event with customizable registration form               */
/* -------------------------------------------------------------------------- */

function CreateEventPanel({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDescription: "",
    additionalInfo: "",
    posterUrl: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venue: "",
    maxParticipants: 50,
    registrationDeadline: "",
    status: "registration_open" as (typeof CLUB_EVENT_STATUSES)[number],
  });
  const [config, setConfig] = useState<RegistrationFormConfig>(defaultFormConfig);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(creatorSaveClubEvent);
  const queryClient = useQueryClient();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = clubEventSchema.safeParse({ ...form, formConfig: config });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await save({ data: parsed.data as never });
      void queryClient.invalidateQueries({
        queryKey: ["creator", "club-events"],
      });
      onCreated();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h3 className="font-display text-xl font-bold uppercase">Create Event</h3>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="label-caps border border-border px-4 py-2 text-muted-foreground transition-colors hover:text-primary"
        >
          {preview ? "Edit" : "Preview Registration Form"}
        </button>
      </div>

      {preview ? (
        <div className="archive-frame bg-surface-low p-6">
          <span className="label-caps text-primary">Registration form preview</span>
          <div className="mt-4">
            <RegistrationFields config={config} values={{}} onChange={() => {}} disabled={false} />
            {config.allowAdditionalInfo ? (
              <label className="mt-5 block">
                <span className={labelClass}>Additional information</span>
                <textarea rows={3} disabled className={inputClass} placeholder="(preview only)" />
              </label>
            ) : null}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="archive-frame bg-surface-low p-6">
          <fieldset disabled={saving} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Event name *</span>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass}
                required
              />
              {errors["title"] ? (
                <span className="mt-2 block text-xs text-secondary">{errors["title"]}</span>
              ) : null}
            </label>
            <div className="block sm:col-span-2">
              <span className={labelClass}>Event poster (optional)</span>
              <EventPosterUpload
                value={form.posterUrl}
                onChange={(url) => update("posterUrl", url)}
                disabled={saving}
              />
            </div>
            <label className="block">
              <span className={labelClass}>Event date *</span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => update("eventDate", e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Venue *</span>
              <input
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Start time</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>End time</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Maximum participants *</span>
              <input
                type="number"
                min="1"
                value={form.maxParticipants}
                onChange={(e) => update("maxParticipants", Number(e.target.value) || 0)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Registration deadline</span>
              <input
                type="date"
                value={form.registrationDeadline}
                onChange={(e) => update("registrationDeadline", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Short description</span>
              <input
                value={form.shortDescription}
                onChange={(e) => update("shortDescription", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Additional information</span>
              <textarea
                rows={2}
                value={form.additionalInfo}
                onChange={(e) => update("additionalInfo", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Status *</span>
              <select
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as (typeof CLUB_EVENT_STATUSES)[number])
                }
                className={inputClass}
              >
                {CLUB_EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <div className="mt-8 border-t border-border pt-6">
            <h4 className="font-display text-lg font-bold uppercase">Registration form</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize the fields visitors must complete when registering.
            </p>
            <div className="mt-4">
              <FormBuilder config={config} onChange={setConfig} />
            </div>
          </div>

          {formError ? <p className="mt-5 text-sm text-secondary">{formError}</p> : null}

          <div className="mt-7 flex flex-wrap gap-4">
            <button
              type="submit"
              disabled={saving}
              className="label-caps border border-primary bg-primary px-6 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create Event"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="label-caps border border-border px-6 py-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              Preview Form
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MANAGE TEAM — uses the existing TeamManager in embedded mode               */
/* -------------------------------------------------------------------------- */

function TeamPanel() {
  return <TeamManager embedded onClose={() => {}} />;
}

/* -------------------------------------------------------------------------- */
/* REQUESTS — existing event request management                              */
/* -------------------------------------------------------------------------- */

function RequestsPanel() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const requests = useQuery({
    queryKey: ["creator", "event-requests"],
    queryFn: () => creatorListEventRequests({}),
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected"; rejectionReason?: string }) =>
      creatorSetEventRequestStatus({ data: vars }),
    onSuccess: () => {
      setOpenId(null);
      setReason("");
      void queryClient.invalidateQueries({
        queryKey: ["creator", "event-requests"],
      });
    },
  });

  if (requests.isLoading) {
    return <p className="py-6 text-sm text-muted-foreground">Loading requests…</p>;
  }
  if (requests.isError) {
    return <p className="py-6 text-sm text-secondary">{(requests.error as Error).message}</p>;
  }

  const rows: EventRequestRecord[] = requests.data ?? [];
  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No event requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-muted-foreground">
                <th className="py-2 pr-4">Ref</th>
                <th className="py-2 pr-4">Requester</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    setOpenId(r.id);
                    setReason("");
                  }}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-surface"
                >
                  <td className="py-2 pr-4 font-mono text-xs text-primary">{r.reference}</td>
                  <td className="py-2 pr-4">{r.requester_name}</td>
                  <td className="py-2 pr-4">{r.event_name}</td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(r.id);
                        setReason("");
                      }}
                      className="label-caps text-muted-foreground transition-colors hover:text-primary"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
          <div className="archive-frame my-10 w-full max-w-2xl bg-surface-low p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="label-caps text-primary">{open.reference}</span>
                <h3 className="mt-2 font-display text-xl font-bold uppercase">{open.event_name}</h3>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => {
                  setOpenId(null);
                  setReason("");
                }}
                className="text-muted-foreground hover:text-foreground"
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

            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 py-6 sm:grid-cols-2">
              {[
                ["Requester", open.requester_name],
                ["Email", open.email],
                ["Phone", open.phone ?? "—"],
                ["Event type", open.event_type],
                ["Event date", formatDate(open.event_date)],
                ["Venue", open.venue],
                ["Submitted", formatDate(open.created_at)],
                ["Services", open.requested_services.join(", ")],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="label-caps text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-border pt-5">
              <label className="block">
                <span className="label-caps mb-2 block text-muted-foreground">
                  Rejection reason (optional)
                </span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Shared internally with the team"
                  className="w-full border border-border bg-surface-low px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={setStatus.isPending || open.status === "approved"}
                  onClick={() => setStatus.mutate({ id: open.id, status: "approved" })}
                  className="label-caps border border-primary bg-primary px-5 py-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {setStatus.isPending ? "Updating…" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={setStatus.isPending || open.status === "rejected"}
                  onClick={() =>
                    setStatus.mutate({
                      id: open.id,
                      status: "rejected",
                      rejectionReason: reason,
                    })
                  }
                  className="label-caps border border-secondary px-5 py-3 text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
