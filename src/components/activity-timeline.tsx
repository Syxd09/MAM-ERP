import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/erp";
import { Activity, Plus, Edit3, Trash2, RefreshCw, FileDown, MessageSquare } from "lucide-react";

const ACTION_ICON: Record<string, any> = {
  created: Plus,
  updated: Edit3,
  deleted: Trash2,
  status_changed: RefreshCw,
  stage_changed: RefreshCw,
  exported: FileDown,
  note_added: MessageSquare,
};

const ACTION_TONE: Record<string, string> = {
  created: "text-success bg-success/10",
  updated: "text-primary bg-primary/10",
  deleted: "text-destructive bg-destructive/10",
  status_changed: "text-warning bg-warning/10",
  stage_changed: "text-warning bg-warning/10",
  exported: "text-chart-5 bg-chart-5/10",
  note_added: "text-chart-3 bg-chart-3/10",
};

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 20,
}: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activity", entityType, entityId, limit],
    queryFn: async () => {
      let q = (supabase as any)
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entityType) q = q.eq("entity_type", entityType);
      if (entityId) q = q.eq("entity_id", entityId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading)
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading activity…</div>;

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        <Activity className="size-6 mx-auto mb-2 opacity-50" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {rows.map((r: any) => {
        const Icon = ACTION_ICON[r.action] || Activity;
        const tone = ACTION_TONE[r.action] || "text-muted-foreground bg-muted";
        return (
          <div key={r.id} className="relative pl-10">
            <div
              className={`absolute left-0 top-0 size-8 rounded-full flex items-center justify-center border border-border ${tone}`}
            >
              <Icon className="size-3.5" />
            </div>
            <div className="text-sm">
              <span className="font-medium capitalize">{r.action.replace("_", " ")}</span>{" "}
              <span className="text-muted-foreground">
                {r.entity_type}
                {r.entity_label ? ` · ${r.entity_label}` : ""}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{r.user_email || "system"}</span>
              <span>·</span>
              <span className="font-mono">{relativeTime(r.created_at)}</span>
            </div>
            {r.changes && Object.keys(r.changes).length > 0 && (
              <div className="mt-1.5 text-xs bg-background/40 border border-border/50 rounded px-2 py-1 font-mono text-muted-foreground max-w-2xl">
                {Object.entries(r.changes)
                  .slice(0, 3)
                  .map(([k, v]: any) => (
                    <div key={k}>
                      <span className="text-foreground/70">{k}:</span> {String(v).slice(0, 80)}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
