"use client";

import type { Contribution, CurrencyCode } from "./types";
import { toMajor } from "./money";

/** Quote a CSV cell (escape quotes, wrap if it contains separators/newlines). */
function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Trigger a client-side download of CSV text. */
export function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel reads UTF-8 (₦ etc.) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a donor/contribution report for an event or group gift. */
export function contributionsToCsv(contribs: Contribution[], currency: CurrencyCode): string {
  const header = ["Date", "Name", "Anonymous", `Amount (${currency})`, "Table", "Message"];
  const rows = contribs.map((c) => [
    new Date(c.createdAt).toISOString(),
    c.anonymous ? "Anonymous" : c.name,
    c.anonymous ? "yes" : "no",
    toMajor(c.amount),
    c.table ?? "",
    c.message ?? "",
  ]);
  return toCsv([header, ...rows]);
}
