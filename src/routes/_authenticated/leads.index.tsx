import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  STATUS_TONE,
  leadSchema,
  inr,
  fmtDate,
  type LeadStatus,
} from "@/lib/erp";
import { toast } from "sonner";
import { Plus, Search, Filter, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Leads — MAM ERP" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = leads.filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(s) ||
      l.company?.toLowerCase().includes(s) ||
      l.phone?.toLowerCase().includes(s) ||
      l.lead_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="size-7 text-primary" /> Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} total · {filtered.length} shown
          </p>
        </div>
        <NewLeadDialog
          open={open}
          setOpen={setOpen}
          onSaved={() => qc.invalidateQueries({ queryKey: ["leads"] })}
        />
      </div>

      <div className="panel p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, phone, code…"
            className="pl-9 bg-background/60"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-56">
            <Filter className="size-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No leads. Click "Add Lead" to start.
                  </td>
                </tr>
              )}
              {filtered.map((l: any) => (
                <tr
                  key={l.id}
                  className="border-t border-border/50 hover:bg-accent/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.lead_code}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link to="/leads/$id" params={{ id: l.id }} className="hover:text-primary">
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.company || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${STATUS_TONE[l.status as LeadStatus]}`}
                    >
                      {LEAD_STATUS_LABELS[l.status as LeadStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{inr(l.estimated_value)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtDate(l.created_at)}
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

function NewLeadDialog({
  open,
  setOpen,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    requirement: "",
    notes: "",
    source: "website",
    status: "new",
    estimated_value: 0,
  });

  const mut = useMutation({
    mutationFn: async (data: typeof form) => {
      const parsed = leadSchema.parse(data);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("leads").insert({ ...parsed, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead added");
      setOpen(false);
      onSaved();
      setForm({
        name: "",
        company: "",
        phone: "",
        email: "",
        address: "",
        gst_number: "",
        requirement: "",
        notes: "",
        source: "website",
        status: "new",
        estimated_value: 0,
      });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-industrial">
          <Plus className="size-4 mr-1" /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="md:col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Company</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>GST</Label>
            <Input
              value={form.gst_number}
              onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Estimated Value (₹)</Label>
            <Input
              type="number"
              min="0"
              value={form.estimated_value}
              onChange={(e) => setForm({ ...form, estimated_value: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Requirement</Label>
            <Textarea
              rows={3}
              value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              placeholder="e.g. 5mm MS plate, 200 pieces, laser cut + bending"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="gradient-industrial"
            disabled={mut.isPending}
            onClick={() => mut.mutate(form)}
          >
            {mut.isPending ? "Saving…" : "Save Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
