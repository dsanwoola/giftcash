"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";

/**
 * Printable table-tent QR cards. Each table gets a card with a QR that opens the
 * event page tagged with `?t=N`, so gifts can be attributed to a table.
 */
export function TableTents({ slug }: { slug: string }) {
  const { data: event, loading } = useRepoData(() => repo.getEvent(slug), [slug]);
  const [count, setCount] = useState(10);

  if (loading) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!event) {
    return <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center"><div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Event not found</h1><Link href="/" className="mt-4 inline-block text-brand underline">Go home</Link></div></div>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const tables = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="min-h-dvh bg-cream">
      {/* Controls (hidden when printing) */}
      <div className="no-print sticky top-0 z-10 border-b border-ink/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Logo />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              Tables
              <input
                type="number" min={1} max={60} value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="w-20 rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none focus:border-brand"
              />
            </label>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          </div>
        </div>
      </div>

      <div className="no-print mx-auto max-w-5xl px-5 pt-6">
        <h1 className="font-display text-2xl font-semibold">Table QR codes — {event.celebrants}</h1>
        <p className="mt-1 text-sm text-muted">Print these and place one on each table. Guests scan to send a gift; we tag it with the table number.</p>
      </div>

      {/* Cards */}
      <div className="tent-grid mx-auto grid max-w-5xl grid-cols-1 gap-5 p-5 sm:grid-cols-2">
        {tables.map((n) => (
          <div key={n} className="tent-card flex flex-col items-center rounded-3xl border border-ink/10 bg-white p-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-brand">Gift Cash</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{event.celebrants}</h2>
            <p className="mt-3 inline-block rounded-full bg-brand text-white px-4 py-1 text-sm font-semibold">Table {n}</p>
            <div className="my-4 rounded-2xl border border-ink/5 p-3">
              <QRCodeSVG value={`${origin}/event/${event.slug}?t=${n}`} size={168} fgColor="#1b1226" />
            </div>
            <p className="font-medium">Scan to send a cash gift 🎁</p>
            <p className="text-xs text-muted">Point your phone camera at the code</p>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .tent-grid { gap: 0 !important; padding: 0 !important; }
          .tent-card { break-inside: avoid; page-break-inside: avoid; border-color: #ddd; margin: 8mm; }
          @page { margin: 8mm; }
        }
      `}</style>
    </div>
  );
}
