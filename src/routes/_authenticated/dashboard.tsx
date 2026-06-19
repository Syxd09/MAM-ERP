import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr, fmtDate, JOB_STAGE_LABELS, JOB_STAGES, type JobStage } from "@/lib/erp";
import {
  Activity,
  TrendingUp,
  FileText,
  Factory,
  Clock,
  IndianRupee,
  AlertTriangle,
  Calendar,
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

const CHART_HEX = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

const STAGE_TONE: Record<JobStage, string> = {
  design_received: "border-chart-5/40 bg-chart-5/5 text-chart-5",
  programming: "border-chart-3/40 bg-chart-3/5 text-chart-3",
  laser_cutting: "border-primary/40 bg-primary/5 text-primary",
  bending: "border-warning/40 bg-warning/5 text-warning",
  welding: "border-destructive/40 bg-destructive/5 text-destructive",
  powder_coating: "border-chart-4/40 bg-chart-4/5 text-chart-4",
  quality_check: "border-chart-2/40 bg-chart-2/5 text-chart-2",
  dispatch: "border-primary/40 bg-primary/5 text-primary",
  completed: "border-success/40 bg-success/5 text-success",
};

interface DashboardJob {
  id: string;
  job_number: string;
  title: string;
  stage: JobStage;
  value: number;
  deadline?: string | null;
  created_at: string;
  material?: string | null;
  quantity: number;
  customers: {
    company_name: string;
  } | null;
}

interface QuotationData {
  id: string;
  status: string;
  grand_total: number | string;
  created_at: string;
}

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats-production-v3"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const last30 = new Date();
      last30.setDate(last30.getDate() - 29);
      last30.setHours(0, 0, 0, 0);

      const [quotationsRes, jobsRes] = await Promise.all([
        supabase.from("quotations").select("id,status,grand_total,created_at"),
        supabase
          .from("jobs")
          .select(
            "id,job_number,title,stage,value,deadline,created_at,material,quantity,customers(company_name)",
          )
          .order("created_at", { ascending: false }),
      ]);

      if (quotationsRes.error) throw quotationsRes.error;
      if (jobsRes.error) throw jobsRes.error;

      const q = (quotationsRes.data as unknown as QuotationData[]) ?? [];
      const j = (jobsRes.data as unknown as DashboardJob[]) ?? [];

      const todayRevenue = q
        .filter((x) => x.status === "approved" && new Date(x.created_at) >= today)
        .reduce((s, x) => s + Number(x.grand_total || 0), 0);

      const monthRevenue = q
        .filter((x) => x.status === "approved" && new Date(x.created_at) >= monthStart)
        .reduce((s, x) => s + Number(x.grand_total || 0), 0);

      const activeJobsValue = j
        .filter((x) => x.stage !== "completed")
        .reduce((s, x) => s + Number(x.value || 0), 0);

      const pendingQuotations = q.filter((x) => x.status === "draft" || x.status === "sent").length;
      const activeJobs = j.filter((x) => x.stage !== "completed").length;
      const completedJobs = j.filter((x) => x.stage === "completed").length;
      const totalJobs = j.length;

      const overdueJobs = j.filter(
        (x) => x.deadline && new Date(x.deadline) < today && x.stage !== "completed",
      ).length;

      // 30-day revenue trend
      const trend: {
        date: string;
        revenue: number;
        quotes: number;
        label: string;
      }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(last30);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const rev = q
          .filter((x) => x.status === "approved" && x.created_at.slice(0, 10) === ds)
          .reduce((s, x) => s + Number(x.grand_total || 0), 0);
        const cnt = q.filter((x) => x.created_at.slice(0, 10) === ds).length;
        trend.push({
          date: ds,
          revenue: rev,
          quotes: cnt,
          label: d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
        });
      }

      // Active jobs distribution (Pie) - showing non-completed stages
      const activeStageDist = JOB_STAGES.filter((s) => s !== "completed")
        .map((s) => ({
          name: JOB_STAGE_LABELS[s],
          value: j.filter((x) => x.stage === s).length,
        }))
        .filter((x) => x.value > 0);

      // All production stage load (Bar)
      const stageLoad = JOB_STAGES.map((s) => ({
        stage: JOB_STAGE_LABELS[s],
        count: j.filter((x) => x.stage === s).length,
      }));

      // Upcoming production deadlines (not completed, sorted by deadline asc)
      const upcomingDeadlines = j
        .filter((x) => x.stage !== "completed" && x.deadline)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
        .slice(0, 5);

      // Recent jobs
      const recentJobsList = j.slice(0, 5);

      return {
        todayRevenue,
        monthRevenue,
        activeJobsValue,
        pendingQuotations,
        activeJobs,
        completedJobs,
        overdueJobs,
        totalJobs,
        trend,
        activeStageDist,
        stageLoad,
        upcomingDeadlines,
        recentJobsList,
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
      label: "Active Jobs Value",
      value: inr(stats?.activeJobsValue ?? 0),
      icon: IndianRupee,
      accent: "from-chart-3 to-primary",
    },
    {
      label: "Pending Quotes",
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      accent: "from-chart-5 to-primary",
    },
    {
      label: "Active Jobs",
      value: stats?.activeJobs ?? 0,
      icon: Factory,
      accent: "from-chart-4 to-warning",
    },
    {
      label: "Completed Jobs",
      value: stats?.completedJobs ?? 0,
      icon: Activity,
      accent: "from-success to-chart-3",
    },
    {
      label: "Overdue Jobs",
      value: stats?.overdueJobs ?? 0,
      icon: AlertTriangle,
      accent: "from-destructive to-chart-4",
    },
    {
      label: "Total Jobs",
      value: stats?.totalJobs ?? 0,
      icon: Factory,
      accent: "from-chart-1 to-chart-3",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of revenue, quotations, and production jobs.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          {new Date().toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "short",
          })}
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
            className="glass-panel p-4 relative overflow-hidden group hover-lift cursor-pointer border-border/80"
          >
            <div
              className={`absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br ${k.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
            />
            <k.icon className="size-4 text-primary" />
            <div className="mt-2 text-xl font-bold font-display truncate text-foreground group-hover:scale-102 origin-left transition-transform">
              {isLoading ? "…" : k.value}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-medium">
              {k.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue trend (large) + Active jobs by stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-5 lg:col-span-2">
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: string | number | boolean) => [inr(Number(value)), "Revenue"]}
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

        <div className="glass-panel p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Factory className="size-4 text-chart-5" /> Active Jobs by Stage
          </h2>
          <div className="h-72">
            {(stats?.activeStageDist?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground text-center">
                No active jobs in production
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.activeStageDist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stats?.activeStageDist.map((_, i) => (
                      <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-3 max-h-24 overflow-y-auto pr-1">
            {stats?.activeStageDist.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: CHART_HEX[i % CHART_HEX.length] }}
                />
                <span className="text-muted-foreground truncate flex-1">{s.name}</span>
                <span className="font-mono text-foreground font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production stage load */}
      <div className="glass-panel p-5 hover-lift border-border/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold flex items-center gap-2 text-foreground">
            <Factory className="size-4 text-warning" /> Production Stage Load
          </h2>
          <Link to="/jobs" className="text-xs text-primary hover:underline font-medium">
            Open Kanban →
          </Link>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.stageLoad ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                angle={-15}
                textAnchor="end"
                height={50}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                {stats?.stageLoad.map((entry, i) => (
                  <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent production jobs + Upcoming production deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-5 lg:col-span-2 hover-lift border-border/80">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2 text-foreground">
              <Activity className="size-4 text-primary" /> Recent Production Jobs
            </h2>
            <Link to="/jobs" className="text-xs text-primary hover:underline font-medium">
              View Kanban →
            </Link>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Loading recent jobs...
              </div>
            ) : (stats?.recentJobsList?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No jobs in production yet.{" "}
                <Link to="/jobs" className="text-primary font-medium">
                  Add the first one →
                </Link>
              </p>
            ) : (
              stats?.recentJobsList.map((job: DashboardJob) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/25 hover:bg-accent/30 transition-all border border-border/40 hover:translate-x-0.5"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-medium text-sm text-foreground truncate">
                      {job.title}{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        · {job.customers?.company_name || "—"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {job.job_number} · Qty {job.quantity}{" "}
                      {job.material ? `· ${job.material}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {job.value > 0 && (
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {inr(job.value)}
                      </span>
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-medium ${STAGE_TONE[job.stage as JobStage] || "border-border bg-muted"}`}
                    >
                      {JOB_STAGE_LABELS[job.stage as JobStage]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-5 hover-lift border-border/80">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-4 text-foreground">
            <Clock className="size-4 text-warning" /> Upcoming Deadlines
          </h2>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Loading deadlines...
            </div>
          ) : (stats?.upcomingDeadlines?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-3">
              {stats?.upcomingDeadlines.map((job: DashboardJob) => {
                const overdue = job.deadline && new Date(job.deadline) < new Date();
                return (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg bg-background/25 border border-border/40 hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="font-medium text-xs text-foreground truncate max-w-[150px]"
                        title={job.title}
                      >
                        {job.title}
                      </div>
                      <span
                        className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded border font-medium ${STAGE_TONE[job.stage as JobStage] || "border-border"}`}
                      >
                        {JOB_STAGE_LABELS[job.stage as JobStage]}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-1">
                      {job.customers?.company_name || "—"}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {job.job_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          overdue
                            ? "bg-destructive/15 text-destructive border-destructive/25"
                            : "bg-secondary/60 text-muted-foreground border-border/50"
                        }`}
                      >
                        {overdue ? (
                          <AlertTriangle className="size-2.5" />
                        ) : (
                          <Calendar className="size-2.5" />
                        )}
                        {fmtDate(job.deadline)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
