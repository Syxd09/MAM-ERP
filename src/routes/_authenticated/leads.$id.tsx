import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, STATUS_TONE, inr, fmtDate, type LeadStatus } from "@/lib/erp";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus, CalendarClock, CheckCircle2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lead } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ["followups", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("follow_ups").select("*").eq("lead_id", id).order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lead deleted"); navigate({ to: "/leads" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const convertToCustomer = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { data: cust, error } = await supabase.from("customers").insert({
        company_name: lead.company || lead.name,
        contact_person: lead.name,
        phone: lead.phone, email: lead.email, gst_number: lead.gst_number, address: lead.address,
      }).select().single();
      if (error) throw error;
      await supabase.from("leads").update({ customer_id: cust.id, status: "won" }).eq("id", id);
      return cust;
    },
    onSuccess: () => { toast.success("Converted to customer"); qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!lead) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Back to leads</Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{lead.lead_code}</span>
            <span>·</span>
            <span>{lead.company || "—"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => convertToCustomer.mutate()} disabled={!!lead.customer_id || convertToCustomer.isPending}>
            <CheckCircle2 className="size-4 mr-1" /> {lead.customer_id ? "Converted" : "Convert to Customer"}
          </Button>
          <Link to="/quotations/new" search={{ lead: id } as any}>
            <Button variant="outline"><FileText className="size-4 mr-1" /> Quotation</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this lead?")) del.mutate(); }}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold">Lead Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Phone" value={lead.phone} />
            <Field label="Email" value={lead.email} />
            <Field label="GST" value={lead.gst_number} />
            <Field label="Source" value={LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]} />
            <Field label="Estimated Value" value={inr(lead.estimated_value)} />
            <Field label="Created" value={fmtDate(lead.created_at)} />
            <div className="md:col-span-2"><Field label="Address" value={lead.address} /></div>
            <div className="md:col-span-2"><Field label="Requirement" value={lead.requirement} pre /></div>
            <div className="md:col-span-2"><Field label="Notes" value={lead.notes} pre /></div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="font-display font-semibold">Status & Source</h2>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Status</Label>
            <Select value={lead.status} onValueChange={v => update.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
            <div className="mt-2"><span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${STATUS_TONE[lead.status as LeadStatus]}`}>{LEAD_STATUS_LABELS[lead.status as LeadStatus]}</span></div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Source</Label>
            <Select value={lead.source} onValueChange={v => update.mutate({ source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold flex items-center gap-2"><CalendarClock className="size-4 text-primary" /> Follow-ups</h2>
          <NewFollowUpDialog leadId={id} onSaved={() => qc.invalidateQueries({ queryKey: ["followups", id] })} />
        </div>
        {followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No follow-ups scheduled.</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((f: any) => (
              <div key={f.id} className={`flex items-center justify-between p-3 rounded-md border ${f.completed ? "bg-success/5 border-success/20 opacity-60" : "bg-background/40 border-border/50"}`}>
                <div className="flex-1">
                  <div className="text-sm font-medium">{f.notes || "—"}</div>
                  <div className="text-xs text-muted-foreground font-mono">Due {fmtDate(f.due_date)}</div>
                </div>
                {!f.completed && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await supabase.from("follow_ups").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", f.id);
                    qc.invalidateQueries({ queryKey: ["followups", id] });
                    toast.success("Marked complete");
                  }}><CheckCircle2 className="size-4 text-success" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, pre }: { label: string; value: any; pre?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-sm mt-1 ${pre ? "whitespace-pre-wrap" : ""}`}>{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function NewFollowUpDialog({ leadId, onSaved }: { leadId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("follow_ups").insert({ lead_id: leadId, due_date: date, notes, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Follow-up scheduled"); setOpen(false); onSaved(); setNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="size-4 mr-1" /> Add</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Due date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Call to confirm material spec" /></div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending} className="gradient-industrial">Schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
