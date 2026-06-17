import { z } from "zod";

export const LEAD_STATUSES = ["new", "contacted", "quotation_sent", "follow_up", "negotiation", "won", "lost"] as const;
export const LEAD_SOURCES = ["website", "google", "referral", "facebook", "instagram", "whatsapp", "direct_call", "other"] as const;
export const JOB_STAGES = ["design_received", "programming", "laser_cutting", "bending", "welding", "powder_coating", "quality_check", "dispatch", "completed"] as const;
export const QUOTATION_STATUSES = ["draft", "sent", "approved", "rejected", "expired"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type JobStage = (typeof JOB_STAGES)[number];
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quotation_sent: "Quotation Sent",
  follow_up: "Follow-up",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  google: "Google",
  referral: "Referral",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  direct_call: "Direct Call",
  other: "Other",
};

export const JOB_STAGE_LABELS: Record<JobStage, string> = {
  design_received: "Design Received",
  programming: "Programming",
  laser_cutting: "Laser Cutting",
  bending: "Bending",
  welding: "Welding",
  powder_coating: "Powder Coating",
  quality_check: "Quality Check",
  dispatch: "Dispatch",
  completed: "Completed",
};

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  quotation_sent: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  follow_up: "bg-warning/15 text-warning border-warning/30",
  negotiation: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  won: "bg-success/15 text-success border-success/30",
  lost: "bg-destructive/15 text-destructive border-destructive/30",
};

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  gst_number: z.string().trim().max(20).optional().or(z.literal("")),
  requirement: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  estimated_value: z.coerce.number().min(0).default(0),
});

export const customerSchema = z.object({
  company_name: z.string().trim().min(1).max(160),
  contact_person: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  gst_number: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export function inr(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
