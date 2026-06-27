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
  ArrowUpRight,
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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

const STAGE_TONE: Record<JobStage, string> = {
  design_received: "border-chart-5/30 bg-chart-5/5 text-chart-5",
  programming: "border-chart-3/30 bg-chart-3/5 text-chart-3",
  laser_cutting: "border-primary/30 bg-primary/5 text-primary",
  bending: "border-warning/30 bg-warning/5 text-warning",
  welding: "border-destructive/30 bg-destructive/5 text-destructive",
  powder_coating: "border-chart-4/30 bg-chart-4/5 text-chart-4",
  quality_check: "border-chart-2/30 bg-chart-2/5 text-chart-2",
  dispatch: "border-primary/30 bg-primary/5 text-primary",
  completed: "border-success/30 bg-success/5 text-success",
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
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Monthly Revenue",
      value: inr(stats?.monthRevenue ?? 0),
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Active Jobs Value",
      value: inr(stats?.activeJobsValue ?? 0),
      icon: IndianRupee,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      label: "Pending Quotes",
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Active Jobs",
      value: stats?.activeJobs ?? 0,
      icon: Factory,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Completed Jobs",
      value: stats?.completedJobs ?? 0,
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Overdue Jobs",
      value: stats?.overdueJobs ?? 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Total Jobs",
      value: stats?.totalJobs ?? 0,
      icon: Factory,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-end justify-between flex-wrap gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Operations Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor real-time revenue, quotations, and active production stage load.
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider bg-card px-3 py-1 rounded-sm border border-border">
          {new Date().toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.01 }}
            className="bg-card p-4 relative overflow-hidden border border-border rounded-sm hover:border-primary/50 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div
                className={`size-8 rounded-sm ${k.bgColor} ${k.color} flex items-center justify-center`}
              >
                <k.icon className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight text-foreground">
              {isLoading ? "…" : k.value}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-bold">
              {k.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Primary Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card p-5 lg:col-span-2 border border-border rounded-sm relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <TrendingUp className="size-4 text-success" /> Revenue Trend
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quotes approved over the last 30 days
              </p>
            </div>
            <div className="text-xs font-mono font-bold bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-sm">
              {inr(stats?.trend.reduce((s, x) => s + x.revenue, 0) ?? 0)} total
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend ?? []}>
                <defs>
                  <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                    fontSize: 11,
                  }}
                  labelClassName="text-muted-foreground font-mono"
                  formatter={(value: any) => [
                    inr(Number(value || 0)),
                    "Approved Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  fill="url(#revenueGlow)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Distribution */}
        <div className="bg-card p-5 border border-border rounded-sm flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <Factory className="size-4 text-primary" /> Active Job Stages
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Active items currently in queue</p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-2">
            {(stats?.activeStageDist?.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground text-center">
                No active jobs in production.
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
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {stats?.activeStageDist.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_HEX[i % CHART_HEX.length]}
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 2,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
            {stats?.activeStageDist.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center gap-2 text-[10px] bg-background p-1.5 rounded-sm border border-border"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: CHART_HEX[i % CHART_HEX.length] }}
                />
                <span className="text-muted-foreground truncate flex-1 font-medium">{s.name}</span>
                <span className="font-mono text-foreground font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-width stage load */}
      <div className="bg-card p-5 border border-border rounded-sm shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <Activity className="size-4 text-warning" /> Production Load by Stage
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current queue sizes from design to dispatch
            </p>
          </div>
          <Link
            to="/jobs"
            className="text-xs text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-sm transition-colors"
          >
            Open Production Board
          </Link>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.stageLoad ?? []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                vertical={false}
              />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                angle={-12}
                textAnchor="end"
                height={50}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]}>
                {stats?.stageLoad.map((_, i) => (
                  <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Lists: Recent Jobs + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card p-5 lg:col-span-2 border border-border rounded-sm shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <Factory className="size-4 text-primary" /> Recent Production Jobs
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest jobs queued in the production pipeline
              </p>
            </div>
            <Link
              to="/jobs"
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Manage all →
            </Link>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Loading production logs...
              </div>
            ) : (stats?.recentJobsList?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No jobs in production.{" "}
                <Link to="/jobs" className="text-primary font-semibold">
                  Queue first job →
                </Link>
              </p>
            ) : (
              stats?.recentJobsList.map((job: DashboardJob) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-sm bg-background border border-border"
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {job.title}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-foreground bg-muted border border-border px-1.5 py-0.5 rounded-none">
                        {job.job_number}
                      </span>
                      <span>·</span>
                      <span className="text-primary">
                        {job.customers?.company_name || "Direct Account"}
                      </span>
                      {job.material && (
                        <>
                          <span>·</span>
                          <span>{job.material}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Qty {job.quantity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {job.value > 0 && (
                      <span className="text-xs font-mono font-bold text-foreground">
                        {inr(job.value)}
                      </span>
                    )}
                    <span
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm border font-bold ${STAGE_TONE[job.stage] || "border-border"}`}
                    >
                      {JOB_STAGE_LABELS[job.stage]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card p-5 border border-border rounded-sm shadow-sm">
          <div className="mb-4">
            <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <Clock className="size-4 text-warning" /> Critical Deadlines
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production schedules needing close attention
            </p>
          </div>
          {isLoading ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              Loading schedules...
            </div>
          ) : (stats?.upcomingDeadlines?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 text-muted-foreground/75">
              All active job deadlines are clear.
            </p>
          ) : (
            <div className="space-y-2.5">
              {stats?.upcomingDeadlines.map((job: DashboardJob) => {
                const overdue = job.deadline && new Date(job.deadline) < new Date();
                return (
                  <div
                    key={job.id}
                    className="p-3 rounded-sm bg-background border border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="font-semibold text-xs text-foreground truncate max-w-[150px]"
                        title={job.title}
                      >
                        {job.title}
                      </div>
                      <span
                        className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-sm border font-bold ${STAGE_TONE[job.stage] || "border-border"}`}
                      >
                        {JOB_STAGE_LABELS[job.stage]}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-1">
                      {job.customers?.company_name || "Direct Account"}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {job.job_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-bold border ${
                          overdue
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {overdue ? (
                          <AlertTriangle className="size-3" />
                        ) : (
                          <Calendar className="size-3" />
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
