import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/erp";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({ meta: [{ title: "Follow-ups — MAM ERP" }] }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["all-followups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*, leads(id,name,company,lead_code,phone)")
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const groups = {
    missed: items.filter((f: any) => !f.completed && f.due_date < today),
    today: items.filter((f: any) => !f.completed && f.due_date === today),
    upcoming: items.filter((f: any) => !f.completed && f.due_date > today),
    done: items.filter((f: any) => f.completed),
  };

  async function markDone(id: string) {
    await supabase
      .from("follow_ups")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-followups"] });
    toast.success("Marked complete");
  }

  const sections = [
    { key: "missed", label: "Missed", tone: "text-destructive", items: groups.missed },
    { key: "today", label: "Today", tone: "text-warning", items: groups.today },
    { key: "upcoming", label: "Upcoming", tone: "text-primary", items: groups.upcoming },
    { key: "done", label: "Completed", tone: "text-success", items: groups.done.slice(0, 20) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="size-7 text-primary" /> Follow-ups
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {groups.missed.length} missed · {groups.today.length} today · {groups.upcoming.length}{" "}
          upcoming
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.key} className="panel p-5">
            <h2 className={`font-display font-semibold mb-3 ${s.tone}`}>
              {s.label}{" "}
              <span className="text-muted-foreground text-sm font-normal">({s.items.length})</span>
            </h2>
            {s.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nothing here.</p>
            ) : (
              <div className="space-y-2">
                {s.items.map((f: any) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/50"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/leads/$id"
                        params={{ id: f.leads?.id }}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {f.leads?.name}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">{f.notes || "—"}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-1">
                        {fmtDate(f.due_date)} · {f.leads?.lead_code}
                      </div>
                    </div>
                    {!f.completed && (
                      <Button size="icon" variant="ghost" onClick={() => markDone(f.id)}>
                        <CheckCircle2 className="size-4 text-success" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
