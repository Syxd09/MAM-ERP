import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, AlertTriangle, FileWarning, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate, relativeTime } from "@/lib/erp";

type Alert = {
  id: string;
  kind: "followup_due" | "followup_overdue" | "job_overdue" | "quote_expiring" | "quote_expired";
  title: string;
  body: string;
  link: string;
  severity: "info" | "warning" | "critical";
  ts: string;
};

export function NotificationsBell() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["smart-alerts"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Alert[]> => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const in7Str = in7.toISOString().slice(0, 10);

      const [followups, jobs, quotes] = await Promise.all([
        supabase
          .from("follow_ups")
          .select("id,due_date,notes,lead_id,leads(name,company)")
          .eq("completed", false)
          .lte("due_date", in7Str)
          .order("due_date"),
        supabase
          .from("jobs")
          .select("id,job_number,title,deadline,stage")
          .not("deadline", "is", null)
          .neq("stage", "completed")
          .lte("deadline", in7Str),
        supabase
          .from("quotations")
          .select("id,quotation_number,customer_name,valid_until,status")
          .in("status", ["draft", "sent"])
          .not("valid_until", "is", null)
          .lte("valid_until", in7Str),
      ]);

      const alerts: Alert[] = [];
      (followups.data ?? []).forEach((f: any) => {
        const overdue = f.due_date < todayStr;
        alerts.push({
          id: `fu-${f.id}`,
          kind: overdue ? "followup_overdue" : "followup_due",
          title: overdue
            ? `Overdue follow-up · ${f.leads?.name ?? "lead"}`
            : `Follow-up due ${fmtDate(f.due_date)}`,
          body: f.notes || `${f.leads?.company || ""}`.trim() || "Pending follow-up",
          link: "/follow-ups",
          severity: overdue ? "critical" : "warning",
          ts: f.due_date,
        });
      });
      (jobs.data ?? []).forEach((j: any) => {
        const overdue = j.deadline < todayStr;
        alerts.push({
          id: `job-${j.id}`,
          kind: "job_overdue",
          title: overdue ? `Overdue job · ${j.job_number}` : `Job deadline ${fmtDate(j.deadline)}`,
          body: j.title,
          link: "/jobs",
          severity: overdue ? "critical" : "warning",
          ts: j.deadline,
        });
      });
      (quotes.data ?? []).forEach((q: any) => {
        const expired = q.valid_until < todayStr;
        alerts.push({
          id: `q-${q.id}`,
          kind: expired ? "quote_expired" : "quote_expiring",
          title: expired
            ? `Quotation expired · ${q.quotation_number}`
            : `Quote expires ${fmtDate(q.valid_until)}`,
          body: q.customer_name,
          link: "/quotations",
          severity: expired ? "critical" : "info",
          ts: q.valid_until,
        });
      });
      alerts.sort((a, b) => a.ts.localeCompare(b.ts));
      return alerts;
    },
  });

  const alerts = data ?? [];
  const unread = alerts.filter((a) => a.severity !== "info").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="font-display font-semibold text-sm">Smart Alerts</div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {alerts.length} active
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
              <div className="text-sm font-medium">All clear</div>
              <div className="text-xs text-muted-foreground">
                No upcoming deadlines or overdue items.
              </div>
            </div>
          ) : (
            alerts.map((a) => {
              const Icon =
                a.severity === "critical"
                  ? AlertTriangle
                  : a.kind.startsWith("quote")
                    ? FileWarning
                    : Clock;
              const tone =
                a.severity === "critical"
                  ? "text-destructive"
                  : a.severity === "warning"
                    ? "text-warning"
                    : "text-primary";
              return (
                <button
                  key={a.id}
                  onClick={() => navigate({ to: a.link })}
                  className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors flex gap-3"
                >
                  <Icon className={`size-4 mt-0.5 shrink-0 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.body}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                      {relativeTime(a.ts)}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
