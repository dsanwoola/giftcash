"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock, MonitorPlay, QrCode, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ShareHub } from "@/components/share/share-hub";
import { CURRENCIES, toMinor } from "@/lib/money";
import { repo } from "@/lib/data/repo";
import type { CreateEventInput } from "@/lib/data/repo-types";
import { useAuth } from "@/lib/auth/auth-context";
import { OCCASIONS, occasionById } from "@/lib/occasions";
import type { CurrencyCode, EventType, GiftEvent } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

export default function CreateGiftPartyPage() {
  const { user, loading } = useAuth();
  const [created, setCreated] = useState<GiftEvent | null>(null);

  if (loading) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (!user) {
    return (
      <AuthShell title="Sign in to create a Gift Party" subtitle="Your Gift Party belongs to your account so you can manage contributions, Party Mode and reports." footer={<>New here? <Link href="/register" className="font-medium text-brand">Create an account</Link></>}>
        <div className="space-y-3 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand"><Lock className="h-6 w-6" /></span>
          <ButtonLink href="/login?next=/party/create" size="lg" className="w-full">Sign in to continue</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  if (created) return <SuccessShare party={created} />;
  return <CreateForm organizerName={user.displayName ?? "Me"} onCreated={setCreated} />;
}

function CreateForm({ organizerName, onCreated }: { organizerName: string; onCreated: (party: GiftEvent) => void }) {
  const [type, setType] = useState<EventType>("wedding");
  const [celebrants, setCelebrants] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:59");
  const [story, setStory] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [goal, setGoal] = useState("");
  const [showTotal, setShowTotal] = useState(false);
  const [campaignMode, setCampaignMode] = useState(false);
  const [maxContribution, setMaxContribution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!celebrants.trim()) return setError("Add the celebrant name(s).");
    if (!date) return setError("Pick the celebration date.");
    if (!startTime || !endTime) return setError("Add the start and end time.");
    const startsAt = new Date(`${date}T${startTime}`);
    const endsAt = new Date(`${date}T${endTime}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return setError("Enter a valid celebration date and time.");
    if (endsAt <= startsAt) return setError("End time must be after the start time.");

    const chosen = occasionById(type as never);
    const input: CreateEventInput = {
      type,
      title: title.trim() || `${chosen.label} Gift Party for ${celebrants.trim()}`,
      celebrants: celebrants.trim(),
      date: startsAt.toISOString(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      story: story.trim() || undefined,
      gradient: chosen.gradient,
      currency,
      showTotal,
      goalAmount: goal ? toMinor(Number(goal)) : undefined,
      campaignMode: campaignMode || undefined,
      maxContribution: campaignMode && maxContribution ? toMinor(Number(maxContribution)) : undefined,
      payoutProvider: "manual",
      revenuePlan: "starter",
      isPublic: true,
      // Occasion access modules are deliberately disabled in GiftCash.
      ticketingEnabled: false,
      rsvpEnabled: false,
      seatingEnabled: false,
      checkInEnabled: false,
      ticketTypes: [],
      tables: [],
      guests: [],
      tickets: [],
      organizerName,
    };

    setError("");
    setBusy(true);
    try {
      onCreated(await repo.createEvent(input));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not create Gift Party.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-5 pb-12 sm:px-5 sm:py-7">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>
        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"><Sparkles className="h-3.5 w-3.5" /> Gift Party + Party Mode</span>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold">Create a Gift Party 🎉</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Create a beautiful contribution page, display its QR code and celebrate gifts live on the big screen.</p>

        <div className="mt-7 space-y-4">
          <Field label="Celebration type">
            <select className={inputCls} value={type} onChange={(event) => setType(event.target.value as EventType)}>
              {OCCASIONS.map((occasion) => <option key={occasion.id} value={occasion.id}>{occasion.emoji} {occasion.label}</option>)}
            </select>
          </Field>
          <Field label="Celebrant name(s) *"><input className={inputCls} value={celebrants} onChange={(event) => setCelebrants(event.target.value)} placeholder="e.g. Tunde & Zainab" /></Field>
          <Field label="Gift Party title (optional)"><input className={inputCls} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Tunde & Zainab’s Wedding Gift Party" /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date *"><input type="date" className={inputCls} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
            <Field label="Start time *"><input type="time" className={inputCls} value={startTime} onChange={(event) => setStartTime(event.target.value)} /></Field>
            <Field label="End time *"><input type="time" className={inputCls} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></Field>
          </div>
          <Field label="Currency"><select className={inputCls} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.symbol} {item.code}</option>)}</select></Field>
          <Field label="Gift goal (optional)"><input className={inputCls} inputMode="numeric" value={goal} onChange={(event) => setGoal(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 500000" /></Field>
          <Field label="Welcome message (optional)"><textarea rows={4} className={inputCls} value={story} onChange={(event) => setStory(event.target.value)} placeholder="A warm note for everyone celebrating with you…" /></Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Feature icon={QrCode} title="Shareable QR page" body="Guests scan and send gifts from their phones." />
            <Feature icon={MonitorPlay} title="Live Party Mode" body="Show gifts, messages, totals and celebrations live." />
          </div>

          <Toggle checked={showTotal} onClick={() => setShowTotal((value) => !value)} label="Show total received to guests" icon="👁️" />
          <Toggle checked={campaignMode} onClick={() => setCampaignMode((value) => !value)} label="Campaign contribution mode" icon="🏛️" />
          {campaignMode && (
            <div className="space-y-3 rounded-2xl border border-brand/15 bg-brand-soft/30 p-4">
              <Field label="Maximum contribution per donor (optional)"><input className={inputCls} inputMode="numeric" value={maxContribution} onChange={(event) => setMaxContribution(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 100000" /></Field>
              <p className="text-xs leading-5 text-muted">Campaign mode requires a donor name, disables anonymous gifts and applies the contribution cap. The organizer remains responsible for applicable donor-disclosure and campaign-finance rules.</p>
            </div>
          )}

          <div className="rounded-2xl border border-emerald/20 bg-emerald/5 p-4 text-sm text-muted"><strong className="text-ink">Focused GiftCash experience:</strong> every Gift Party includes a contribution page, sharing QR, live Party Mode, host controls and gifter reports.</div>
          {error && <p className="text-sm text-pink">{error}</p>}
          <Button onClick={create} size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Create Gift Party</Button>
        </div>
      </div>
    </div>
  );
}

function SuccessShare({ party }: { party: GiftEvent }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/party/${party.slug}` : `/party/${party.slug}`;
  const date = new Date(party.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const message = `🎁 Celebrate ${party.celebrants} with a cash gift!\n${date}\n\nSend your gift and message here: ${url}`;
  return (
    <div className="min-h-dvh bg-cream"><div className="mx-auto max-w-lg px-4 py-6 pb-12 sm:px-5"><div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted">Dashboard</Link></div><div className="mt-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white shadow-lift"><CheckCircle2 className="h-8 w-8" /></div><h1 className="mt-4 font-display text-2xl font-semibold">Your Gift Party is live! 🎉</h1><p className="mt-1 text-muted">Share the link or QR code so everyone can celebrate with a gift.</p></div><div className="mt-7 rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft"><ShareHub url={url} title={party.title} defaultMessage={message} qrLabel="Scan to send a GiftCash" calendar={{ title: party.title, details: `Celebrate ${party.celebrants} with a cash gift: ${url}`, start: party.date }} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><ButtonLink href={`/party/${party.slug}`} variant="outline" className="w-full">View Gift Party</ButtonLink><ButtonLink href={`/party/${party.slug}/live`} variant="gold" className="w-full">Open Party Mode</ButtonLink></div></div></div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm text-muted">{label}</span>{children}</label>; }
function Feature({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) { return <div className="rounded-2xl border border-ink/5 bg-white p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-4 w-4" /></span><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{body}</p></div>; }
function Toggle({ checked, onClick, label, icon }: { checked: boolean; onClick: () => void; label: string; icon: string }) { return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm"><span>{icon} {label}</span><span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} /></span></button>; }
