"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, Gift, HelpCircle, Loader2, MonitorPlay, QrCode, Settings2, Share2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ContributionWall } from "@/components/social/contribution-wall";
import { ContributeSheet, type ContributionInput } from "@/components/social/contribute-sheet";
import { ShareModal } from "@/components/share/share-modal";
import { SetupGuide } from "@/components/party/setup-guide";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import type { EventType } from "@/lib/types";

const TYPE_META: Record<EventType, { emoji: string; label: string }> = {
  wedding: { emoji: "💍", label: "Wedding" },
  birthday: { emoji: "🎂", label: "Birthday" },
  graduation: { emoji: "🎓", label: "Graduation" },
  naming: { emoji: "👶", label: "Naming Ceremony" },
  anniversary: { emoji: "🥂", label: "Anniversary" },
};

export function EventPage({ slug }: { slug: string }) {
  const { data: event, loading } = useRepoData(() => repo.getEvent(slug), [slug]);
  const [sheet, setSheet] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  // Picked up when a guest scans a per-table QR code (/event/slug?t=N).
  const [table] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("t") : null,
  );

  if (loading) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!event) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center">
        <div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Event not found</h1><Link href="/" className="mt-4 inline-block text-brand underline">Go home</Link></div>
      </div>
    );
  }

  const meta = TYPE_META[event.type];
  const total = event.contributions.reduce((s, c) => s + c.amount, 0);
  const dateStr = new Date(event.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const url = typeof window !== "undefined" ? window.location.href : "";

  const contribute = async (c: ContributionInput) => {
    await repo.contributeToEvent(slug, { ...c, table: table ?? undefined });
  };
  const inviteMessage = `🎉 You're invited to ${event.celebrants}!\n${dateStr}\n\nIf you'd like to bless us with a cash gift, tap below — it only takes a moment. 💛`;

  return (
    <div className="min-h-dvh bg-cream">
      {/* Banner */}
      <div className="relative px-5 pt-6 pb-16 text-cream" style={{ background: `linear-gradient(150deg, ${event.gradient[0]}, ${event.gradient[1]})` }}>
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-cream/80 hover:text-cream">Dashboard</Link></div>
          <div className="mt-10 text-center">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">{meta.emoji} {meta.label}</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">{event.celebrants}</h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-cream/85"><CalendarDays className="h-4 w-4" /> {dateStr}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-lg px-5 pb-12">
        {/* Gift CTA card */}
        <div className="rounded-3xl border border-ink/5 bg-white p-6 text-center shadow-lift">
          <span className="grid mx-auto h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Gift className="h-6 w-6" /></span>
          <h2 className="mt-3 font-display text-xl font-semibold">Send a cash gift</h2>
          <p className="mt-1 text-sm text-muted">Bless {event.celebrants} with a Gift Cash contribution.</p>
          {table && <p className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">📍 You&apos;re at Table {table}</p>}
          {event.campaignMode && <p className="mt-3 rounded-xl bg-gold-soft px-3 py-2 text-xs text-ink/70">🏛️ Campaign donation — your name is required{event.maxContribution ? `, up to ${formatMoney(event.maxContribution, event.currency)}` : ""}. By donating you confirm you&apos;re an eligible contributor.</p>}
          {event.showTotal && <p className="mt-3 font-display text-2xl font-semibold text-emerald">{formatMoney(total, event.currency)} received</p>}
          <div className="mt-5 flex gap-3">
            <Button onClick={() => setSheet(true)} size="lg" className="flex-1">Gift cash</Button>
            <Button variant="outline" size="lg" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" /> Share</Button>
          </div>
        </div>

        {event.story && <p className="mt-5 rounded-2xl bg-white/70 p-5 text-center text-sm text-muted">{event.story}</p>}

        {/* Venue QR */}
        <div className="mt-5 flex items-center gap-4 rounded-3xl border border-ink/5 bg-white/70 p-5">
          <div className="rounded-2xl bg-white p-2 shadow-soft"><QRCodeSVG value={url} size={92} fgColor="#1b1226" /></div>
          <div>
            <p className="font-medium">Scan at the venue</p>
            <p className="text-sm text-muted">Display this QR so guests can send a gift in seconds.</p>
          </div>
        </div>

        {/* Host tools */}
        <div className="mt-5 rounded-3xl border border-brand/15 bg-brand-soft/40 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand"><MonitorPlay className="h-4 w-4" /> Host tools</p>
          <p className="mt-1 text-sm text-muted">Run the live big-screen, control it from your phone, and print per-table QR codes.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ButtonLink href={`/event/${slug}/live`} variant="dark" className="w-full"><MonitorPlay className="h-4 w-4" /> Big screen</ButtonLink>
            <ButtonLink href={`/event/${slug}/host`} variant="primary" className="w-full"><Settings2 className="h-4 w-4" /> Host console</ButtonLink>
            <ButtonLink href={`/event/${slug}/tables`} variant="outline" className="w-full"><QrCode className="h-4 w-4" /> Table QRs</ButtonLink>
            <button onClick={() => setSetupOpen(true)} className="w-full rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-sm hover:border-brand/40"><HelpCircle className="mr-1 inline h-4 w-4" /> Setup help</button>
          </div>
        </div>

        {/* Guest wall */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold">Guest messages</h2>
          <div className="mt-4"><ContributionWall contributions={event.contributions} currency={event.currency} showAmounts={event.showTotal} /></div>
        </div>
      </div>

      <ContributeSheet
        open={sheet}
        onClose={() => setSheet(false)}
        onContribute={contribute}
        currency={event.currency}
        ctaLabel={`Gift ${event.celebrants}`}
        requireName={event.campaignMode}
        maxAmount={event.maxContribution}
      />
      <SetupGuide open={setupOpen} onClose={() => setSetupOpen(false)} liveUrl={typeof window !== "undefined" ? `${window.location.origin}/event/${slug}/live` : `/event/${slug}/live`} />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={url}
        title={event.title}
        heading={`Invite guests to ${event.celebrants}`}
        defaultMessage={inviteMessage}
        qrLabel="Scan to gift at the venue"
        calendar={{ title: event.title, details: `Celebrate ${event.celebrants}. Send a cash gift: ${url}`, start: event.date }}
      />
    </div>
  );
}
