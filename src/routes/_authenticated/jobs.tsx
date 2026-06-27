import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
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
import {
  Factory,
  Plus,
  Calendar,
  AlertCircle,
  Search,
  Trash2,
  FileText,
  Cpu,
  Zap,
  ChevronsDown,
  Flame,
  Palette,
  ShieldCheck,
  Truck,
  CheckCircle,
  Upload,
  Download,
  Image as ImageIcon,
  FileUp,
  X,
  ExternalLink,
  Check,
  User,
  Eye,
  Loader2,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Production Queue — MAM ERP" }] }),
  component: JobsPage,
});

// Professional solid status borders
const STAGE_TONE: Record<JobStage, string> = {
  design_received: "border-l-indigo-600 border-border",
  programming: "border-l-purple-600 border-border",
  laser_cutting: "border-l-blue-600 border-border",
  bending: "border-l-amber-600 border-border",
  welding: "border-l-red-600 border-border",
  powder_coating: "border-l-pink-600 border-border",
  quality_check: "border-l-teal-600 border-border",
  dispatch: "border-l-cyan-600 border-border",
  completed: "border-l-green-600 border-border",
};

const STAGE_ICONS: Record<JobStage, any> = {
  design_received: FileText,
  programming: Cpu,
  laser_cutting: Zap,
  bending: ChevronsDown,
  welding: Flame,
  powder_coating: Palette,
  quality_check: ShieldCheck,
  dispatch: Truck,
  completed: CheckCircle,
};

const STAGE_COLORS: Record<JobStage, string> = {
  design_received: "bg-indigo-950/40 text-indigo-400 border border-indigo-900/50",
  programming: "bg-purple-950/40 text-purple-400 border border-purple-900/50",
  laser_cutting: "bg-blue-950/40 text-blue-400 border border-blue-900/50",
  bending: "bg-amber-950/40 text-amber-400 border border-amber-900/50",
  welding: "bg-red-950/40 text-red-400 border border-red-900/50",
  powder_coating: "bg-pink-950/40 text-pink-400 border border-pink-900/50",
  quality_check: "bg-teal-950/40 text-teal-400 border border-teal-900/50",
  dispatch: "bg-cyan-950/40 text-cyan-400 border border-cyan-900/50",
  completed: "bg-green-950/40 text-green-400 border border-green-900/50",
};

const STAGE_SHORT_LABELS: Record<JobStage, string> = {
  design_received: "Design",
  programming: "Program",
  laser_cutting: "Laser Cut",
  bending: "Bending",
  welding: "Welding",
  powder_coating: "Coating",
  quality_check: "Quality",
  dispatch: "Dispatch",
  completed: "Completed",
};

interface CustomerMin {
  id: string;
  company_name: string;
}

interface FileAttachment {
  name: string;
  type: string;
  url: string;
}

interface CompletionPhoto {
  name: string;
  url: string;
}

interface JobNotesData {
  notesText?: string;
  designFile?: FileAttachment;
  completionPhoto?: CompletionPhoto;
  completedBy?: string;
  completedAt?: string;
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
  created_by?: string | null;
  assigned_to?: string | null;
  customers?: {
    company_name: string;
  } | null;
}

function parseJobNotes(notesStr: string | null | undefined): JobNotesData {
  if (!notesStr) return {};
  try {
    const trimmed = notesStr.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return JSON.parse(trimmed);
    }
  } catch (e) {
    // Treat as plain text
  }
  return { notesText: notesStr || "" };
}

