import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { inr } from "@/lib/erp";
import { Plus, Trash2, ArrowLeft, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/lib/quotation-pdf";

export const Route = createFileRoute("/_authenticated/quotations/new")({
  head: () => ({ meta: [{ title: "New Quotation — MAM ERP" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    lead: typeof s.lead === "string" ? s.lead : undefined,
    customer: typeof s.customer === "string" ? s.customer : undefined,
  }),
  component: NewQuotationPage,
});

interface Item {
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

function NewQuotationPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [customerId, setCustomerId] = useState<string>("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_company: "",
    customer_phone: "",
    customer_email: "",
    customer_gst: "",
    customer_address: "",
    discount_pct: 0,
    gst_pct: 18,
    valid_until: "",
    notes: "",
    terms: "",
  });
  const [items, setItems] = useState<Item[]>([
    { description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0 },
  ]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-min"],
    queryFn: async () =>
      (
        await supabase
          .from("customers")
          .select("id,company_name,contact_person,phone,email,gst_number,address")
      ).data ?? [],
  });

  // Pre-fill from lead
  useEffect(() => {
    if (search.lead) {
      supabase
        .from("leads")
        .select("*")
        .eq("id", search.lead)
        .single()
        .then(({ data: l }) => {
          if (!l) return;
          setForm((f) => ({
            ...f,
            customer_name: l.name,
            customer_company: l.company || "",
            customer_phone: l.phone || "",
            customer_email: l.email || "",
            customer_gst: l.gst_number || "",
            customer_address: l.address || "",
          }));
          if (l.requirement)
            setItems([
              {
                description: l.requirement,
                hsn_code: "",
                quantity: 1,
                unit: "pcs",
                unit_price: Number(l.estimated_value) || 0,
              },
            ]);
        });
    }
  }, [search.lead]);

  useEffect(() => {
    if (customerId) {
      const c = customers.find((x: any) => x.id === customerId);
      if (c)
        setForm((f) => ({
          ...f,
          customer_name: c.contact_person || c.company_name,
          customer_company: c.company_name,
          customer_phone: c.phone || "",
          customer_email: c.email || "",
          customer_gst: c.gst_number || "",
          customer_address: c.address || "",
        }));
    }
  }, [customerId, customers]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
      0,
    );
    const discount_amount = (subtotal * Number(form.discount_pct || 0)) / 100;
    const after = subtotal - discount_amount;
    const gst_amount = (after * Number(form.gst_pct || 0)) / 100;
    const grand_total = after + gst_amount;
    return { subtotal, discount_amount, gst_amount, grand_total };
  }, [items, form.discount_pct, form.gst_pct]);

  const save = useMutation({
    mutationFn: async (alsoDownload: boolean) => {
      if (!form.customer_name) throw new Error("Customer name is required");
      if (items.length === 0 || items.every((i) => !i.description))
        throw new Error("Add at least one line item");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const insert = {
        customer_id: customerId || null,
        lead_id: search.lead || null,
        customer_name: form.customer_name,
        customer_company: form.customer_company,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        customer_gst: form.customer_gst,
        customer_address: form.customer_address,
        subtotal: totals.subtotal,
        discount_pct: form.discount_pct,
        discount_amount: totals.discount_amount,
        gst_pct: form.gst_pct,
        gst_amount: totals.gst_amount,
        grand_total: totals.grand_total,
        notes: form.notes,
        terms: form.terms,
        valid_until: form.valid_until || null,
        status: "draft",
        created_by: user?.id,
      };
      const { data: q, error } = await supabase
        .from("quotations")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      const itemRows = items
        .filter((i) => i.description)
        .map((i, pos) => ({
          quotation_id: q.id,
          position: pos,
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          amount: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
        }));
      const { error: itErr } = await supabase.from("quotation_items").insert(itemRows);
      if (itErr) throw itErr;
      if (alsoDownload) generateQuotationPDF({ ...(q as any), items: itemRows });
      return q;
    },
    onSuccess: () => {
      toast.success("Quotation created");
      navigate({ to: "/quotations" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <Link
          to="/quotations"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3" /> Back
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">New Quotation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold">Customer</h2>
          <div>
            <Label>Select existing customer (optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="— Manual entry —" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Contact name *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={form.customer_company}
                onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              />
            </div>
            <div>
              <Label>GST</Label>
              <Input
                value={form.customer_gst}
                onChange={(e) => setForm({ ...form, customer_gst: e.target.value })}
              />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="font-display font-semibold">Totals</h2>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={inr(totals.subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount %</span>
              <Input
                type="number"
                className="w-20 h-7 text-right"
                value={form.discount_pct}
                onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })}
              />
            </div>
            <Row label="Discount" value={`– ${inr(totals.discount_amount)}`} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GST %</span>
              <Input
                type="number"
                className="w-20 h-7 text-right"
                value={form.gst_pct}
                onChange={(e) => setForm({ ...form, gst_pct: Number(e.target.value) })}
              />
            </div>
            <Row label="GST" value={inr(totals.gst_amount)} />
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="font-display font-bold">GRAND TOTAL</span>
            <span className="font-display text-xl font-bold text-gradient">
              {inr(totals.grand_total)}
            </span>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Line Items</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setItems([
                ...items,
                { description: "", hsn_code: "", quantity: 1, unit: "pcs", unit_price: 0 },
              ])
            }
          >
            <Plus className="size-4 mr-1" /> Add row
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2 w-24">HSN</th>
                <th className="py-2 pr-2 w-20">Qty</th>
                <th className="py-2 pr-2 w-20">Unit</th>
                <th className="py-2 pr-2 w-28 text-right">Rate</th>
                <th className="py-2 pr-2 w-28 text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const amount = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                return (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-2">
                      <Input
                        value={it.description}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].description = e.target.value;
                          setItems(n);
                        }}
                        placeholder="e.g. 5mm MS laser cut – Pattern A"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={it.hsn_code}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].hsn_code = e.target.value;
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].quantity = Number(e.target.value);
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={it.unit}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].unit = e.target.value;
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        value={it.unit_price}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].unit_price = Number(e.target.value);
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2 text-right font-mono font-bold">{inr(amount)}</td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-5">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal notes shown on PDF"
          />
        </div>
        <div className="panel p-5">
          <Label>Terms (optional override)</Label>
          <Textarea
            rows={3}
            value={form.terms}
            onChange={(e) => setForm({ ...form, terms: e.target.value })}
            placeholder="Leave blank for default MAM Industries terms"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(true)}>
          <Download className="size-4 mr-1" /> Save & Download PDF
        </Button>
        <Button
          className="gradient-industrial"
          disabled={save.isPending}
          onClick={() => save.mutate(false)}
        >
          <Save className="size-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
