import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr, fmtDate, LEAD_STATUS_LABELS, STATUS_TONE, JOB_STAGE_LABELS } from "@/lib/erp";
import { Activity, TrendingUp, Users, FileText, Factory, Clock, IndianRupee, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MAM Industries ERP" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

      const [leads, quotations, jobs, followUps, recentLeads, recentJobs] = await Promise.all([
        supabase.from("leads").select("id,status,estimated_value,created_at"),
        supabase.from("quotations").select("id,status,grand_total,created_at"),
        supabase.from("jobs").select("id,stage"),
        supabase.from("follow_ups").select("id,due_date,completed,lead_id,notes,leads(name,company)").eq("completed", false).order("due_date"),
        supabase.from("leads").select("id,lead_code,name,company,status,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("jobs").select("id,job_number,title,stage,deadline").order("created_at", { ascending: false }).limit(5),
      ]);

      const l = leads.data ?? [];
      const q = quotations.data ?? [];
      const j = jobs.data ?? [];
      const fu = followUps.data ?? [];

      const todayRevenue = q.filter(x => x.status === "approved" && new Date(x.created_at) >= today).reduce((s, x) => s + Number(x.grand_total), 0);
      const monthRevenue = q.filter(x => x.status === "approved" && new Date(x.created_at) >= monthStart).reduce((s, x) => s + Number(x.grand_total), 0);
      const pendingQuotations = q.filter(x => x.status === "draft" || x.status === "sent").length;
      const pendingJobs = j.filter(x => x.stage !== "completed").length;
      const activeLeads = l.filter(x => !["won", "lost"].includes(x.status)).length;
      const wonLeads = l.filter(x => x.status === "won").length;
      const conv = l.length > 0 ? Math.round((wonLeads / l.length) * 100) : 0;

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayFollowups = fu.filter(f => f.due_date === todayStr);
      const missedFollowups = fu.filter(f => f.due_date < todayStr);
      const upcoming = fu.filter(f => f.due_date > todayStr).slice(0, 5);

      const stageCount: Record<string, number> = {};
      j.forEach(x => { stageCount[x.stage] = (stageCount[x.stage] || 0) + 1; });

      return {
        todayRevenue, monthRevenue, pendingQuotations, pendingJobs, activeLeads, wonLeads, conv,
        todayFollowups, missedFollowups, upcoming, stageCount,
        recentLeads: recentLeads.data ?? [], recentJobs: recentJobs.data ?? [],
        totalLeads: l.length,
      };
    },
  });

  const kpis = [
    { label: "Today Revenue", value: inr(stats?.todayRevenue ?? 0), icon: IndianRupee, accent: "from-primary to-chart-5" },
    { label: "Monthly Revenue", value: inr(stats?.monthRevenue ?? 0), icon: TrendingUp, accent: "from-success to-chart-2" },
    { label: "Active Leads", value: stats?.activeLeads ?? 0, icon: Users, accent: "from-chart-3 to-primary" },
    { label: "Conversion Rate", value: `${stats?.conv ?? 0}%`, icon: Target, accent: "from-warning to-chart-4" },
    { label: "Pending Quotations", value: stats?.pendingQuotations ?? 0, icon: FileText, accent: "from-chart-5 to-primary" },
    { label: "Pending Jobs", value: stats?.pendingJobs ?? 0, icon: Factory, accent: "from-chart-4 to-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time view of leads, jobs, and revenue across MAM Industries.</p>
        </div>
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="panel p-4 relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br ${k.accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <k.icon className="size-4 text-muted-foreground" />
            <div className="mt-3 text-2xl font-bold font-display">{isLoading ? "…" : k.value}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{k.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2"><Activity className="size-4 text-primary" /> Recent Leads</h2>
            <Link to="/leads" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {stats?.recentLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No leads yet. <Link to="/leads" className="text-primary">Add the first one →</Link></p>}
            {stats?.recentLeads.map((l: any) => (
              <Link key={l.id} to="/leads/$id" params={{ id: l.id }} className="flex items-center justify-between p-3 rounded-md bg-background/40 hover:bg-accent/40 transition-colors border border-border/50">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{l.name} <span className="text-muted-foreground text-xs">· {l.company || "—"}</span></div>
                  <div className="text-xs text-muted-foreground font-mono">{l.lead_code}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${STATUS_TONE[l.status as keyof typeof STATUS_TONE]}`}>{LEAD_STATUS_LABELS[l.status as keyof typeof LEAD_STATUS_LABELS]}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-4"><Clock className="size-4 text-warning" /> Today's Follow-ups</h2>
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
              <div className="text-xs font-semibold text-destructive uppercase tracking-widest">⚠ {stats.missedFollowups.length} Missed</div>
              <Link to="/follow-ups" className="text-xs text-destructive hover:underline">Review missed follow-ups →</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2"><Factory className="size-4 text-primary" /> Production Status</h2>
            <Link to="/jobs" className="text-xs text-primary hover:underline">Open Kanban →</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(JOB_STAGE_LABELS).map(([stage, label]) => (
              <div key={stage} className="p-3 rounded-md bg-background/40 border border-border/50">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                <div className="text-xl font-bold font-display mt-1">{stats?.stageCount[stage] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display font-semibold mb-4">Upcoming Follow-ups</h2>
          {stats?.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {stats?.upcoming.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/50">
                  <div>
                    <div className="text-sm font-medium">{f.leads?.name}</div>
                    <div className="text-xs text-muted-foreground">{f.notes}</div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{fmtDate(f.due_date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
