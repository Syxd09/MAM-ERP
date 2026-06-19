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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { JOB_STAGES, JOB_STAGE_LABELS, fmtDate, inr, type JobStage } from "@/lib/erp";
import { Factory, Plus, Calendar, AlertCircle, Search, Trash2 } from "lucide-react";
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

interface CustomerMin {
  id: string;
  company_name: string;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  stage: JobStage;
  value: number;
  deadline?: string | null;
  created_at: string;
  material?: string | null;
  quantity: number;
  customer_id?: string | null;
  notes?: string | null;
  customers?: {
    company_name: string;
  } | null;
}

function JobsPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Job[]) ?? [];
    },
  });

  const { data: customers = [] } = useQuery<CustomerMin[]>({
    queryKey: ["customers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,company_name");
      return (data as CustomerMin[]) ?? [];
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
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.stage === newStage) return;
    move.mutate({ id: jobId, stage: newStage });
  }

  // Filter jobs reactively
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchQuery.trim() ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCustomer = selectedCustomerId === "all" || job.customer_id === selectedCustomerId;
    return matchesSearch && matchesCustomer;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="size-7 text-primary" /> Production Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag job cards across stages · {filteredJobs.length} of {jobs.length} jobs shown
          </p>
        </div>
        <NewJobDialog onSaved={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-secondary/20 border border-border/40 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Input
              placeholder="Search by job number or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          </div>
          <div className="w-full sm:w-56">
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || selectedCustomerId !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCustomerId("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {JOB_STAGES.map((stage) => {
            const stageJobs = filteredJobs.filter((j) => j.stage === stage);
            return (
              <Column key={stage} stage={stage} jobs={stageJobs} onCardClick={setSelectedJob} />
            );
          })}
        </div>
      </DndContext>

      {/* Interactive Job Details Drawer */}
      <Sheet
        open={selectedJob !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l border-border/80 bg-background/95 backdrop-blur-xl">
          <SheetHeader className="pb-4 border-b border-border/40">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Factory className="size-5 text-primary" /> Job Details
            </SheetTitle>
            <SheetDescription>
              Update production specifications and stage tracking.
            </SheetDescription>
          </SheetHeader>
          {selectedJob && (
            <JobDetailsForm
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onSaved={() => {
                setSelectedJob(null);
                qc.invalidateQueries({ queryKey: ["jobs"] });
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Column({
  stage,
  jobs,
  onCardClick,
}: {
  stage: JobStage;
  jobs: Job[];
  onCardClick: (job: Job) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-72 glass-panel p-3.5 transition-all border-border/80 ${
        isOver ? "ring-2 ring-primary/35 bg-accent/20 border-primary/30 scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-display font-semibold text-sm text-foreground">
          {JOB_STAGE_LABELS[stage]}
        </h3>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground border border-border/40">
          {jobs.length}
        </span>
      </div>
      <div className="space-y-2.5 min-h-[140px] max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} onClick={() => onCardClick(j)} />
        ))}
        {jobs.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-8 border border-dashed border-border/60 rounded-lg bg-background/10">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const overdue = job.deadline && new Date(job.deadline) < new Date() && job.stage !== "completed";

  const stageIndex = JOB_STAGES.indexOf(job.stage as JobStage);
  const progressPercent = Math.round(((stageIndex + 1) / JOB_STAGES.length) * 100);

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      onClick={(e) => {
        // Prevent click from triggering if actively dragging
        if (isDragging) return;
        onClick();
      }}
      className={`p-3.5 rounded-lg bg-card/70 hover:bg-card border ${STAGE_TONE[job.stage as JobStage]} cursor-grab active:cursor-grabbing hover-lift transition-all ${
        isDragging ? "opacity-40 scale-95 shadow-xl border-primary/40 z-50" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
        {overdue && (
          <span className="size-2 rounded-full bg-destructive animate-ping" title="Overdue!" />
        )}
      </div>
      <div className="font-medium text-sm mt-1.5 text-foreground leading-snug">{job.title}</div>
      <div className="text-xs text-muted-foreground truncate mt-1">
        {job.customers?.company_name || "—"}
      </div>
      <div className="flex items-center justify-between mt-3 text-[11px] border-t border-border/40 pt-2.5">
        <span
          className="text-muted-foreground font-medium truncate max-w-[130px]"
          title={job.material ?? ""}
        >
          {job.material || "—"} · Qty {job.quantity}
        </span>
        {job.value > 0 && (
          <span className="font-mono font-semibold text-foreground">{inr(job.value)}</span>
        )}
      </div>
      {job.deadline && (
        <div
          className={`inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded text-[9px] font-medium border ${
            overdue
              ? "bg-destructive/15 text-destructive border-destructive/25 shadow-[0_0_8px_rgba(var(--destructive),0.05)]"
              : "bg-secondary/60 text-muted-foreground border-border/50"
          }`}
        >
          {overdue ? <AlertCircle className="size-2.5" /> : <Calendar className="size-2.5" />}
          {fmtDate(job.deadline)}
        </div>
      )}

      {/* Micro Stage Progress Bar */}
      <div className="mt-3.5 space-y-1">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function JobDetailsForm({
  job,
  onClose,
  onSaved,
}: {
  job: Job;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: job.title || "",
    material: job.material || "",
    quantity: job.quantity || 1,
    deadline: job.deadline || "",
    customer_id: job.customer_id || "",
    value: job.value || 0,
    notes: job.notes || "",
    stage: job.stage as JobStage,
  });

  const { data: customers = [] } = useQuery<CustomerMin[]>({
    queryKey: ["customers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,company_name");
      return (data as CustomerMin[]) ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      const { error } = await supabase
        .from("jobs")
        .update({
          title: form.title,
          material: form.material || null,
          quantity: form.quantity,
          deadline: form.deadline || null,
          customer_id: form.customer_id || null,
          value: form.value,
          notes: form.notes || null,
          stage: form.stage,
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated successfully");
      onSaved();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to update job");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").delete().eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted successfully");
      onSaved();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to delete job");
    },
  });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <div className="space-y-4 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Job Number
          </Label>
          <div className="font-mono text-sm text-foreground bg-secondary/30 p-2 rounded border border-border/40 mt-1">
            {job.job_number}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 5mm MS Bracket — 500 nos"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Customer</Label>
          <Select
            value={form.customer_id || "none"}
            onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {customers.map((c) => (
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
            className="mt-1"
          />
        </div>

        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Deadline</Label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Value (₹)</Label>
          <Input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Production Stage</Label>
          <Select
            value={form.stage}
            onValueChange={(v) => setForm({ ...form, stage: v as JobStage })}
          >
            <SelectTrigger className="mt-1">
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
            rows={4}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Production notes, special requirements, bending angles etc."
            className="mt-1"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        {showConfirmDelete ? (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
            <span className="text-xs text-destructive font-medium">Are you sure?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Yes, Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" variant="destructive" onClick={() => setShowConfirmDelete(true)}>
            <Trash2 className="size-4 mr-1 inline" /> Delete Job
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gradient-industrial text-primary-foreground"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
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
  const { data: customers = [] } = useQuery<CustomerMin[]>({
    queryKey: ["customers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,company_name");
      return (data as CustomerMin[]) ?? [];
    },
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
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to create job");
    },
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
                {customers.map((c) => (
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
