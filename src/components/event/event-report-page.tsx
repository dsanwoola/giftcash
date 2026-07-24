"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { repo } from "@/lib/data/repo";
import { useRepoData } from "@/lib/data/use-repo";
import { formatMoney } from "@/lib/money";
import {
  buildEventReportExcelHtml,
  buildEventReportPdfBytes,
  eventReportFileName,
  eventReportRows,
  eventReportSummary,
  formatDate,
  giftCountLabel,
  type EventReportFormat,
} from "@/lib/reports/event-report";

export function EventReportPage({ slug }: { slug: string }) {
  const { user, mode } = useAuth();
  const { data: event, loading } = useRepoData(() => repo.getEvent(slug), [slug]);
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailFormat, setEmailFormat] = useState<EventReportFormat>("excel");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => (event ? eventReportRows(event) : []), [event]);
  const summary = useMemo(() => (event ? eventReportSummary(event) : null), [event]);

  if (loading) {
    return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  }

  if (!event || !summary) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center">
        <div>
          <p className="text-5xl">🔍</p>
          <h1 className="mt-3 font-display text-2xl font-semibold">Report not found</h1>
          <Link href="/dashboard" className="mt-4 inline-block text-brand underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const total = formatMoney(summary.totalAmount, event.currency);
  const average = formatMoney(summary.averageGift, event.currency);
  const isOrganizer = !user || user.uid === event.organizerId;

  const downloadExcel = () => {
    const html = buildEventReportExcelHtml(event);
    downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), eventReportFileName(event, "excel"));
  };

  const downloadPdf = () => {
    const bytes = buildEventReportPdfBytes(event);
    const pdfBytes = new Uint8Array(bytes);
    downloadBlob(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }), eventReportFileName(event, "pdf"));
  };

  const emailReport = async () => {
    setSending(true);
    setError(null);
    setStatus(null);
    try {
      if (mode !== "firebase") {
        throw new Error("Emailing reports is available when GiftCash is connected to Firebase sign-in. You can still download Excel or PDF in demo mode.");
      }
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again before emailing a report.");
      const res = await fetch(`/api/events/${event.slug}/report/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, format: emailFormat }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not email report.");
      setStatus(`Report emailed to ${email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not email report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream px-4 py-5 sm:px-5 sm:py-8">
      <main className="mx-auto max-w-4xl">
        <Link href={`/party/${event.slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to Gift Party
        </Link>

        <section className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-lift">
          <div className="bg-gradient-to-br from-brand to-brand-deep px-5 py-8 text-cream sm:px-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs"><FileSpreadsheet className="h-3.5 w-3.5" /> Gifters report</p>
            <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{event.title}</h1>
            <p className="mt-2 text-cream/80">{event.celebrants} • {formatDate(event.date)}</p>
          </div>

          <div className="p-5 sm:p-8">
            {!isOrganizer && (
              <div className="mb-5 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-sm text-ink/75">
                This report belongs to the Gift Party organizer. Downloads are visible here for preview, but emailing requires organizer sign-in.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Total gifted" value={total} />
              <Stat label="Gifters" value={giftCountLabel(summary.totalGifts)} />
              <Stat label="Average gift" value={average} />
              <Stat label="Anonymous" value={String(summary.anonymousGifters)} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button onClick={downloadExcel} variant="gold" size="lg" className="w-full">
                <Download className="h-4 w-4" /> Download Excel
              </Button>
              <Button onClick={downloadPdf} variant="outline" size="lg" className="w-full">
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
            </div>

            <div className="mt-6 rounded-3xl border border-ink/5 bg-cream/60 p-5">
              <p className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-brand" /> Email report to myself</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-brand/50"
                />
                <select
                  value={emailFormat}
                  onChange={(e) => setEmailFormat(e.target.value as EventReportFormat)}
                  className="h-12 rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-brand/50"
                >
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
                <Button onClick={emailReport} disabled={sending || !email.trim()} className="h-12">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                </Button>
              </div>
              {status && <p className="mt-3 rounded-xl bg-emerald/10 px-3 py-2 text-sm text-emerald">{status}</p>}
              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-ink/5">
              <div className="flex items-center justify-between bg-ink px-4 py-3 text-cream">
                <h2 className="font-medium">Gifters</h2>
                <span className="text-xs text-cream/70">{rows.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-cream text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">Gifter</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Table</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5 bg-white">
                    {rows.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No gifts have been recorded yet.</td></tr>
                    ) : rows.map((row) => (
                      <tr key={`${row.sn}-${row.giftedAt}`}>
                        <td className="px-4 py-3 font-medium">{row.gifter}</td>
                        <td className="px-4 py-3 text-right font-semibold">{row.amount}</td>
                        <td className="px-4 py-3 text-muted">{row.table || "—"}</td>
                        <td className="max-w-xs px-4 py-3 text-muted">{row.message || "—"}</td>
                        <td className="px-4 py-3 text-muted">{row.giftedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-cream/70 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
