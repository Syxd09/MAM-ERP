import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, AlertTriangle, FileWarning, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate, relativeTime } from "@/lib/erp";
import { toast } from "sonner";

type Alert = {
  id: string;
  kind: "followup_due" | "followup_overdue" | "job_overdue" | "quote_expiring" | "quote_expired" | "db_notification";
  title: string;
  body: string;
  link: string;
  severity: "info" | "warning" | "critical";
  ts: string;
};

export function NotificationsBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["smart-alerts"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Alert[]> => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const in7Str = in7.toISOString().slice(0, 10);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const [followups, jobs, quotes, dbNotifications] = await Promise.all([
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
        supabase
          .from("notifications")
          .select("id,title,body,link,severity,created_at")
          .eq("user_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false }),
      ]);

      const alerts: Alert[] = [];
      
      (dbNotifications.data ?? []).forEach((n: any) => {
        alerts.push({
          id: `db-${n.id}`,
          kind: "db_notification",
          title: n.title,
          body: n.body || "",
          link: n.link || "/jobs",
          severity: (n.severity as any) || "warning",
          ts: n.created_at,
        });
      });

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

      // Sort db notifications first, then by timestamp
      alerts.sort((a, b) => {
        if (a.kind === "db_notification" && b.kind !== "db_notification") return -1;
        if (a.kind !== "db_notification" && b.kind === "db_notification") return 1;
        return b.ts.localeCompare(a.ts);
      });

      return alerts;
    },
  });

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      if (!alertId.startsWith("db-")) return;
      const dbId = alertId.replace("db-", "");
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", dbId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-alerts"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-alerts"] });
      toast.success("All notifications marked as read");
    },
  });

  const alerts = data ?? [];
  const unread = alerts.filter((a) => a.severity !== "info").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 cursor-pointer rounded-sm">
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-4 rounded-none bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 bg-card border border-border rounded-sm shadow-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-xs text-foreground uppercase tracking-wider font-sans">Smart Alerts & Notifications</div>
          <div className="flex items-center gap-2">
            {alerts.some((a) => a.kind === "db_notification") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-[9px] text-primary hover:text-primary-foreground h-6 px-2 rounded-sm cursor-pointer border border-border bg-background flex items-center gap-1"
              >
                <Check className="size-3" /> Mark all read
              </Button>
            )}
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              {alerts.length} active
            </span>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto pr-0.5 scrollbar-thin">
          {alerts.length === 0 ? (
            <div className="p-8 text-center bg-card">
              <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">All clear</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                No upcoming deadlines or unread notifications.
              </div>
            </div>
          ) : (
            alerts.map((a) => {
              const Icon =
                a.severity === "critical"
                  ? AlertTriangle
                  : a.kind === "db_notification"
                    ? Bell
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
                  onClick={async () => {
                    if (a.id.startsWith("db-")) {
                      await markRead.mutateAsync(a.id);
                    }
                    navigate({ to: a.link });
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/80 transition-colors flex gap-3 cursor-pointer ${
                    a.kind === "db_notification" ? "bg-primary/[0.01]" : ""
                  }`}
                >
                  <Icon className={`size-4.5 mt-0.5 shrink-0 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.body}</div>
                    <div className="text-[9px] text-muted-foreground/50 mt-1 font-mono">
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
