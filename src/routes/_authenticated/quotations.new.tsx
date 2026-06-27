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
  validateSearch: (s: Record<string, unknown>): { lead?: string; customer?: string } => ({
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
    // New fields
    po_number: "",
    po_date: "",
    vehicle_no: "",
    eway_no: "",
    dc_no: "",
    dc_date: "",
    ship_to_name: "",
    ship_to_company: "",
    ship_to_address: "",
    ship_to_gst: "",
    same_as_billing: true,
    copy_type: "original" as "original" | "duplicate" | "transporter",
    bank_name: "BANK OF INDIA",
    bank_acc_no: "",
    bank_ifsc: "",
    company_pan: "",
    document_title: "TAX INVOICE",
    pdf_format: "standard" as "standard" | "classic",
    signatory_company: "For MAM Industries",
    signatory_name: "Mari Muthu R",
    print_seal: true,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [templateName, setTemplateName] = useState<string>("");

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["quotation-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleLoadTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId || templateId === "none") return;
    const [{ data: t }, { data: itemsData }] = await Promise.all([
      supabase.from("quotation_templates").select("*").eq("id", templateId).single(),
      supabase.from("quotation_template_items").select("*").eq("template_id", templateId).order("position"),
    ]);
    if (t) {
      setForm((f) => ({
        ...f,
        document_title: t.document_title || "QUOTATION",
        pdf_format: (t.pdf_format || "standard") as "standard" | "classic",
        terms: t.terms || "",
        notes: t.notes || "",
        bank_name: t.bank_name || "BANK OF INDIA",
        bank_acc_no: t.bank_acc_no || "",
        bank_ifsc: t.bank_ifsc || "",
        company_pan: t.company_pan || "",
        signatory_company: t.signatory_company || "For MAM Industries",
        signatory_name: t.signatory_name || "Mari Muthu R",
        print_seal: t.print_seal ?? true,
      }));
      if (itemsData && itemsData.length > 0) {
        setItems(
          itemsData.map((it) => ({
            description: it.description,
            hsn_code: it.hsn_code || "",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "pcs",
            unit_price: Number(it.unit_price) || 0,
          }))
        );
      }
      toast.success(`Loaded template: ${t.name}`);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      const { data: t, error: tErr } = await supabase
        .from("quotation_templates")
        .insert({
          name: templateName.trim(),
          document_title: form.document_title || null,
          pdf_format: form.pdf_format || "standard",
          terms: form.terms || null,
          notes: form.notes || null,
          bank_name: form.bank_name || null,
          bank_acc_no: form.bank_acc_no || null,
          bank_ifsc: form.bank_ifsc || null,
          company_pan: form.company_pan || null,
          signatory_company: form.signatory_company || null,
          signatory_name: form.signatory_name || null,
          print_seal: form.print_seal,
        })
        .select()
        .single();
      if (tErr) throw tErr;
      const itemRows = items
        .filter((i) => i.description)
        .map((i, pos) => ({
          template_id: t.id,
          position: pos,
          description: i.description,
          hsn_code: i.hsn_code || null,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
        }));
      if (itemRows.length > 0) {
        const { error: itErr } = await supabase.from("quotation_template_items").insert(itemRows);
        if (itErr) throw itErr;
      }
      toast.success(`Saved template: ${t.name}`);
      setTemplateName("");
      refetchTemplates();
    } catch (e: any) {
      toast.error(`Failed to save template: ${e.message}`);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === "none") return;
    try {
      const { error } = await supabase
        .from("quotation_templates")
        .delete()
        .eq("id", selectedTemplateId);
      if (error) throw error;
      toast.success("Template deleted");
      setSelectedTemplateId("none");
      refetchTemplates();
    } catch (e: any) {
      toast.error(`Failed to delete template: ${e.message}`);
    }
  };

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
        // New columns
        po_number: form.po_number || null,
        po_date: form.po_date || null,
        vehicle_no: form.vehicle_no || null,
        eway_no: form.eway_no || null,
        dc_no: form.dc_no || null,
        dc_date: form.dc_date || null,
        ship_to_name: form.same_as_billing ? form.customer_name : form.ship_to_name || null,
        ship_to_company: form.same_as_billing ? form.customer_company : form.ship_to_company || null,
        ship_to_address: form.same_as_billing ? form.customer_address : form.ship_to_address || null,
        ship_to_gst: form.same_as_billing ? form.customer_gst : form.ship_to_gst || null,
        bank_name: form.bank_name || null,
        bank_acc_no: form.bank_acc_no || null,
        bank_ifsc: form.bank_ifsc || null,
        company_pan: form.company_pan || null,
        document_title: form.document_title || null,
        pdf_format: form.pdf_format || "standard",
        signatory_company: form.signatory_company || "For MAM Industries",
        signatory_name: form.signatory_name || "Mari Muthu R",
        print_seal: form.print_seal,
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
      if (alsoDownload) generateQuotationPDF({ ...(q as any), items: itemRows, copy_type: form.copy_type } as any);
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
        <div className="lg:col-span-2 space-y-4">
          <div className="panel p-5 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Load from Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="— Select a template to populate fields —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Start Empty)</SelectItem>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplateId && selectedTemplateId !== "none" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteTemplate}
                  title="Delete template"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="panel p-5 space-y-4">
            <h2 className="font-display font-semibold">Customer (Billing Details)</h2>
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

          {/* Shipping Details */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">Shipping Details</h2>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.same_as_billing}
                  onChange={(e) => setForm({ ...form, same_as_billing: e.target.checked })}
                  className="rounded border-border bg-black/20"
                />
                Same as billing info
              </label>
            </div>
            {!form.same_as_billing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in-up">
                <div>
                  <Label>Contact name</Label>
                  <Input
                    value={form.ship_to_name}
                    onChange={(e) => setForm({ ...form, ship_to_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={form.ship_to_company}
                    onChange={(e) => setForm({ ...form, ship_to_company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>GST</Label>
                  <Input
                    value={form.ship_to_gst}
                    onChange={(e) => setForm({ ...form, ship_to_gst: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    rows={2}
                    value={form.ship_to_address}
                    onChange={(e) => setForm({ ...form, ship_to_address: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* PO, Challan & Transport Details */}
          <div className="panel p-5 space-y-4">
            <h2 className="font-display font-semibold">PO, Challan & Transport Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>PO Number</Label>
                <Input
                  value={form.po_number}
                  onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                  placeholder="e.g. PO-12345"
                />
              </div>
              <div>
                <Label>PO Date</Label>
                <Input
                  type="date"
                  value={form.po_date}
                  onChange={(e) => setForm({ ...form, po_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  value={form.vehicle_no}
                  onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })}
                  placeholder="e.g. KA-51-AB-1234"
                />
              </div>
              <div>
                <Label>E-WAY Number</Label>
                <Input
                  value={form.eway_no}
                  onChange={(e) => setForm({ ...form, eway_no: e.target.value })}
                  placeholder="e.g. 1213 1415 1617"
                />
              </div>
              <div>
                <Label>D.C. Number</Label>
                <Input
                  value={form.dc_no}
                  onChange={(e) => setForm({ ...form, dc_no: e.target.value })}
                  placeholder="e.g. DC-789"
                />
              </div>
              <div>
                <Label>D.C. Date</Label>
                <Input
                  type="date"
                  value={form.dc_date}
                  onChange={(e) => setForm({ ...form, dc_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bank Details, PAN, Title & Signatory */}
          <div className="panel p-5 space-y-4">
            <h2 className="font-display font-semibold">Bank Details, PAN, Title & Signatory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Document Title</Label>
                <Input
                  value={form.document_title}
                  onChange={(e) => setForm({ ...form, document_title: e.target.value })}
                  placeholder="e.g. TAX INVOICE or QUOTATION"
                />
              </div>
              <div>
                <Label>Company PAN</Label>
                <Input
                  value={form.company_pan}
                  onChange={(e) => setForm({ ...form, company_pan: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                />
              </div>
              <div>
                <Label>Signatory Company</Label>
                <Input
                  value={form.signatory_company}
                  onChange={(e) => setForm({ ...form, signatory_company: e.target.value })}
                  placeholder="e.g. For MAM Industries"
                />
              </div>
              <div>
                <Label>Signatory Name</Label>
                <Input
                  value={form.signatory_name}
                  onChange={(e) => setForm({ ...form, signatory_name: e.target.value })}
                  placeholder="e.g. Mari Muthu R"
                />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. BANK OF INDIA"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={form.bank_acc_no}
                  onChange={(e) => setForm({ ...form, bank_acc_no: e.target.value })}
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Branch & IFSC Code</Label>
                <Input
                  value={form.bank_ifsc}
                  onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })}
                  placeholder="e.g. JIGANI BRANCH - BKID0008400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3 self-start">
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PDF Template</span>
              <Select
                value={form.pdf_format}
                onValueChange={(v: any) => setForm({ ...form, pdf_format: v })}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard GST</SelectItem>
                  <SelectItem value="classic">Classic Simple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Print Copy</span>
              <Select
                value={form.copy_type}
                onValueChange={(v: any) => setForm({ ...form, copy_type: v })}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="transporter">Transporter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Print Seal Signature</span>
              <Select
                value={form.print_seal ? "yes" : "no"}
                onValueChange={(v: any) => setForm({ ...form, print_seal: v === "yes" })}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-3 border-t border-border space-y-3">
              <div>
                <Label htmlFor="templateName" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Save as Template
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="templateName"
                    placeholder="Template Name..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="h-8 text-xs px-3"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
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
