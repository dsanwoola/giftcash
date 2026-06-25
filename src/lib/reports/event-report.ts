import type { GiftEvent } from "@/lib/types";

export type EventReportFormat = "excel" | "pdf";

export interface EventReportSummary {
  totalGifts: number;
  totalAmount: number;
  averageGift: number;
  namedGifters: number;
  anonymousGifters: number;
  generatedAt: string;
}

export interface EventReportRow {
  sn: number;
  gifter: string;
  amountMinor: number;
  amount: string;
  message: string;
  table: string;
  giftedAt: string;
}

const moneyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

export function eventReportSummary(event: GiftEvent, generatedAt = new Date().toISOString()): EventReportSummary {
  const totalAmount = event.contributions.reduce((sum, gift) => sum + gift.amount, 0);
  const totalGifts = event.contributions.length;
  return {
    totalGifts,
    totalAmount,
    averageGift: totalGifts ? Math.round(totalAmount / totalGifts) : 0,
    namedGifters: event.contributions.filter((gift) => !gift.anonymous).length,
    anonymousGifters: event.contributions.filter((gift) => gift.anonymous).length,
    generatedAt,
  };
}

export function eventReportRows(event: GiftEvent): EventReportRow[] {
  const formatMoney = moneyFormatter(event.currency);
  return [...event.contributions]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((gift, index) => ({
      sn: index + 1,
      gifter: gift.anonymous ? "Anonymous" : gift.name,
      amountMinor: gift.amount,
      amount: formatMoney.format(gift.amount / 100),
      message: gift.message ?? "",
      table: gift.table ?? "",
      giftedAt: formatDateTime(gift.createdAt),
    }));
}

export function eventReportFileName(event: GiftEvent, format: EventReportFormat, date = new Date()) {
  const safeTitle = (event.title || event.celebrants || "giftcash-event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "giftcash-event";
  const stamp = date.toISOString().slice(0, 10);
  return `${safeTitle}-gifters-report-${stamp}.${format === "excel" ? "xls" : "pdf"}`;
}

export function eventReportSubject(event: GiftEvent) {
  return `GiftCash Gifters Report - ${event.title || event.celebrants}`;
}

export function eventReportEmailText(event: GiftEvent, format: EventReportFormat) {
  const summary = eventReportSummary(event);
  const formatMoney = moneyFormatter(event.currency);
  return [
    `Hello,`,
    ``,
    `Your GiftCash gifters report for ${event.title || event.celebrants} is attached as ${format === "excel" ? "an Excel file" : "a PDF file"}.`,
    ``,
    `Total gifters: ${summary.totalGifts}`,
    `Total gifted: ${formatMoney.format(summary.totalAmount / 100)}`,
    `Average gift: ${formatMoney.format(summary.averageGift / 100)}`,
    ``,
    `Regards,`,
    `GiftCash`,
  ].join("\n");
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEventReportExcelHtml(event: GiftEvent) {
  const rows = eventReportRows(event);
  const summary = eventReportSummary(event);
  const formatMoney = moneyFormatter(event.currency);
  const eventDate = formatDate(event.date);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #1b1226; }
    h1 { color: #5b21b6; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #5b21b6; color: #ffffff; text-align: left; }
    th, td { border: 1px solid #d9d2e9; padding: 8px; vertical-align: top; }
    .summary th { background: #f5edff; color: #1b1226; width: 220px; }
    .money { text-align: right; }
  </style>
</head>
<body>
  <h1>GiftCash Gifters Report</h1>
  <h2>${escapeHtml(event.title)}</h2>
  <table class="summary">
    <tr><th>Celebrants</th><td>${escapeHtml(event.celebrants)}</td></tr>
    <tr><th>Event Date</th><td>${escapeHtml(eventDate)}</td></tr>
    <tr><th>Currency</th><td>${escapeHtml(event.currency)}</td></tr>
    <tr><th>Total Gifters</th><td>${summary.totalGifts}</td></tr>
    <tr><th>Total Gifted</th><td>${escapeHtml(formatMoney.format(summary.totalAmount / 100))}</td></tr>
    <tr><th>Average Gift</th><td>${escapeHtml(formatMoney.format(summary.averageGift / 100))}</td></tr>
    <tr><th>Named Gifters</th><td>${summary.namedGifters}</td></tr>
    <tr><th>Anonymous Gifters</th><td>${summary.anonymousGifters}</td></tr>
    <tr><th>Generated</th><td>${escapeHtml(formatDateTime(summary.generatedAt))}</td></tr>
  </table>

  <h2>Gifters</h2>
  <table>
    <thead>
      <tr>
        <th>S/N</th>
        <th>Gifter</th>
        <th>Amount</th>
        <th>Table</th>
        <th>Message</th>
        <th>Gifted At</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${row.sn}</td><td>${escapeHtml(row.gifter)}</td><td class="money">${escapeHtml(row.amount)}</td><td>${escapeHtml(row.table)}</td><td>${escapeHtml(row.message)}</td><td>${escapeHtml(row.giftedAt)}</td></tr>`).join("\n")}
    </tbody>
  </table>
</body>
</html>`;
}

export function buildEventReportTextLines(event: GiftEvent) {
  const rows = eventReportRows(event);
  const summary = eventReportSummary(event);
  const formatMoney = moneyFormatter(event.currency);
  const lines = [
    "GiftCash Gifters Report",
    event.title,
    `Celebrants: ${event.celebrants}`,
    `Event Date: ${formatDate(event.date)}`,
    `Total Gifters: ${summary.totalGifts}`,
    `Total Gifted: ${formatMoney.format(summary.totalAmount / 100)}`,
    `Average Gift: ${formatMoney.format(summary.averageGift / 100)}`,
    `Generated: ${formatDateTime(summary.generatedAt)}`,
    "",
    "Gifters",
  ];
  if (rows.length === 0) {
    lines.push("No gifts have been recorded yet.");
  } else {
    rows.forEach((row) => {
      lines.push(`${row.sn}. ${row.gifter} — ${row.amount}${row.table ? ` — Table ${row.table}` : ""}`);
      if (row.message) lines.push(`   Message: ${row.message}`);
      lines.push(`   Gifted At: ${row.giftedAt}`);
    });
  }
  return lines;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfLine(line: string, max = 92) {
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Build a small, dependency-free PDF suitable for report downloads/attachments. */
export function buildEventReportPdfBytes(event: GiftEvent): Uint8Array {
  const contentLines = buildEventReportTextLines(event).flatMap((line) => wrapPdfLine(line));
  const pages: string[][] = [];
  for (let i = 0; i < contentLines.length; i += 42) pages.push(contentLines.slice(i, i + 42));
  if (!pages.length) pages.push(["GiftCash Gifters Report"]);

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
  void catalogId;
  const pagesId = add("__PAGES__");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const page of pages) {
    const stream = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL", ...page.map((line) => `(${pdfEscape(line)}) Tj T*`), "ET"].join("\n");
    const streamId = add(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((body, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function giftCountLabel(count: number) {
  return count === 1 ? "1 gifter" : `${count} gifters`;
}
