import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { JOB_STAGES, JOB_STAGE_LABELS, fmtDate, inr, type JobStage } from "@/lib/erp";
import { Factory, Plus, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Production — MAM ERP" }] }),
  component: JobsPage,
});

const STAGE_TONE: Record<JobStage, string> = {
  design_received: "border-chart-5/40 bg-chart-5/5",
  programming: "border-chart-3/40 bg-chart-3/5",
  laser_cutting: "border-primary/40 bg-primary/5",
  bending: "border-warning/40 bg-warning/5",
  welding: "border-destructive/40 bg-destructive/5",
  powder_coating: "border-chart-4/40 bg-chart-4/5",
  quality_check: "border-chart-2/40 bg-chart-2/5",
  dispatch: "border-primary/40 bg-primary/5",
  completed: "border-success/40 bg-success/5",
};

function JobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: JobStage }) => {
      const { error } = await supabase.from("jobs").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const jobId = e.active.id as string;
    const newStage = e.over?.id as JobStage | undefined;
    if (!newStage) return;
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job || job.stage === newStage) return;
    move.mutate({ id: jobId, stage: newStage });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="size-7 text-primary" /> Production Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag job cards across stages · {jobs.length} total jobs
          </p>
        </div>
        <NewJobDialog onSaved={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {JOB_STAGES.map((stage) => {
            const stageJobs = jobs.filter((j: any) => j.stage === stage);
            return <Column key={stage} stage={stage} jobs={stageJobs} />;
          })}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, jobs }: { stage: JobStage; jobs: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-72 panel p-3 transition-colors ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-display font-semibold text-sm">{JOB_STAGE_LABELS[stage]}</h3>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-background/60 text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
        {jobs.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const overdue = job.deadline && new Date(job.deadline) < new Date() && job.stage !== "completed";
  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={`p-3 rounded-md bg-background/60 border ${STAGE_TONE[job.stage as JobStage]} cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div className="text-xs font-mono text-muted-foreground">{job.job_number}</div>
      <div className="font-medium text-sm mt-1">{job.title}</div>
      <div className="text-xs text-muted-foreground truncate">
        {job.customers?.company_name || "—"}
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-muted-foreground">
          {job.material || "—"} · Qty {job.quantity}
        </span>
        {job.value > 0 && <span className="font-mono">{inr(job.value)}</span>}
      </div>
      {job.deadline && (
        <div
          className={`flex items-center gap-1 mt-2 text-[10px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {overdue ? <AlertCircle className="size-3" /> : <Calendar className="size-3" />}
          {fmtDate(job.deadline)}
        </div>
      )}
    </motion.div>
  );
}

function NewJobDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    material: "",
    quantity: 1,
    deadline: "",
    customer_id: "",
    value: 0,
    notes: "",
    stage: "design_received" as JobStage,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-min"],
    queryFn: async () => (await supabase.from("customers").select("id,company_name")).data ?? [],
  });
  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!form.title) throw new Error("Title required");
      const { error } = await supabase.from("jobs").insert({
        title: form.title,
        material: form.material || null,
        quantity: form.quantity,
        deadline: form.deadline || null,
        customer_id: form.customer_id || null,
        value: form.value,
        notes: form.notes || null,
        stage: form.stage,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job created");
      setOpen(false);
      onSaved();
      setForm({
        title: "",
        material: "",
        quantity: 1,
        deadline: "",
        customer_id: "",
        value: 0,
        notes: "",
        stage: "design_received",
      });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-industrial">
          <Plus className="size-4 mr-1" /> New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Production Job</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 5mm MS Bracket — 500 nos"
            />
          </div>
          <div>
            <Label>Customer</Label>
            <Select
              value={form.customer_id}
              onValueChange={(v) => setForm({ ...form, customer_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
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
          <div>
            <Label>Material</Label>
            <Input
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
              placeholder="MS 5mm"
            />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div>
            <Label>Value (₹)</Label>
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Starting stage</Label>
            <Select
              value={form.stage}
              onValueChange={(v) => setForm({ ...form, stage: v as JobStage })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {JOB_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Create Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
