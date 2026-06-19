import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "quotation_sent",
  "follow_up",
  "negotiation",
  "won",
  "lost",
] as const;
export const LEAD_SOURCES = [
  "website",
  "google",
  "referral",
  "facebook",
  "instagram",
  "whatsapp",
  "direct_call",
  "other",
] as const;
export const JOB_STAGES = [
  "design_received",
  "programming",
  "laser_cutting",
  "bending",
  "welding",
  "powder_coating",
  "quality_check",
  "dispatch",
  "completed",
] as const;
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

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
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

export const QUOTATION_STATUS_TONE: Record<QuotationStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/15 text-primary border-primary/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-warning/15 text-warning border-warning/30",
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(date);
}

/* ──────────────────────────  CSV  ────────────────────────── */
export function toCSV(rows: Record<string, any>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV(filename: string, rows: Record<string, any>[], columns?: string[]) {
  const csv = toCSV(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === ",") {
          out.push(cur);
          cur = "";
        } else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });
}

/* ──────────────────────────  Activity log  ────────────────────────── */
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "stage_changed"
  | "note_added"
  | "exported";

export async function logActivity(params: {
  entity_type: "lead" | "customer" | "quotation" | "job" | "follow_up";
  entity_id?: string | null;
  entity_label?: string | null;
  action: ActivityAction;
  changes?: Record<string, any>;
  meta?: Record<string, any>;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("activity_log").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_label: params.entity_label ?? null,
      action: params.action,
      changes: params.changes ?? null,
      meta: params.meta ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

/* Chart palette derived from CSS chart tokens */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
