import jsPDF from "jspdf";
import { fmtDate } from "./erp";
import { LOGO_BASE64 } from "./logo-base64";
import { SEAL_BASE64 } from "./seal-base64";

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
  // New columns
  po_number?: string | null;
  po_date?: string | null;
  vehicle_no?: string | null;
  eway_no?: string | null;
  dc_no?: string | null;
  dc_date?: string | null;
  ship_to_name?: string | null;
  ship_to_company?: string | null;
  ship_to_address?: string | null;
  ship_to_gst?: string | null;
  copy_type?: "original" | "duplicate" | "transporter" | null;
  status?: string;
  bank_name?: string | null;
  bank_acc_no?: string | null;
  bank_ifsc?: string | null;
  company_pan?: string | null;
  document_title?: string | null;
  pdf_format?: string | null;
  signatory_company?: string | null;
  signatory_name?: string | null;
  print_seal?: boolean | null;
}

// Indian Rupees to Words converter
function numberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function helper(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let res = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  if (crore > 0) {
    res += helper(crore) + ' Crore ';
  }
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  if (lakh > 0) {
    res += helper(lakh) + ' Lakh ';
  }
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (thousand > 0) {
    res += helper(thousand) + ' Thousand ';
  }
  if (num > 0) {
    res += helper(num);
  }

  return (res.trim() + ' Only').replace(/\s+/g, ' ');
}