function serializeJobNotes(data: JobNotesData): string {
  return JSON.stringify(data);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

async function uploadFile(file: File): Promise<FileAttachment> {
  const fileExt = file.name.split(".").pop() || "";
  try {
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `production/${fileName}`;

    const { data, error } = await supabase.storage.from("production_attachments").upload(filePath, file);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from("production_attachments").getPublicUrl(filePath);
    return {
      name: file.name,
      type: file.type || fileExt,
      url: publicUrlData.publicUrl,
    };
  } catch (err) {
    console.warn("Storage upload failed, falling back to Base64 data URI:", err);
    const base64 = await fileToBase64(file);
    return {
      name: file.name,
      type: file.type || fileExt,
      url: base64,
    };
  }
}

function JobsPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  const [completionJob, setCompletionJob] = useState<Job | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; title: string } | null>(null);

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

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const mappedRoles = roles?.map((r) => r.role) ?? [];
      if (user.email === "syxdmatheen.9@gmail.com" && !mappedRoles.includes("admin")) {
        mappedRoles.push("admin");
      }
      return { user, profile: prof, roles: mappedRoles };
    },
  });

  const isAdminOrManager = profile?.roles?.some((r) => r === "admin" || r === "manager") ?? false;

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: JobStage }) => {
      const { error } = await supabase.from("jobs").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job stage updated");
    },
    onError: (e) => {
      toast.error(e.message);
    }
  });

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchQuery.trim() ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.material && job.material.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCustomer = selectedCustomerId === "all" || job.customer_id === selectedCustomerId;
    const matchesStage = selectedStageFilter === "all" || job.stage === selectedStageFilter;
    return matchesSearch && matchesCustomer && matchesStage;
  });

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header Row */}
      <div className="flex items-end justify-between flex-wrap gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
            <Factory className="size-6 text-primary" /> Production Board
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor shop floor queue, view drawings, and post task completions.
          </p>
        </div>
        {isAdminOrManager && (
          <NewJobDialog onSaved={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
        )}
      </div>

      {/* Routine Workload Dashboard Snapshot (Solid design, sharp corners) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-mono">
            Daily Production Routine Snapshot
          </h2>
          <span className="text-[10px] font-medium text-muted-foreground/45 font-mono">
            Select stage to filter list
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
          <button
            onClick={() => setSelectedStageFilter("all")}
            className={`p-3 border text-left cursor-pointer flex items-center gap-3 w-full rounded-sm transition-colors ${
              selectedStageFilter === "all"
                ? "border-primary bg-primary/10 text-white"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className={`size-7 rounded-sm shrink-0 flex items-center justify-center bg-white/5 text-white border border-white/10`}>
              <CheckSquare className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                All Stages
              </div>
              <div className="text-xs font-bold text-foreground mt-0.5">
                {jobs.length} jobs
              </div>
            </div>
          </button>

          {JOB_STAGES.map((stage) => {
            const Icon = STAGE_ICONS[stage];
            const stageJobs = jobs.filter((j) => j.stage === stage);
            const isSelected = selectedStageFilter === stage;

            return (
              <button
                key={stage}
                onClick={() => setSelectedStageFilter(stage)}
                className={`p-3 border text-left cursor-pointer flex items-center gap-3 w-full rounded-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 text-white"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div
                  className={`size-7 rounded-sm shrink-0 ${STAGE_COLORS[stage]} flex items-center justify-center`}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                    {STAGE_SHORT_LABELS[stage]}
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {stageJobs.length} {stageJobs.length === 1 ? "job" : "jobs"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-sm">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Input
              placeholder="Search number, title, material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 rounded-sm bg-background border-border text-xs"
            />
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          </div>
          <div className="w-full sm:w-52">
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="h-9 rounded-sm bg-background border-border text-xs">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border rounded-sm">
                <SelectItem value="all" className="text-xs">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || selectedCustomerId !== "all" || selectedStageFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCustomerId("all");
              setSelectedStageFilter("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-sm cursor-pointer"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Main Production Queue List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border bg-card/20 rounded-sm">
            <Factory className="size-10 text-muted-foreground mx-auto opacity-35 mb-2.5" />
            <h3 className="text-sm font-bold text-foreground">No active production jobs</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              There are no jobs matching the selected criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobQueueCard
                key={job.id}
                job={job}
                isAdmin={isAdminOrManager}
                onEditClick={setSelectedJob}
                onStageChange={(stage) => updateStageMutation.mutate({ id: job.id, stage })}
                onMarkDoneClick={setCompletionJob}
                onPreviewImage={(url, title) => setLightboxUrl({ url, title })}
                onSaved={() => qc.invalidateQueries({ queryKey: ["jobs"] })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Interactive Job Details Drawer */}
      <Sheet
        open={selectedJob !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l border-border bg-card rounded-none">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
              <Factory className="size-5 text-primary" /> Job Details
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              Modify production specifications, values, materials, and notes.
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

      {/* Employee Post Job Done Dialog */}
      <AnimatePresence>
        {completionJob && (
          <JobCompletionDialog
            job={completionJob}
            onClose={() => setCompletionJob(null)}
            onSaved={() => {
              setCompletionJob(null);
              qc.invalidateQueries({ queryKey: ["jobs"] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Image Lightbox Dialog */}
      <Dialog open={lightboxUrl !== null} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black border border-border rounded-sm overflow-hidden">
          {lightboxUrl && (
            <div className="relative flex flex-col justify-center items-center bg-black">
              <img
                src={lightboxUrl.url}
                alt={lightboxUrl.title}
                className="max-h-[85vh] w-auto max-w-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-card border border-border p-2.5 rounded-sm flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{lightboxUrl.title}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-sm h-8 text-[11px] cursor-pointer border-border text-foreground hover:bg-muted"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = lightboxUrl.url;
                    link.download = lightboxUrl.title;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                >
                  <Download className="size-3 mr-1" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// JOB CARD COMPONENT (Queue Card Layout - Sharp Corners, Solid Colors)
// ────────────────────────────────────────────────────────────────────────
interface JobQueueCardProps {
  job: Job;
  isAdmin: boolean;
  onEditClick: (job: Job) => void;
  onStageChange: (stage: JobStage) => void;
  onMarkDoneClick: (job: Job) => void;
  onPreviewImage: (url: string, title: string) => void;
  onSaved: () => void;
}

function JobQueueCard({
  job,
  isAdmin,
  onEditClick,
  onStageChange,
  onMarkDoneClick,
  onPreviewImage,
  onSaved,
}: JobQueueCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const notesData = parseJobNotes(job.notes);

  const overdue = job.deadline && new Date(job.deadline) < new Date() && job.stage !== "completed";

  const handleDesignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading design document...");
    try {
      const fileData = await uploadFile(file);
      const updatedNotes = {
        ...notesData,
        designFile: fileData,
      };

      const { error } = await supabase
        .from("jobs")
        .update({ notes: serializeJobNotes(updatedNotes) })
        .eq("id", job.id);

      if (error) throw error;
      toast.success("Design file uploaded successfully", { id: toastId });
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload file", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const removeDesignFile = async () => {
    if (!confirm("Are you sure you want to remove this design file?")) return;
    const toastId = toast.loading("Removing design document...");
    try {
      const updatedNotes = {
        ...notesData,
        designFile: undefined,
      };

      const { error } = await supabase
        .from("jobs")
        .update({ notes: serializeJobNotes(updatedNotes) })
        .eq("id", job.id);

      if (error) throw error;
      toast.success("Design file removed", { id: toastId });
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove file", { id: toastId });
    }
  };

  const isImageFile = (file?: FileAttachment) => {
    if (!file) return false;
    return (
      file.type.startsWith("image/") ||
      file.url.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)
    );
  };

  const isPdfFile = (file?: FileAttachment) => {
    if (!file) return false;
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  };

  return (
    <div
      className={`p-4 bg-card border-t border-r border-b border-l-4 ${
        STAGE_TONE[job.stage]
      } rounded-sm flex flex-col justify-between transition-colors shadow-sm relative group`}
    >
      <div className="space-y-3.5">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <span className="text-[9px] font-mono font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded-none border border-border">
              {job.job_number}
            </span>
            <h3 className="font-bold text-xs text-foreground mt-2 leading-snug">
              {job.title}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {job.customers?.company_name || "Direct Account"}
            </p>
          </div>
          {overdue && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-none border border-destructive/20">
              <AlertCircle className="size-3" /> Overdue
            </span>
          )}
        </div>

        {/* Specifications & Value (Sharp Boxes) */}
        <div className="grid grid-cols-2 gap-2 text-[10px] bg-background p-2.5 rounded-none border border-border font-mono">
          <div>
            <span className="text-muted-foreground block text-[8px] uppercase tracking-wider">
              Material
            </span>
            <span className="text-foreground font-semibold truncate max-w-[120px] block mt-0.5">
              {job.material || "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[8px] uppercase tracking-wider">
              Quantity
            </span>
            <span className="text-foreground font-semibold block mt-0.5">
              {job.quantity} nos
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[8px] uppercase tracking-wider">
              Deadline
            </span>
            <span className="text-foreground font-semibold block mt-0.5 font-sans">
              {job.deadline ? fmtDate(job.deadline) : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[8px] uppercase tracking-wider">
              Job Value
            </span>
            <span className="text-blue-500 font-bold block mt-0.5">
              {job.value > 0 ? inr(job.value) : "—"}
            </span>
          </div>
        </div>

        {/* Design Uploader / Preview Section */}
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Design Blueprint Attachment</span>
            {notesData.designFile && isAdmin && (
              <button
                onClick={removeDesignFile}
                className="text-destructive hover:underline p-0 transition-colors text-[9px] font-mono cursor-pointer"
              >
                Delete File
              </button>
            )}
          </Label>

          {notesData.designFile ? (
            <div className="rounded-sm overflow-hidden border border-border bg-background relative">
              {/* Image Previews */}
              {isImageFile(notesData.designFile) && (
                <div className="relative group/img h-28 bg-black/60 flex items-center justify-center overflow-hidden">
                  <img
                    src={notesData.designFile.url}
                    alt={notesData.designFile.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-sm text-[10px] cursor-pointer"
                      onClick={() => onPreviewImage(notesData.designFile!.url, notesData.designFile!.name)}
                    >
                      <Eye className="size-3 mr-1" /> View Full
                    </Button>
                    <a
                      href={notesData.designFile.url}
                      download={notesData.designFile.name}
                      className="inline-flex items-center justify-center bg-white text-black hover:bg-slate-100 h-7 px-2.5 rounded-sm text-[10px] font-semibold"
                    >
                      <Download className="size-3 mr-1" /> Download
                    </a>
                  </div>
                </div>
              )}

              {/* PDF Documents */}
              {isPdfFile(notesData.designFile) && (
                <div className="p-2.5 flex items-center justify-between gap-3 bg-background">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-sm bg-red-950/40 text-red-500 flex items-center justify-center shrink-0 border border-red-900/30">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">
                        {notesData.designFile.name}
                      </div>
                      <div className="text-[8px] font-mono text-muted-foreground uppercase">
                        PDF FILE
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-sm text-[10px] border-border hover:bg-muted shrink-0 cursor-pointer"
                    onClick={() => window.open(notesData.designFile!.url, "_blank")}
                  >
                    <ExternalLink className="size-3 mr-1" /> Open
                  </Button>
                </div>
              )}

              {/* Vector blueprint documents (CDR, DXF, DWG) */}
              {!isImageFile(notesData.designFile) && !isPdfFile(notesData.designFile) && (
                <div className="p-2.5 flex items-center justify-between gap-3 bg-background border border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-sm bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0 border border-blue-900/30">
                      <FileUp className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">
                        {notesData.designFile.name}
                      </div>
                      <div className="text-[8px] font-mono text-blue-400 font-bold uppercase">
                        CAD Vector ({notesData.designFile.name.split(".").pop()?.toUpperCase()})
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-sm text-[10px] border-border hover:bg-muted shrink-0 cursor-pointer"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = notesData.designFile!.url;
                      link.download = notesData.designFile!.name;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                  >
                    <Download className="size-3 mr-1" /> Download
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-border bg-background hover:bg-muted/40 transition-colors p-5 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleDesignUpload}
                accept=".cdr,.pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-1">
                  <Loader2 className="size-5 text-primary animate-spin mb-1.5" />
                  <span className="text-[9px] font-mono text-muted-foreground">Uploading CAD file...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center cursor-pointer w-full"
                >
                  <Upload className="size-4.5 text-muted-foreground mb-1.5" />
                  <span className="text-xs font-semibold text-foreground">Upload Drawing File</span>
                  <span className="text-[8px] text-muted-foreground mt-0.5 uppercase tracking-wider font-mono">
                    CDR, DXF, DWG, PDF, Image
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Finished Product Photo (Completed Stage) */}
        {job.stage === "completed" && (
          <div className="space-y-1.5 border-t border-border pt-3 bg-green-950/20 p-2.5 rounded-sm border border-green-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-green-400">
                <CheckCircle className="size-3" /> Job Completed
              </div>
              <span className="text-[8px] font-mono text-muted-foreground">
                {notesData.completedAt ? fmtDate(notesData.completedAt) : ""}
              </span>
            </div>
            
            <div className="text-[10px] text-foreground leading-tight">
              Done by: <span className="font-bold text-white">{notesData.completedBy || "Employee"}</span>
            </div>

            {notesData.completionPhoto ? (
              <div className="mt-2 rounded-sm overflow-hidden border border-border relative group/photo h-24 bg-black flex items-center justify-center">
                <img
                  src={notesData.completionPhoto.url}
                  alt="Completed Product"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 rounded-sm text-[9px] cursor-pointer"
                    onClick={() => onPreviewImage(notesData.completionPhoto!.url, "Completed Job " + job.job_number)}
                  >
                    <Eye className="size-3 mr-1" /> View Product
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground italic mt-1">No product photo uploaded.</p>
            )}
          </div>
        )}
      </div>

      {/* Card Actions & Stage Controls */}
      <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between gap-3">
        {/* Job Type Selector */}
        <div className="min-w-0 flex-1">
          <Label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Job Stage / Type
          </Label>
          {isAdmin ? (
            <Select value={job.stage} onValueChange={(val) => onStageChange(val as JobStage)}>
              <SelectTrigger className="h-8 rounded-sm bg-background border-border text-[11px] py-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border rounded-sm">
                {JOB_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[11px]">
                    {JOB_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-8 inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-sm text-[10px] font-medium font-mono">
              {JOB_STAGE_LABELS[job.stage]}
            </div>
          )}
        </div>

        {/* Action Button */}
        {job.stage !== "completed" ? (
          <Button
            size="sm"
            onClick={() => onMarkDoneClick(job)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8 rounded-sm px-3 shrink-0 cursor-pointer flex items-center gap-1 mt-4.5"
          >
            <CheckSquare className="size-3.5" /> Mark Done
          </Button>
        ) : (
          isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditClick(job)}
              className="h-8 rounded-sm text-xs border-border hover:bg-muted mt-4.5 shrink-0 cursor-pointer"
            >
              Edit details
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// POST COMPLETED JOB DIALOG COMPONENT (Sharp Panel Layout)
// ────────────────────────────────────────────────────────────────────────
interface JobCompletionDialogProps {
  job: Job;
  onClose: () => void;
  onSaved: () => void;
}

function JobCompletionDialog({ job, onClose, onSaved }: JobCompletionDialogProps) {
  const [employeeName, setEmployeeName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting job completion...");
    try {
      let photoData: CompletionPhoto | undefined = undefined;

      if (photoFile) {
        const uploadResult = await uploadFile(photoFile);
        photoData = {
          name: uploadResult.name,
          url: uploadResult.url,
        };
      }

      const existingNotes = parseJobNotes(job.notes);
      const updatedNotes = {
        ...existingNotes,
        completionPhoto: photoData,
        completedBy: employeeName.trim(),
        completedAt: new Date().toISOString(),
      };

      const { error: jobUpdateError } = await supabase
        .from("jobs")
        .update({
          stage: "completed",
          notes: serializeJobNotes(updatedNotes),
        })
        .eq("id", job.id);

      if (jobUpdateError) throw jobUpdateError;

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "manager"]);

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const userIdsToNotify = new Set<string>();
      if (admins && admins.length > 0) {
        admins.forEach((admin) => userIdsToNotify.add(admin.user_id));
      }

      // Also notify syxdmatheen.9@gmail.com as they are the admin
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", "syxdmatheen.9@gmail.com")
        .maybeSingle();
      if (adminProfile?.id) {
        userIdsToNotify.add(adminProfile.id);
      }

      if (job.created_by) {
        userIdsToNotify.add(job.created_by);
      }
      if (currentUser?.id) {
        userIdsToNotify.add(currentUser.id);
      }

      const notificationPromises = Array.from(userIdsToNotify).map((uid) => {
        return supabase.from("notifications").insert({
          user_id: uid,
          title: `Job Completed: ${job.job_number || "Job"}`,
          body: `${employeeName.trim()} completed "${job.title}". Check finished product photo!`,
          kind: "job_completed",
          link: "/jobs",
          severity: "warning",
        });
      });

      await Promise.all(notificationPromises);

      toast.success("Job marked as completed successfully!", { id: toastId });
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete job", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-card border border-border rounded-sm p-5 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        <DialogHeader className="mb-4">
          <DialogTitle className="font-bold text-foreground text-md flex items-center gap-2">
            <CheckCircle className="size-5 text-success" /> Post Job Completion
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Provide employee details and attach a photo of the completed part.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmitCompletion} className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Employee Name *</Label>
            <Input
              required
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="mt-1 rounded-sm bg-background border-border text-foreground text-xs"
              disabled={submitting}
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground block mb-1.5">
              Finished Product Photo (Optional)
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
              disabled={submitting}
            />

            {photoPreview ? (
              <div className="relative rounded-sm overflow-hidden border border-border bg-black aspect-video flex items-center justify-center group/pvw">
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/pvw:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 rounded-sm text-[10px] cursor-pointer"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="size-3 mr-1" /> Remove Photo
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-sm border border-dashed border-border bg-background p-6 text-center cursor-pointer transition-colors"
                disabled={submitting}
              >
                <ImageIcon className="size-5 text-muted-foreground mx-auto mb-1.5" />
                <span className="text-xs font-semibold text-foreground block">Upload Product Photo</span>
                <span className="text-[8px] text-muted-foreground mt-0.5 block uppercase font-mono">
                  Take a photo or browse device
                </span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-sm cursor-pointer h-9 text-xs"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-sm cursor-pointer flex items-center gap-1 h-9 text-xs"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Submit Completion
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// DETAILS FORM COMPONENT (Sharp Shapes)
// ────────────────────────────────────────────────────────────────────────
function JobDetailsForm({
  job,
  onClose,
  onSaved,
}: {
  job: Job;
  onClose: () => void;
  onSaved: () => void;
}) {
  const notesData = parseJobNotes(job.notes);

  const [form, setForm] = useState({
    title: job.title || "",
    material: job.material || "",
    quantity: job.quantity || 1,
    deadline: job.deadline || "",
    customer_id: job.customer_id || "",
    value: job.value || 0,
    notesText: notesData.notesText || "",
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

      const updatedNotes = {
        ...notesData,
        notesText: form.notesText,
      };

      const { error } = await supabase
        .from("jobs")
        .update({
          title: form.title,
          material: form.material || null,
          quantity: form.quantity,
          deadline: form.deadline || null,
          customer_id: form.customer_id || null,
          value: form.value,
          notes: serializeJobNotes(updatedNotes),
          stage: form.stage,
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated successfully");
      onSaved();
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to update job");
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
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete job");
    },
  });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <div className="space-y-4 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold font-mono">
            Job Number
          </Label>
          <div className="font-mono text-xs text-foreground bg-muted p-2 rounded-sm border border-border mt-1">
            {job.job_number}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs font-bold text-muted-foreground">Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 5mm MS Bracket — 500 nos"
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Customer</Label>
          <Select
            value={form.customer_id || "none"}
            onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}
          >
            <SelectTrigger className="mt-1 rounded-sm bg-background border-border text-xs">
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border rounded-sm">
              <SelectItem value="none" className="text-xs">None</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Material</Label>
          <Input
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            placeholder="MS 5mm"
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Deadline</Label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Value (₹)</Label>
          <Input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-muted-foreground">Production Stage</Label>
          <Select
            value={form.stage}
            onValueChange={(v) => setForm({ ...form, stage: v as JobStage })}
          >
            <SelectTrigger className="mt-1 rounded-sm bg-background border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border rounded-sm">
              {JOB_STAGES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {JOB_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs font-bold text-muted-foreground">Notes & Specifications</Label>
          <Textarea
            rows={4}
            value={form.notesText}
            onChange={(e) => setForm({ ...form, notesText: e.target.value })}
            placeholder="Production notes, bending angles etc."
            className="mt-1 rounded-sm bg-background border-border text-xs"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 mt-6">
        {showConfirmDelete ? (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 p-2 rounded-sm">
            <span className="text-xs text-destructive font-bold">Are you sure?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-sm cursor-pointer text-xs h-8"
            >
              Yes, Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfirmDelete(false)}
              className="rounded-sm cursor-pointer text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowConfirmDelete(true)}
            className="rounded-sm cursor-pointer text-xs h-9"
          >
            <Trash2 className="size-4 mr-1.5 inline" /> Delete Job
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-sm cursor-pointer text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm cursor-pointer text-xs h-9 font-bold px-4"
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

// ────────────────────────────────────────────────────────────────────────
// NEW JOB DIALOG COMPONENT (Sharp Shapes)
// ────────────────────────────────────────────────────────────────────────
function NewJobDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    material: "",
    quantity: 1,
    deadline: "",
    customer_id: "",
    value: 0,
    notesText: "",
    stage: "design_received" as JobStage,
  });

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreviewName, setDesignPreviewName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: customers = [] } = useQuery<CustomerMin[]>({
    queryKey: ["customers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,company_name");
      return (data as CustomerMin[]) ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      
      setSaving(true);
      const toastId = toast.loading("Creating job & processing design...");
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let designFileData: FileAttachment | undefined = undefined;
        if (designFile) {
          designFileData = await uploadFile(designFile);
        }

        const notesObj: JobNotesData = {
          notesText: form.notesText,
          designFile: designFileData,
        };

        const { error } = await supabase.from("jobs").insert({
          title: form.title,
          material: form.material || null,
          quantity: form.quantity,
          deadline: form.deadline || null,
          customer_id: form.customer_id || null,
          value: form.value,
          notes: serializeJobNotes(notesObj),
          stage: form.stage,
          created_by: user?.id,
        });
        
        if (error) throw error;
        
        toast.success("Job created successfully", { id: toastId });
        setOpen(false);
        onSaved();
        
        setForm({
          title: "",
          material: "",
          quantity: 1,
          deadline: "",
          customer_id: "",
          value: 0,
          notesText: "",
          stage: "design_received",
        });
        setDesignFile(null);
        setDesignPreviewName(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to create job", { id: toastId });
        throw err;
      } finally {
        setSaving(false);
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!saving) setOpen(val);
    }}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm cursor-pointer text-xs h-9.5 px-4 font-bold">
          <Plus className="size-4 mr-1.5" /> New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-card border border-border rounded-sm overflow-y-auto max-h-[90vh] pr-2 scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-bold text-foreground text-md">
            New Production Job
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="md:col-span-2">
            <Label className="text-xs font-bold text-muted-foreground">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 5mm MS Bracket — 500 nos"
              className="mt-1 rounded-sm bg-background border-border text-xs"
              disabled={saving}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Customer</Label>
            <Select
              value={form.customer_id}
              onValueChange={(v) => setForm({ ...form, customer_id: v })}
              disabled={saving}
            >
              <SelectTrigger className="mt-1 rounded-sm bg-background border-border text-xs">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border rounded-sm">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Material</Label>
            <Input
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
              placeholder="MS 5mm"
              className="mt-1 rounded-sm bg-background border-border text-xs"
              disabled={saving}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Quantity</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="mt-1 rounded-sm bg-background border-border text-xs"
              disabled={saving}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Deadline</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="mt-1 rounded-sm bg-background border-border text-xs"
              disabled={saving}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Value (₹)</Label>
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              className="mt-1 rounded-sm bg-background border-border text-xs"
              disabled={saving}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Starting Stage</Label>
            <Select
              value={form.stage}
              onValueChange={(v) => setForm({ ...form, stage: v as JobStage })}
              disabled={saving}
            >
              <SelectTrigger className="mt-1 rounded-sm bg-background border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border rounded-sm">
                {JOB_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {JOB_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold text-muted-foreground">Design Blueprint Attachment</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setDesignFile(file);
                  setDesignPreviewName(file.name);
                }
              }}
              accept=".cdr,.pdf,.png,.jpg,.jpeg,.dwg,.dxf"
              className="hidden"
              disabled={saving}
            />
            {designPreviewName ? (
              <div className="mt-1.5 flex items-center justify-between p-2.5 rounded-sm border border-primary/20 bg-primary/5 text-xs text-foreground">
                <span className="truncate max-w-[80%] font-mono font-semibold">{designPreviewName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer text-muted-foreground hover:text-white"
                  onClick={() => {
                    setDesignFile(null);
                    setDesignPreviewName(null);
                  }}
                  disabled={saving}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 w-full rounded-sm border-dashed border-border bg-background py-5 text-center cursor-pointer hover:bg-muted/40 transition-colors text-xs"
                disabled={saving}
              >
                <Upload className="size-4 mr-1.5 inline" /> Select CDR, DXF, DWG, PDF or Image
              </Button>
            )}
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs font-bold text-muted-foreground">Notes & Specifications</Label>
            <Textarea
              rows={2}
              value={form.notesText}
              onChange={(e) => setForm({ ...form, notesText: e.target.value })}
              className="mt-1 rounded-sm bg-background border-border text-xs"
              placeholder="e.g. Bending specifications, special cutting requirements"
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter className="mt-5">
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm cursor-pointer w-full sm:w-auto text-xs h-9.5 font-bold px-5"
            onClick={() => save.mutate()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 inline animate-spin" /> Creating...
              </>
            ) : (
              "Create Job"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
