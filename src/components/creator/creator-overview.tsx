import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { creatorOverviewStats } from "@/lib/creator.functions";
import { formatDate } from "@/lib/format";
import { interactiveSpring } from "@/components/ui/motion-variants";
import {
  ChartCardSkeleton,
  DashboardSkeleton,
  KpiGridSkeleton,
  ListCardSkeleton,
} from "@/components/ui/skeleton-shimmer";
import type { CreatorSection } from "./creator-types";

type OverviewStats = Awaited<ReturnType<typeof creatorOverviewStats>>;

const PRIMARY = "var(--primary, oklch(0.74 0.17 62))";
const PRIMARY_SOFT = "oklch(0.74 0.17 62 / 0.15)";

const areaChartConfig: ChartConfig = {
  registrations: {
    label: "Registrations",
    color: PRIMARY,
  },
};

const barChartConfig: ChartConfig = {
  count: {
    label: "Registrations",
    color: PRIMARY,
  },
};

type Range = "7" | "30" | "90";

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

function Sparkline({ data, dataKey }: { data: { count: number }[]; dataKey: string }) {
  const chartData = data.map((d, i) => ({ i, v: d.count }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={PRIMARY}
            strokeWidth={1.5}
            fill={`url(#spark-${dataKey})`}
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
  sparklineData,
}: {
  label: string;
  value: number;
  sparklineData?: { count: number }[];
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-low p-5">
      <span className="label-caps text-muted-foreground">{label}</span>
      <div>
        <AnimatedNumber value={value} />
      </div>
      {sparklineData && sparklineData.length > 1 ? (
        <Sparkline data={sparklineData} dataKey={label} />
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
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#fillRegistrations)"
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
  data: { eventTitle: string; count: number; capacity: number }[];
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

function RecentRegistrationsCard({
  items,
  onViewAll,
}: {
  items: {
    id: string;
    full_name: string;
    event_title: string;
    created_at: string;
  }[];
  onViewAll: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div className="flex items-center justify-between">
        <h3 className="label-caps text-muted-foreground">Recent registrations</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="label-caps text-xs text-primary transition-colors hover:text-primary/80"
        >
          VIEW ALL
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No registrations yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.full_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.event_title}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(r.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentRequestsCard({
  items,
  onViewAll,
}: {
  items: {
    id: string;
    name: string;
    event_title: string;
    status: string;
    created_at: string;
  }[];
  onViewAll: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <div className="flex items-center justify-between">
        <h3 className="label-caps text-muted-foreground">Recent requests</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="label-caps text-xs text-primary transition-colors hover:text-primary/80"
        >
          VIEW ALL
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.event_title}</p>
              </div>
              <span className="label-caps shrink-0 text-xs text-muted-foreground">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickActions({ onSelect }: { onSelect: (section: CreatorSection) => void }) {
  const actions: { id: CreatorSection; label: string; icon: string }[] = [
    { id: "create-event", label: "Add Event", icon: "➕" },
    { id: "events", label: "Manage Events", icon: "📅" },
    { id: "registrations", label: "View Registrations", icon: "📝" },
    { id: "team", label: "Manage Team", icon: "👥" },
  ];

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-low p-6">
      <h3 className="label-caps text-muted-foreground">Quick actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <motion.button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
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

export function CreatorOverview({
  onSelectSection,
}: {
  onSelectSection: (section: CreatorSection) => void;
}) {
  const fetchStats = useServerFn(creatorOverviewStats);
  const stats = useQuery({
    queryKey: ["creator", "overview"],
    queryFn: () => fetchStats({}),
  });
  const [range, setRange] = useState<Range>("30");
  const [capacityEventId, setCapacityEventId] = useState<string | null>(null);

  if (stats.isLoading) {
    return (
      <div className="px-5 py-8 md:px-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (stats.isError) {
    return (
      <div className="px-5 py-12 md:px-8">
        <p className="py-16 text-center text-sm text-secondary">{(stats.error as Error).message}</p>
      </div>
    );
  }

  const s = stats.data!;

  return (
    <div className="space-y-6 px-5 py-8 md:px-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Creator Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Overview of Media Club activity</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Events"
          value={s.activeEvents}
          sparklineData={s.registrationsByDay}
        />
        <KpiCard
          label="Total Registrations"
          value={s.totalRegistrations}
          sparklineData={s.registrationsByDay}
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
        <RecentRegistrationsCard
          items={s.recentRegistrations}
          onViewAll={() => onSelectSection("registrations")}
        />
        <RecentRequestsCard
          items={s.recentRequests}
          onViewAll={() => onSelectSection("requests")}
        />
      </div>

      <QuickActions onSelect={onSelectSection} />
    </div>
  );
}
