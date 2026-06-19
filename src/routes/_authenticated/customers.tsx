import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { customerSchema, fmtDate, inr } from "@/lib/erp";
import { toast } from "sonner";
import { Plus, Users, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — MAM ERP" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, quotations(grand_total,status), jobs(stage)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = customers.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(s) ||
      c.contact_person?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="size-7 text-primary" /> Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} customers</p>
        </div>
        <NewCustomerDialog onSaved={() => qc.invalidateQueries({ queryKey: ["customers"] })} />
      </div>

      <div className="panel p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="pl-9 bg-background/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full panel p-10 text-center text-muted-foreground">
            No customers.
          </div>
        )}
        {filtered.map((c: any) => {
          const totalRev = (c.quotations || [])
            .filter((q: any) => q.status === "approved")
            .reduce((s: number, q: any) => s + Number(q.grand_total), 0);
          const openJobs = (c.jobs || []).filter((j: any) => j.stage !== "completed").length;
          return (
            <div
              key={c.id}
              className="panel p-5 hover:shadow-[var(--shadow-elevated)] transition-shadow"
            >
              <div className="font-display font-semibold truncate">{c.company_name}</div>
              <div className="text-sm text-muted-foreground truncate">
                {c.contact_person || "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {c.phone || "—"} {c.email && `· ${c.email}`}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Orders
                  </div>
                  <div className="font-display font-bold">{c.quotations?.length || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Revenue
                  </div>
                  <div className="font-mono text-sm font-bold text-success">{inr(totalRev)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Open
                  </div>
                  <div className="font-display font-bold">{openJobs}</div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-3">
                Added {fmtDate(c.created_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewCustomerDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    gst_number: "",
    address: "",
    notes: "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const parsed = customerSchema.parse(form);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("customers")
        .insert({ ...parsed, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer added");
      setOpen(false);
      onSaved();
      setForm({
        company_name: "",
        contact_person: "",
        phone: "",
        email: "",
        gst_number: "",
        address: "",
        notes: "",
      });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-industrial">
          <Plus className="size-4 mr-1" /> Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Company name *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact person</Label>
            <Input
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
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
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
          <Button
            className="gradient-industrial"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
