import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  inr,
  fmtDate,
  LEAD_STATUS_LABELS,
  STATUS_TONE,
  JOB_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  JOB_STAGES,
} from "@/lib/erp";
import {
  Activity,
  TrendingUp,
  Users,
  FileText,
  Factory,
  Clock,
  IndianRupee,
  Target,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MAM Industries ERP" }] }),
  component: Dashboard,
});

const CHART_HEX = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats-v2"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const last30 = new Date();
      last30.setDate(last30.getDate() - 29);
      last30.setHours(0, 0, 0, 0);

      const [leads, quotations, jobs, followUps, recentLeads, recentJobs] = await Promise.all([
        supabase.from("leads").select("id,status,source,estimated_value,created_at"),
        supabase.from("quotations").select("id,status,grand_total,created_at"),
        supabase.from("jobs").select("id,stage,value,deadline,created_at"),
        supabase
          .from("follow_ups")
          .select("id,due_date,completed,lead_id,notes,leads(name,company)")
          .eq("completed", false)
          .order("due_date"),
        supabase
          .from("leads")
          .select("id,lead_code,name,company,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("jobs")
          .select("id,job_number,title,stage,deadline")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const l = leads.data ?? [];
      const q = quotations.data ?? [];
      const j = jobs.data ?? [];
      const fu = followUps.data ?? [];

      const todayRevenue = q
        .filter((x) => x.status === "approved" && new Date(x.created_at) >= today)
        .reduce((s, x) => s + Number(x.grand_total), 0);
      const monthRevenue = q
        .filter((x) => x.status === "approved" && new Date(x.created_at) >= monthStart)
        .reduce((s, x) => s + Number(x.grand_total), 0);
      const pipelineValue = l
        .filter((x) => !["won", "lost"].includes(x.status))
        .reduce((s, x) => s + Number(x.estimated_value || 0), 0);
      const pendingQuotations = q.filter((x) => x.status === "draft" || x.status === "sent").length;
      const pendingJobs = j.filter((x) => x.stage !== "completed").length;
      const activeLeads = l.filter((x) => !["won", "lost"].includes(x.status)).length;
      const wonLeads = l.filter((x) => x.status === "won").length;
      const conv = l.length > 0 ? Math.round((wonLeads / l.length) * 100) : 0;
      const overdueJobs = j.filter(
        (x) => x.deadline && new Date(x.deadline) < today && x.stage !== "completed",
      ).length;

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayFollowups = fu.filter((f) => f.due_date === todayStr);
      const missedFollowups = fu.filter((f) => f.due_date < todayStr);
      const upcoming = fu.filter((f) => f.due_date > todayStr).slice(0, 5);

      // 30-day revenue trend
      const trend: { date: string; revenue: number; quotes: number; label: string }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(last30);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const rev = q
          .filter((x) => x.status === "approved" && x.created_at.slice(0, 10) === ds)
          .reduce((s, x) => s + Number(x.grand_total), 0);
        const cnt = q.filter((x) => x.created_at.slice(0, 10) === ds).length;
        trend.push({
          date: ds,
          revenue: rev,
          quotes: cnt,
          label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        });
      }

      // Lead status funnel (ordered)
      const funnel = LEAD_STATUSES.map((s) => ({
        status: LEAD_STATUS_LABELS[s],
        count: l.filter((x) => x.status === s).length,
      }));

      // Lead source distribution
      const sources = LEAD_SOURCES.map((s) => ({
        name: LEAD_SOURCE_LABELS[s],
        value: l.filter((x) => x.source === s).length,
      })).filter((x) => x.value > 0);

      // Production stage distribution
      const stageDist = JOB_STAGES.map((s) => ({
        stage: JOB_STAGE_LABELS[s],
        count: j.filter((x) => x.stage === s).length,
      }));

      return {
        todayRevenue,
        monthRevenue,
        pipelineValue,
        pendingQuotations,
        pendingJobs,
        activeLeads,
        wonLeads,
        conv,
        overdueJobs,
        todayFollowups,
        missedFollowups,
        upcoming,
        recentLeads: recentLeads.data ?? [],
        recentJobs: recentJobs.data ?? [],
        totalLeads: l.length,
        trend,
        funnel,
        sources,
        stageDist,
      };
    },
  });

  const kpis = [
    {
      label: "Today Revenue",
      value: inr(stats?.todayRevenue ?? 0),
      icon: IndianRupee,
      accent: "from-primary to-chart-5",
    },
    {
      label: "Monthly Revenue",
      value: inr(stats?.monthRevenue ?? 0),
      icon: TrendingUp,
      accent: "from-success to-chart-2",
    },
    {
      label: "Pipeline Value",
      value: inr(stats?.pipelineValue ?? 0),
      icon: Target,
      accent: "from-chart-3 to-primary",
    },
    {
      label: "Active Leads",
      value: stats?.activeLeads ?? 0,
      icon: Users,
      accent: "from-chart-5 to-primary",
    },
    {
      label: "Conversion",
      value: `${stats?.conv ?? 0}%`,
      icon: Activity,
      accent: "from-warning to-chart-3",
    },
    {
      label: "Pending Quotes",
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      accent: "from-chart-5 to-primary",
    },
    {
      label: "Active Jobs",
      value: stats?.pendingJobs ?? 0,
      icon: Factory,
      accent: "from-chart-4 to-warning",
    },
    {
      label: "Overdue Jobs",
      value: stats?.overdueJobs ?? 0,
      icon: AlertTriangle,
      accent: "from-destructive to-chart-4",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of leads, jobs, and revenue across MAM Industries.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          {new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="panel p-4 relative overflow-hidden group"
          >
            <div
              className={`absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br ${k.accent} opacity-10 group-hover:opacity-25 transition-opacity`}
            />
            <k.icon className="size-4 text-muted-foreground" />
            <div className="mt-2 text-xl font-bold font-display truncate">
              {isLoading ? "…" : k.value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {k.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue trend (large) + Lead sources pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-success" /> Revenue Trend · Last 30 Days
            </h2>
            <div className="text-xs text-muted-foreground font-mono">
              {inr(stats?.trend.reduce((s, x) => s + x.revenue, 0) ?? 0)} total
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_HEX[0]} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={CHART_HEX[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.30 0.025 250)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "oklch(0.68 0.02 245)" }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.68 0.02 245)" }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.028 250)",
                    border: "1px solid oklch(0.30 0.025 250)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: any) => [inr(Number(value)), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_HEX[0]}
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Users className="size-4 text-chart-5" /> Lead Sources
          </h2>
          <div className="h-72">
            {(stats?.sources?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No leads yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.sources}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stats?.sources.map((_, i) => (
                      <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.22 0.028 250)",
                      border: "1px solid oklch(0.30 0.025 250)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-3">
            {stats?.sources.slice(0, 6).map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 rounded-full"
                  style={{ background: CHART_HEX[i % CHART_HEX.length] }}
                />
                <span className="text-muted-foreground truncate flex-1">{s.name}</span>
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead funnel + Production stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Target className="size-4 text-primary" /> Lead Funnel
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.funnel ?? []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.30 0.025 250)"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 245)" }} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11, fill: "oklch(0.85 0.01 240)" }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.028 250)",
                    border: "1px solid oklch(0.30 0.025 250)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats?.funnel.map((_, i) => (
                    <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Factory className="size-4 text-warning" /> Production Stages
            </h2>
            <Link to="/jobs" className="text-xs text-primary hover:underline">
              Open Kanban →
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.stageDist ?? []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.30 0.025 250)"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 9, fill: "oklch(0.68 0.02 245)" }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.68 0.02 245)" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.028 250)",
                    border: "1px solid oklch(0.30 0.025 250)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill={CHART_HEX[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent leads + Today's follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Recent Leads
            </h2>
            <Link to="/leads" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {stats?.recentLeads.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No leads yet.{" "}
                <Link to="/leads" className="text-primary">
                  Add the first one →
                </Link>
              </p>
            )}
            {stats?.recentLeads.map((l: any) => (
              <Link
                key={l.id}
                to="/leads/$id"
                params={{ id: l.id }}
                className="flex items-center justify-between p-3 rounded-md bg-background/40 hover:bg-accent/40 transition-colors border border-border/50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {l.name}{" "}
                    <span className="text-muted-foreground text-xs">· {l.company || "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{l.lead_code}</div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${STATUS_TONE[l.status as keyof typeof STATUS_TONE]}`}
                >
                  {LEAD_STATUS_LABELS[l.status as keyof typeof LEAD_STATUS_LABELS]}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
            <Clock className="size-4 text-warning" /> Today's Follow-ups
          </h2>
          {stats?.todayFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">All caught up.</p>
          ) : (
            <div className="space-y-2">
              {stats?.todayFollowups.slice(0, 5).map((f: any) => (
                <div key={f.id} className="p-3 rounded-md bg-background/40 border border-border/50">
                  <div className="text-sm font-medium">{f.leads?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{f.notes}</div>
                </div>
              ))}
            </div>
          )}
          {stats && stats.missedFollowups.length > 0 && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <div className="text-xs font-semibold text-destructive uppercase tracking-widest">
                ⚠ {stats.missedFollowups.length} Missed
              </div>
              <Link to="/follow-ups" className="text-xs text-destructive hover:underline">
                Review missed follow-ups →
              </Link>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Upcoming
            </h3>
            {stats?.upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-1.5">
                {stats?.upcoming.slice(0, 4).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{f.leads?.name}</span>
                    <span className="font-mono text-muted-foreground">{fmtDate(f.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
