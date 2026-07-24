"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, FileSpreadsheet, Gift, HelpCircle, Loader2, MonitorPlay, Settings2, Share2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ContributionWall } from "@/components/social/contribution-wall";
import { ContributeSheet, type ContributionInput } from "@/components/social/contribute-sheet";
import { ShareModal } from "@/components/share/share-modal";
import { SetupGuide } from "@/components/party/setup-guide";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import type { GiftEvent } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { occasionById } from "@/lib/occasions";

async function loadParty(slug: string): Promise<GiftEvent | undefined> {
  try {
    const response = await fetch(`/api/events/${slug}`, { cache: "no-store" });
    if (response.ok) return (await response.json()) as GiftEvent;
  } catch (error) {
    console.warn("Falling back to local Gift Party store", error);
  }
  return (await repo.getEvent(slug)) ?? undefined;
}

export function EventPage({ slug }: { slug: string }) {
  const { data: party, loading } = useRepoData(() => loadParty(slug), [slug]);
  const [sheet, setSheet] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  if (loading) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!party) return <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center"><div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Gift Party not found</h1><Link href="/" className="mt-4 inline-block text-brand underline">Go home</Link></div></div>;

  const meta = occasionById(party.type as never);
  const total = party.contributions.reduce((sum, contribution) => sum + contribution.amount, 0);
  const date = new Date(party.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const url = typeof window !== "undefined" ? `${window.location.origin}/party/${slug}` : `/party/${slug}`;

  const contribute = async (contribution: ContributionInput) => {
    const response = await fetch(`/api/events/${slug}/contribute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contribution) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Could not add contribution.");
    }
    window.dispatchEvent(new Event("giftcash:change"));
  };

  const startFlutterwaveCheckout = async (contribution: ContributionInput): Promise<{ authorizationUrl: string; reference: string }> => {
    const response = await fetch(`/api/events/${slug}/payments/flutterwave/initialize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contribution) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Could not start Flutterwave checkout.");
    return payload as { authorizationUrl: string; reference: string };
  };

  const shareMessage = `🎁 Celebrate ${party.celebrants} with a cash gift!\n${date}\n\nSend your gift and message here: ${url}`;

  return (
    <div className="min-h-dvh bg-cream">
      <div className="relative px-4 pb-14 pt-5 text-cream sm:px-5 sm:pb-16 sm:pt-6" style={{ background: `linear-gradient(150deg, ${party.gradient[0]}, ${party.gradient[1]})` }}>
        <div className="mx-auto max-w-lg"><div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-cream/80 hover:text-cream">Dashboard</Link></div><div className="mt-10 text-center"><span className="rounded-full bg-white/15 px-3 py-1 text-xs">{meta.emoji} Gift Party</span><h1 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight sm:text-4xl">{party.celebrants}</h1><p className="mt-2 inline-flex items-center gap-1.5 text-cream/85"><CalendarDays className="h-4 w-4" /> {date}</p></div></div>
      </div>

      <div className="mx-auto -mt-10 max-w-lg px-4 pb-12 sm:px-5">
        <div className="rounded-3xl border border-ink/5 bg-white p-6 text-center shadow-lift">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Gift className="h-6 w-6" /></span>
          <h2 className="mt-3 font-display text-xl font-semibold">Send a cash gift</h2>
          <p className="mt-1 text-sm text-muted">Celebrate {party.celebrants} with a GiftCash contribution and personal message.</p>
          {party.campaignMode && <p className="mt-3 rounded-xl bg-gold-soft px-3 py-2 text-xs text-ink/70">Campaign contribution—your name is required{party.maxContribution ? `, up to ${formatMoney(party.maxContribution, party.currency)}` : ""}.</p>}
          {party.showTotal && <p className="mt-3 font-display text-2xl font-semibold text-emerald">{formatMoney(total, party.currency)} received</p>}
          <div className="mt-5 grid gap-3 sm:flex"><Button onClick={() => setSheet(true)} size="lg" className="flex-1">Gift cash</Button><Button variant="outline" size="lg" onClick={() => setShareOpen(true)} className="w-full sm:w-auto"><Share2 className="h-4 w-4" /> Share</Button></div>
        </div>

        {party.story && <p className="mt-5 rounded-2xl bg-white/70 p-5 text-center text-sm text-muted">{party.story}</p>}

        <div className="mt-5 flex items-center gap-4 rounded-3xl border border-ink/5 bg-white/70 p-4 sm:p-5"><div className="rounded-2xl bg-white p-2 shadow-soft"><QRCodeSVG value={url} size={92} fgColor="#1b1226" /></div><div><p className="font-medium">Scan to send a GiftCash</p><p className="text-sm text-muted">Display this QR at the celebration or share it anywhere.</p></div></div>

        <div className="mt-5 rounded-3xl border border-brand/15 bg-brand-soft/40 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand"><MonitorPlay className="h-4 w-4" /> Party Mode tools</p>
          <p className="mt-1 text-sm text-muted">Celebrate gifts on the big screen, control the show from your phone and export a gifter report.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ButtonLink href={`/party/${slug}/live`} variant="dark" className="w-full"><MonitorPlay className="h-4 w-4" /> Big screen</ButtonLink>
            <ButtonLink href={`/party/${slug}/host`} variant="primary" className="w-full"><Settings2 className="h-4 w-4" /> Host console</ButtonLink>
            <ButtonLink href={`/party/${slug}/report`} variant="gold" className="w-full"><FileSpreadsheet className="h-4 w-4" /> Gifters report</ButtonLink>
            <button onClick={() => setSetupOpen(true)} className="w-full rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-sm hover:border-brand/40"><HelpCircle className="mr-1 inline h-4 w-4" /> Setup help</button>
          </div>
        </div>

        <div className="mt-8"><h2 className="font-display text-xl font-semibold">Gift messages</h2><div className="mt-4"><ContributionWall contributions={party.contributions} currency={party.currency} showAmounts={party.showTotal} /></div></div>
      </div>

      <ContributeSheet open={sheet} onClose={() => setSheet(false)} onContribute={contribute} onStartCheckout={startFlutterwaveCheckout} currency={party.currency} ctaLabel={`Gift ${party.celebrants}`} requireName={party.campaignMode} maxAmount={party.maxContribution} />
      <SetupGuide open={setupOpen} onClose={() => setSetupOpen(false)} liveUrl={typeof window !== "undefined" ? `${window.location.origin}/party/${slug}/live` : `/party/${slug}/live`} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={url} title={party.title} heading={`Share ${party.celebrants}’s Gift Party`} defaultMessage={shareMessage} qrLabel="Scan to send a GiftCash" calendar={{ title: party.title, details: `Celebrate ${party.celebrants} with a cash gift: ${url}`, start: party.date }} />
    </div>
  );
}
