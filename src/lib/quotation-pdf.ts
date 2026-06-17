import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { inr, fmtDate } from "./erp";

export interface QuotationPDFData {
  quotation_number: string;
  customer_name: string;
  customer_company?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_gst?: string | null;
  customer_address?: string | null;
  created_at: string;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  subtotal: number;
  discount_amount: number;
  discount_pct: number;
  gst_pct: number;
  gst_amount: number;
  grand_total: number;
  items: Array<{
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit?: string | null;
    unit_price: number;
    amount: number;
  }>;
}

export function generateQuotationPDF(q: QuotationPDFData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [22, 35, 60];
  const blue: [number, number, number] = [37, 99, 195];
  const gray: [number, number, number] = [110, 120, 135];

  // Header band
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(...blue);
  doc.rect(0, 30, pageW, 2, "F");

  // Logo block
  doc.setFillColor(...blue);
  doc.roundedRect(14, 8, 16, 16, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text("M", 19.5, 19);

  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text("MAM INDUSTRIES", 34, 16);
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text("Laser Cutting · Fabrication · Bending · Welding · Engraving", 34, 21);
  doc.text("GST: XXAAAAA0000A1Z5  ·  +91 00000 00000  ·  info@mamindustries.in", 34, 25.5);

  // QUOTATION title block
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11).setFont("helvetica", "bold");
  doc.text("QUOTATION", pageW - 14, 14, { align: "right" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(q.quotation_number, pageW - 14, 20, { align: "right" });
  doc.text(`Date: ${fmtDate(q.created_at)}`, pageW - 14, 25, { align: "right" });

  // Customer block
  doc.setTextColor(...navy);
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("BILL TO", 14, 44);
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 46, 32, 46);

  doc.setFontSize(11).setFont("helvetica", "bold");
  doc.text(q.customer_company || q.customer_name, 14, 52);
  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...gray);
  let y = 57;
  if (q.customer_company && q.customer_name) { doc.text(`Attn: ${q.customer_name}`, 14, y); y += 4.5; }
  if (q.customer_address) { doc.text(doc.splitTextToSize(q.customer_address, 90), 14, y); y += 4.5 * Math.ceil(q.customer_address.length / 60); }
  if (q.customer_phone) { doc.text(`Phone: ${q.customer_phone}`, 14, y); y += 4.5; }
  if (q.customer_email) { doc.text(`Email: ${q.customer_email}`, 14, y); y += 4.5; }
  if (q.customer_gst) { doc.text(`GST: ${q.customer_gst}`, 14, y); y += 4.5; }

  // Validity box
  if (q.valid_until) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(pageW - 64, 44, 50, 16, 2, 2, "F");
    doc.setFontSize(7).setFont("helvetica", "bold").setTextColor(...gray);
    doc.text("VALID UNTIL", pageW - 60, 50);
    doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(...navy);
    doc.text(fmtDate(q.valid_until), pageW - 60, 56);
  }

  // Items table
  autoTable(doc, {
    startY: Math.max(y, 70),
    head: [["#", "Description", "HSN", "Qty", "Unit", "Rate (₹)", "Amount (₹)"]],
    body: q.items.map((it, i) => [
      String(i + 1),
      it.description,
      it.hsn_code || "—",
      String(it.quantity),
      it.unit || "pcs",
      Number(it.unit_price).toLocaleString("en-IN"),
      Number(it.amount).toLocaleString("en-IN"),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, textColor: navy as any },
    headStyles: { fillColor: navy as any, textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] as any },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  // Totals box
  const afterTable = (doc as any).lastAutoTable.finalY + 6;
  const boxX = pageW - 84, boxW = 70;
  doc.setDrawColor(220, 225, 232);
  doc.setLineWidth(0.3);

  const totalsRow = (label: string, value: string, bold = false, fill = false) => {
    const yy = (totalsRow as any).y;
    if (fill) { doc.setFillColor(...navy); doc.rect(boxX, yy - 4, boxW, 8, "F"); doc.setTextColor(255, 255, 255); }
    else doc.setTextColor(...navy);
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 10 : 9);
    doc.text(label, boxX + 3, yy);
    doc.text(value, boxX + boxW - 3, yy, { align: "right" });
    (totalsRow as any).y += fill ? 8 : 6;
  };
  (totalsRow as any).y = afterTable + 2;
  totalsRow("Subtotal", `₹ ${q.subtotal.toLocaleString("en-IN")}`);
  if (q.discount_amount > 0) totalsRow(`Discount (${q.discount_pct}%)`, `– ₹ ${q.discount_amount.toLocaleString("en-IN")}`);
  totalsRow(`GST (${q.gst_pct}%)`, `₹ ${q.gst_amount.toLocaleString("en-IN")}`);
  totalsRow("GRAND TOTAL", inr(q.grand_total), true, true);

  // Notes & terms
  let footY = (totalsRow as any).y + 8;
  if (q.notes) {
    doc.setTextColor(...navy).setFontSize(8).setFont("helvetica", "bold").text("NOTES", 14, footY);
    doc.setFont("helvetica", "normal").setTextColor(...gray).setFontSize(9);
    const lines = doc.splitTextToSize(q.notes, pageW - 100);
    doc.text(lines, 14, footY + 5);
    footY += 5 + lines.length * 4;
  }

  doc.setTextColor(...navy).setFontSize(8).setFont("helvetica", "bold").text("TERMS & CONDITIONS", 14, footY + 4);
  doc.setFont("helvetica", "normal").setTextColor(...gray).setFontSize(8);
  const defaultTerms = q.terms || [
    "1. Prices are exclusive of transportation unless stated otherwise.",
    "2. 50% advance against PO; balance before dispatch.",
    "3. Delivery within 7–10 working days from receipt of advance.",
    "4. Material warranty: 30 days from dispatch on workmanship.",
    "5. All disputes subject to local jurisdiction.",
  ].join("\n");
  const termLines = doc.splitTextToSize(defaultTerms, pageW - 28);
  doc.text(termLines, 14, footY + 9);

  // Signature
  const sigY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(...gray).setLineWidth(0.3);
  doc.line(pageW - 70, sigY, pageW - 14, sigY);
  doc.setTextColor(...navy).setFontSize(9).setFont("helvetica", "bold");
  doc.text("For MAM INDUSTRIES", pageW - 14, sigY + 5, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...gray);
  doc.text("Authorised Signatory", pageW - 14, sigY + 10, { align: "right" });

  // Footer band
  doc.setFillColor(...navy);
  doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageW, 10, "F");
  doc.setTextColor(255, 255, 255).setFontSize(7);
  doc.text("MAM Industries · Precision Manufacturing · This is a computer generated quotation.", pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: "center" });

  doc.save(`${q.quotation_number}.pdf`);
}