export function generateQuotationPDF(q: QuotationPDFData) {
  if (q.pdf_format === "classic") {
    generateClassicPDF(q);
    return;
  }
  // Use points (pt) as unit. Page size: letter (612 x 792 pt).
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // 1. Draw Checkboxes (Top-Right)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);

  const originalSelected = q.copy_type === "original";
  const duplicateSelected = q.copy_type === "duplicate";
  const transporterSelected = q.copy_type === "transporter";

  // Checkbox borders
  doc.rect(407.16, 129.36, 13.80, 8.88);
  doc.rect(454.08, 129.12, 14.16, 8.88);
  doc.rect(511.80, 129.48, 13.92, 8.88);

  // Draw fill inside selected copy type checkbox
  doc.setFillColor(0, 0, 0);
  if (originalSelected) {
    doc.rect(409.16, 131.36, 9.80, 4.88, "F");
  } else if (duplicateSelected) {
    doc.rect(456.08, 131.12, 10.16, 4.88, "F");
  } else if (transporterSelected) {
    doc.rect(513.80, 131.48, 9.92, 4.88, "F");
  }

  // Copy type labels text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text("ORIGINAL/DUPLICATE/TRANSPORTER", 398.88, 148);

  // 2. Add Base64 Header Logo (Top-Left)
  try {
    doc.addImage(LOGO_BASE64, 'PNG', 72.72, 55.08, 259.92, 77.04);
  } catch (e) {
    console.error("Failed to add base64 header logo", e);
    // Draw placeholder in case of loading error
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MAM INDUSTRIES", 72.72, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Laser Cutting · Fabrication · Bending · Welding", 72.72, 98);
  }

  // Add Seller Header Details (Top-Right, beside the logo)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("NO 113 7th MILE NAIDU LAYOUT,", 556.32, 60, { align: "right" });
  doc.text("YELACHENAHALLI, KANAKAPURA ROAD,", 556.32, 70, { align: "right" });
  doc.text("BANGALORE, Karnataka 560062, India", 556.32, 80, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("GSTIN: 29CTCPM1852L2ZC", 556.32, 90, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Email: mamindustries19@gmail.com | Web: www.mamindustries.in", 556.32, 100, { align: "right" });

  const ownerName = q.signatory_name || "Mari Muthu R";
  doc.text(`Mobile: 6381163159 | Owner: ${ownerName}`, 556.32, 110, { align: "right" });

  // 3. Draw Grid Lines
  // Outer border box
  doc.rect(50.52, 153.72, 505.80, 505.68);

  // Double horizontal lines around TAX INVOICE / QUOTATION title
  doc.line(50.52, 155.40, 556.32, 155.40);
  doc.line(50.52, 171.60, 556.32, 171.60);
  doc.line(50.52, 173.28, 556.32, 173.28);

  // Vertical details dividers
  doc.line(93.36, 174.12, 93.36, 497.28);
  doc.line(359.88, 174.12, 359.88, 497.28);

  // Right details horizontal dividers
  doc.line(359.88, 189.48, 556.32, 189.48);
  doc.line(359.88, 205.92, 556.32, 205.92);
  doc.line(359.88, 219.84, 556.32, 219.84);
  doc.line(50.52, 233.76, 556.32, 233.76); // Splits Bill To and Ship To
  doc.line(359.88, 250.20, 556.32, 250.20);
  doc.line(359.88, 264.72, 556.32, 264.72);
  doc.line(359.88, 278.64, 556.32, 278.64);
  doc.line(50.52, 293.16, 556.32, 293.16); // Bottom of details section

  // Table columns vertical dividers
  doc.line(312.84, 293.16, 312.84, 497.28); // Description/SAC
  doc.line(359.88, 293.16, 359.88, 497.28); // SAC/Rate
  doc.line(416.64, 293.16, 416.64, 497.28); // Rate/Qty
  doc.line(456.60, 293.16, 456.60, 659.40); // Qty/Per (goes to bottom)
  doc.line(493.80, 293.16, 493.80, 497.28); // Per/Amount

  // Table header horizontal line
  doc.line(50.52, 307.68, 556.32, 307.68);

  // Table bottom / totals lines
  doc.line(50.52, 497.28, 556.32, 497.28);
  doc.line(50.52, 511.80, 556.32, 511.80);
  doc.line(493.80, 511.80, 493.80, 567.48); // Totals values boundary
  doc.line(50.52, 567.48, 556.32, 567.48); // Bottom of Round off row
  doc.line(50.52, 579.48, 556.32, 579.48); // Bottom of Grand Total row

  // Bottom footer lines
  doc.line(50.52, 605.28, 456.60, 605.28); // Bottom of Words row
  doc.line(93.36, 605.28, 93.36, 659.40); // Received By boundary
  doc.line(312.84, 605.28, 312.84, 659.40); // PAN/Bank Details boundary

  // 4. Centered Document Title
  const docTitle = q.document_title || (q.status === "approved" ? "TAX INVOICE" : "QUOTATION");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(docTitle, 303.42, 165, { align: "center" });

  // 5. Billing and Shipping Address (Left Box)
  // Bill To (y = 174.12 to 233.76)
  let yBilling = 184;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Bill To,", 55, yBilling);

  const billingLines: string[] = [];
  if (q.customer_company) {
    billingLines.push(q.customer_company);
    if (q.customer_name) {
      billingLines.push(q.customer_name);
    }
  } else {
    billingLines.push(q.customer_name);
  }

  if (q.customer_address) {
    const addrLines = doc.splitTextToSize(q.customer_address, 260);
    billingLines.push(...addrLines);
  }

  if (q.customer_gst) {
    billingLines.push(`GSTIN: ${q.customer_gst}`);
  }

  billingLines.forEach((line, index) => {
    if (index === 0) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 98, yBilling + (index * 10));
  });

  // Ship To (y = 233.76 to 293.16)
  let yShipping = 244;
  doc.setFont("helvetica", "bold");
  doc.text("Ship To,", 55, yShipping);

  const shippingLines: string[] = [];
  const shipToName = q.ship_to_name || q.customer_name;
  const shipToCompany = q.ship_to_company || q.customer_company;
  const shipToAddress = q.ship_to_address || q.customer_address;
  const shipToGst = q.ship_to_gst || q.customer_gst;

  if (shipToCompany) {
    shippingLines.push(shipToCompany);
    if (shipToName) {
      shippingLines.push(shipToName);
    }
  } else {
    shippingLines.push(shipToName);
  }

  if (shipToAddress) {
    const addrLines = doc.splitTextToSize(shipToAddress, 260);
    shippingLines.push(...addrLines);
  }

  if (shipToGst) {
    shippingLines.push(`GSTIN: ${shipToGst}`);
  }

  shippingLines.forEach((line, index) => {
    if (index === 0) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 98, yShipping + (index * 10));
  });

  // 6. Right Side Metadata Block (y = 174.12 to 293.16)
  const drawMetaRow = (label: string, value: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, 365, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 430, yPos);
  };

  const numLabel = q.status === "approved" ? "INVOICE No:" : "QUOTATION No:";
  drawMetaRow(numLabel, q.quotation_number, 184);
  drawMetaRow("DATE:", fmtDate(q.created_at), 200);
  drawMetaRow("PO No:", q.po_number || "", 214);
  drawMetaRow("Date:", q.po_date ? fmtDate(q.po_date) : "", 228);
  drawMetaRow("Vehicle No:", q.vehicle_no || "", 244);
  drawMetaRow("E-WAY No:", q.eway_no || "", 258);
  drawMetaRow("D.C.No.", q.dc_no || "", 272);
  drawMetaRow("Date:", q.dc_date ? fmtDate(q.dc_date) : "", 286);

  // 7. Table Headers (y = 293.16 to 307.68)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const headerY = 303;
  doc.text("SL No", 71.94, headerY, { align: "center" });
  doc.text("Description of Goods", 98, headerY);
  doc.text("SAC", 336.36, headerY, { align: "center" });
  doc.text("UNIT RATE", 388.26, headerY, { align: "center" });
  doc.text("QTY", 436.62, headerY, { align: "center" });
  doc.text("Per", 475.20, headerY, { align: "center" });
  doc.text("Amount", 525.06, headerY, { align: "center" });

  // 8. Table Line Items (y = 307.68 to 497.28)
  let itemY = 319;
  doc.setFont("helvetica", "normal");

  q.items.forEach((it, i) => {
    doc.text(String(i + 1), 71.94, itemY, { align: "center" });

    // Auto-wrapped description
    const descLines = doc.splitTextToSize(it.description, 205);
    doc.text(descLines, 98, itemY);

    doc.text(it.hsn_code || "", 336.36, itemY, { align: "center" });
    doc.text(Number(it.unit_price).toFixed(2), 412, itemY, { align: "right" });
    doc.text(String(it.quantity), 436.62, itemY, { align: "center" });
    doc.text(it.unit || "pcs", 475.20, itemY, { align: "center" });
    doc.text(Number(it.amount).toFixed(2), 551, itemY, { align: "right" });

    itemY += Math.max(descLines.length * 10, 13);
  });

  // 9. Totals Section (y = 497.28 to 578.64)
  // TOTAL row (y = 497.28 to 511.80)
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 452, 506, { align: "right" });
  doc.text(q.subtotal.toFixed(2), 551, 506, { align: "right" });

  // Taxeble Value row (y = 511.80 to 525.49)
  doc.text("Taxeble Value ", 452, 520, { align: "right" });
  const taxableVal = q.subtotal - q.discount_amount;
  doc.text(taxableVal.toFixed(2), 551, 520, { align: "right" });

  // SGST & CGST (y = 525.49 to 553.34)
  doc.setFont("helvetica", "normal");
  doc.text("ADD SGST", 452, 534, { align: "right" });
  doc.text(`${(q.gst_pct / 2)}%`, 475.20, 534, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text((q.gst_amount / 2).toFixed(2), 551, 534, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("ADD CGST", 452, 548, { align: "right" });
  doc.text(`${(q.gst_pct / 2)}%`, 475.20, 548, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text((q.gst_amount / 2).toFixed(2), 551, 548, { align: "right" });

  // Round off (y = 553.34 to 566.64)
  doc.setFont("helvetica", "normal");
  doc.text("Round off", 452, 562, { align: "right" });
  const finalTotal = Math.round(q.grand_total);
  const roundOff = finalTotal - (taxableVal + q.gst_amount);
  doc.text(roundOff.toFixed(2), 551, 562, { align: "right" });

  // Grand Total (y = 566.64 to 578.64)
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", 452, 574.5, { align: "right" });
  doc.text(finalTotal.toFixed(2), 551, 574.5, { align: "right" });

  // 10. Footer Section (y = 578.64 to 659.40)
  // Amount in words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const labelText = "Amount Chargeble in Rupees (in words) : ";
  doc.text(labelText, 55, 590);

  const labelWidth = doc.getTextWidth(labelText);
  doc.setFont("helvetica", "normal");
  const wordsValText = numberToWords(finalTotal);
  const wordsLines = doc.splitTextToSize(wordsValText, 390 - labelWidth);
  doc.text(wordsLines, 55 + labelWidth, 590);

  // For MAM Industries & Authorised Signatory
  doc.setFont("helvetica", "bold");
  const sigCompany = q.signatory_company || "For MAM INDUSTRIES";
  doc.text(sigCompany, 462, 590);

  if (q.print_seal) {
    try {
      doc.addImage(SEAL_BASE64, 'PNG', 476.46, 592.00, 60.00, 59.00);
    } catch (e) {
      console.error("Failed to add seal image", e);
    }
  }

  doc.setFont("helvetica", "normal");
  const sigName = q.signatory_name || "Authorised Signatory";
  doc.text(sigName, 506.46, 652, { align: "center" });

  // Received By Block (x = 50.52 to 93.36)
  doc.setFont("helvetica", "bold");
  doc.text("RECIVED", 71.94, 622, { align: "center" });
  doc.text("BY", 71.94, 634, { align: "center" });

  // Company PAN and note
  doc.setFont("helvetica", "normal");
  doc.text(`Company's PAN: ${q.company_pan || ""}`, 98, 620);
  doc.text("Note:Please make cheques in favour of", 98, 632);
  doc.setFont("helvetica", "bold");
  doc.text('"MAM INDUSTRIES"', 98, 644);

  // Bank details block
  doc.setFont("helvetica", "bold");
  doc.text("COMPANY BANK DETAILS", 318, 620);
  doc.setFont("helvetica", "normal");
  doc.text(`BANK NAME: ${q.bank_name || "BANK OF INDIA"}`, 318, 630);
  doc.text(`A/C NO : ${q.bank_acc_no || ""}`, 318, 640);
  doc.text(`BRANCH & IFSC: ${q.bank_ifsc || ""}`, 318, 650);

  // Save PDF
  doc.save(`${q.quotation_number}.pdf`);
}

export function generateClassicPDF(q: QuotationPDFData) {
  // Use points (pt) as unit. Page size: letter (612 x 792 pt).
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // 1. Add Base64 Logo First (Top-Left)
  // Drawn first so that grid borders can be drawn over it, preventing gaps.
  try {
    // Shift to x = 52.50 to align with the centered page content
    doc.addImage(LOGO_BASE64, 'PNG', 52.50, 56.50, 332.64, 95.00);
  } catch (e) {
    console.error("Failed to add base64 header logo in classic PDF", e);
  }

  // Add Seller Header Details (Top-Right, beside the logo)

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("NO 113 7th MILE NAIDU LAYOUT,", 572.00, 70, { align: "right" });
  doc.text("YELACHENAHALLI, KANAKAPURA ROAD,", 572.00, 79, { align: "right" });
  doc.text("BANGALORE, Karnataka 560062, India", 572.00, 88, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("GSTIN: 29CTCPM1852L2ZC", 572.00, 98, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Email: mamindustries19@gmail.com | Web: www.mamindustries.in", 572.00, 107, { align: "right" });

  const ownerNameClassic = q.signatory_name || "Mari Muthu R";
  doc.text(`Mobile: 6381163159 | Owner: ${ownerNameClassic}`, 572.00, 116, { align: "right" });

  // 2. Draw Outer Frame and Grid Lines (On top of the logo background!)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);

  // Outer border box (x = 40.00, y = 54.12, width = 532.00, height = 564.24)
  doc.rect(40.00, 54.12, 532.00, 564.24);

  // Horizontal Grid Lines
  doc.line(40.00, 160.80, 572.00, 160.80); // Bottom of logo/Header
  doc.line(40.00, 178.92, 572.00, 178.92); // Bottom of QUOTATION title
  doc.line(40.00, 254.76, 572.00, 254.76); // Bottom of customer details / top of table header
  doc.line(40.00, 268.68, 572.00, 268.68); // Bottom of table header
  doc.line(40.00, 421.20, 572.00, 421.20); // Bottom of table body / top of totals
  doc.line(40.00, 482.28, 572.00, 482.28); // Bottom of totals / top of words
  doc.line(40.00, 522.36, 572.00, 522.36); // Bottom of words / top of terms
  doc.line(40.00, 578.04, 572.00, 578.04); // Bottom of terms / top of signatory

  // Vertical Grid Lines
  // Customer details block
  doc.line(80.00, 178.92, 80.00, 254.76); // Separates "To," and customer info
  doc.line(356.00, 178.92, 356.00, 254.76); // Separates customer info and metadata details

  // Metadata block (right) horizontal dividers
  doc.line(356.00, 195.84, 572.00, 195.84); // Under Quotation No
  doc.line(356.00, 238.20, 572.00, 238.20); // Under Date

  // Table columns vertical dividers
  doc.line(80.00, 254.76, 80.00, 421.20); // SL No / Description
  doc.line(356.00, 254.76, 356.00, 421.20); // Description / QTY
  doc.line(390.00, 254.76, 390.00, 421.20); // QTY / UOM
  doc.line(426.00, 254.76, 426.00, 421.20); // UOM / Rate
  doc.line(503.00, 254.76, 503.00, 482.28); // Rate / Amount (extends through totals!)

  // Terms section vertical divider
  doc.line(356.00, 522.36, 356.00, 578.04); // Separates terms on left and signatory area right

  // 3. Centered Title (Center of the page = 306.00)
  const docTitle = q.document_title || "QUOTATION";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(docTitle, 306.00, 172.5, { align: "center" });

  // 4. Customer Details (Left Box)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("To,     ", 52.00, 191.04);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const custCompany = q.customer_company || q.customer_name;
  doc.text(custCompany, 83.00, 192.60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const addrLines: string[] = [];
  if (q.customer_address) {
    const splitAddr = doc.splitTextToSize(q.customer_address, 260);
    addrLines.push(...splitAddr);
  }
  if (q.customer_gst) {
    addrLines.push(`GSTIN: ${q.customer_gst}`);
  }
  addrLines.forEach((line, i) => {
    doc.text(line, 83.00, 220.80 + (i * 14.76));
  });

  // 5. Metadata Block (Right Box)
  // Quotation No (Row 1)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Quotation No: ", 361.00, 191.76);
  const quoNoWidth = doc.getTextWidth("Quotation No: ");
  doc.setFont("helvetica", "normal");
  doc.text(q.quotation_number || "", 361.00 + quoNoWidth, 191.76);

  // Date (Row 2)
  doc.setFont("helvetica", "bold");
  doc.text("Date : ", 361.00, 221.40);
  const dateWidth = doc.getTextWidth("Date : ");
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(q.created_at), 361.00 + dateWidth, 221.40);

  // Ref (Row 3)
  doc.setFont("helvetica", "bold");
  doc.text("Ref: ", 361.00, 250.68);
  const refWidth = doc.getTextWidth("Ref: ");
  doc.setFont("helvetica", "normal");
  doc.text(q.po_number || "", 361.00 + refWidth, 250.68);

  // 6. Table Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const headerY = 266.28;
  doc.text("SL No", 60.00, headerY, { align: "center" });
  doc.text("Description of Goods", 84.00, headerY);
  doc.text("QTY", 373.00, headerY, { align: "center" });
  doc.text("UOM", 408.00, headerY, { align: "center" });
  doc.text("Rate", 498.00, headerY, { align: "right" });
  doc.text("Amount", 566.00, headerY, { align: "right" });

  // 7. Table Line Items
  let itemY = 282;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  q.items.forEach((it, i) => {
    // SL No (centered in 40.00 to 80.00)
    doc.text(String(i + 1), 60.00, itemY, { align: "center" });

    // Description (left-aligned at 84.00)
    const descLines = doc.splitTextToSize(it.description, 268);
    doc.text(descLines, 84.00, itemY);

    // QTY (centered in 356.00 to 390.00)
    doc.text(String(it.quantity), 373.00, itemY, { align: "center" });

    // UOM (centered in 390.00 to 426.00)
    doc.text(it.unit || "pcs", 408.00, itemY, { align: "center" });

    // Rate (right-aligned in 426.00 to 503.00)
    doc.text(Number(it.unit_price).toFixed(2), 498.00, itemY, { align: "right" });

    // Amount (right-aligned in 503.00 to 572.00)
    doc.text(Number(it.amount).toFixed(2), 566.00, itemY, { align: "right" });

    itemY += Math.max(descLines.length * 13, 15);
  });

  // 8. Totals Section
  const sgstAmount = q.gst_amount / 2;
  const cgstAmount = q.gst_amount / 2;
  const finalTotal = Math.round(q.grand_total);

  // Sub Total
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sub Total", 498.00, 433.68, { align: "right" });
  doc.text(q.subtotal.toFixed(2), 566.00, 433.68, { align: "right" });

  // SGST
  doc.text(`SGST ${(q.gst_pct / 2)}%`, 498.00, 448.80, { align: "right" });
  doc.text(sgstAmount.toFixed(2), 566.00, 448.80, { align: "right" });

  // CGST
  doc.text(`CGST ${(q.gst_pct / 2)}%`, 498.00, 463.92, { align: "right" });
  doc.text(cgstAmount.toFixed(2), 566.00, 463.92, { align: "right" });

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", 498.00, 478.92, { align: "right" });
  doc.text(finalTotal.toFixed(2), 566.00, 478.92, { align: "right" });

  // 9. Amount in Words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const wordsLabel = "Amount Chargeable in Rupees (in words) : ";
  doc.text(wordsLabel, 47.00, 498.96);
  const wordsLabelWidth = doc.getTextWidth(wordsLabel);

  doc.setFont("helvetica", "normal");
  const wordsValText = numberToWords(finalTotal);
  const wordsLines = doc.splitTextToSize(wordsValText, 540 - wordsLabelWidth);
  doc.text(wordsLines, 47.00 + wordsLabelWidth, 498.96);

  // 10. Terms Section (Left Footer Block)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TERMS:", 47.00, 533.64);
  doc.setFont("helvetica", "normal");

  const termsList = q.terms ? q.terms.split("\n") : [
    "Delivery: 25 to 30 days",
    "Quotation valid : 20 Days",
    "Payment Terms: 50% Advance 50% remaining delivery"
  ];
  termsList.forEach((term, index) => {
    doc.text(term, 47.00, 547.56 + (index * 12));
  });

  // 11. Signatory Block (Center of page bottom)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const sigCompany = q.signatory_company || "For MAM Industries";
  doc.text(sigCompany, 306.00, 594.48, { align: "center" });

  if (q.print_seal) {
    try {
      doc.addImage(SEAL_BASE64, 'PNG', 281.00, 582.00, 50.00, 49.00);
    } catch (e) {
      console.error("Failed to add seal image in classic PDF", e);
    }
  }

  doc.setFont("helvetica", "normal");
  const sigName = q.signatory_name || "Muthu";
  doc.text(sigName, 306.00, 615.0, { align: "center" });

  // Save PDF
  doc.save(`${q.quotation_number}.pdf`);
}
