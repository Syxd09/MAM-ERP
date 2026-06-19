import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDate, inr, QUOTATION_STATUSES } from "@/lib/erp";
import { FileText, Plus, Download, Trash2 } from "lucide-react";
import { generateQuotationPDF } from "@/lib/quotation-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quotations/")({
  head: () => ({ meta: [{ title: "Quotations — MAM ERP" }] }),
  component: QuotationsPage,
});

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/15 text-primary border-primary/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-warning/15 text-warning border-warning/30",
};

function QuotationsPage() {
  const qc = useQueryClient();
  const { data: quotations = [] } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function downloadPDF(qid: string) {
    const [{ data: q }, { data: items }] = await Promise.all([
      supabase.from("quotations").select("*").eq("id", qid).single(),
      supabase.from("quotation_items").select("*").eq("quotation_id", qid).order("position"),
    ]);
    if (!q) return;
    generateQuotationPDF({ ...q, items: items || [] } as any);
  }

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("quotations")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="size-7 text-primary" /> Quotations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{quotations.length} quotations</p>
        </div>
        <Link to="/quotations/new">
          <Button className="gradient-industrial">
            <Plus className="size-4 mr-1" /> New Quotation
          </Button>
        </Link>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Valid</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No quotations yet.
                  </td>
                </tr>
              )}
              {quotations.map((q: any) => (
                <tr key={q.id} className="border-t border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-3 font-mono text-xs">{q.quotation_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{q.customer_company || q.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{q.customer_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={q.status}
                      onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}
                    >
                      <SelectTrigger
                        className={`h-7 text-xs uppercase tracking-widest w-[140px] ${STATUS_TONE[q.status]}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTATION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{inr(q.grand_total)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtDate(q.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtDate(q.valid_until)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => downloadPDF(q.id)}>
                      <Download className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete quotation?")) del.mutate(q.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
