import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/erp";
import { ClipboardList, TrendingUp, Users, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — MAM ERP" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [q, l, c] = await Promise.all([
        supabase.from("quotations").select("status,grand_total,created_at,customer_company"),
        supabase.from("leads").select("status,source,estimated_value,created_at"),
        supabase.from("customers").select("id,company_name,quotations(grand_total,status)"),
      ]);
      return { quotations: q.data ?? [], leads: l.data ?? [], customers: c.data ?? [] };
    },
  });

  const approved = (data?.quotations ?? []).filter((q) => q.status === "approved");
  const totalRev = approved.reduce((s, q) => s + Number(q.grand_total), 0);
  const wonLeads = (data?.leads ?? []).filter((l) => l.status === "won").length;
  const totalLeads = (data?.leads ?? []).length;

  const topCustomers = (data?.customers ?? [])
    .map((c: any) => ({
      name: c.company_name,
      revenue: (c.quotations || [])
        .filter((q: any) => q.status === "approved")
        .reduce((s: number, q: any) => s + Number(q.grand_total), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="size-7 text-primary" /> Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue, conversion, and customer analytics.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card icon={TrendingUp} label="Total Revenue (Approved)" value={inr(totalRev)} />
        <Card icon={FileText} label="Approved Quotations" value={approved.length} />
        <Card icon={Users} label="Total Leads" value={totalLeads} />
        <Card
          icon={Users}
          label="Won Leads"
          value={`${wonLeads} (${totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0}%)`}
        />
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Top Customers by Revenue</h2>
          <button
            onClick={() => exportCSV(topCustomers, "top-customers.csv")}
            className="text-xs text-primary hover:underline"
          >
            Export CSV
          </button>
        </div>
        <div className="space-y-2">
          {topCustomers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
          )}
          {topCustomers.map((c, i) => (
            <div
              key={c.name}
              className="flex items-center justify-between p-3 rounded-md bg-background/40 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <span className="size-7 rounded gradient-industrial text-xs flex items-center justify-center font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="font-medium">{c.name}</span>
              </div>
              <span className="font-mono font-bold">{inr(c.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Quotations Export</h2>
          <button
            onClick={() => exportCSV(data?.quotations ?? [], "quotations.csv")}
            className="text-xs text-primary hover:underline"
          >
            Download CSV
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Export all quotation rows for accounting / Excel.
        </p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="panel p-4">
      <Icon className="size-4 text-muted-foreground" />
      <div className="text-2xl font-display font-bold mt-2">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
