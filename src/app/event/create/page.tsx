"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ShareHub } from "@/components/share/share-hub";
import { CURRENCIES, toMinor } from "@/lib/money";
import { repo } from "@/lib/data/repo";
import { useAuth } from "@/lib/auth/auth-context";
import type { CurrencyCode, EventType, GiftEvent } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

const TYPES: { id: EventType; emoji: string; label: string; gradient: [string, string] }[] = [
  { id: "wedding", emoji: "💍", label: "Wedding", gradient: ["#2e1065", "#e6b143"] },
  { id: "birthday", emoji: "🎂", label: "Birthday", gradient: ["#6429c9", "#f25c9e"] },
  { id: "graduation", emoji: "🎓", label: "Graduation", gradient: ["#0ea271", "#2e1065"] },
  { id: "naming", emoji: "👶", label: "Naming", gradient: ["#0ea271", "#e6b143"] },
  { id: "anniversary", emoji: "🥂", label: "Anniversary", gradient: ["#6429c9", "#e6b143"] },
];

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  const [created, setCreated] = useState<GiftEvent | null>(null);

  if (loading) {
    return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  }

  // Require sign-in to create & own an event page.
  if (!user) {
    return (
      <AuthShell
        title="Sign in to create an event"
        subtitle="Your event page is tied to your account so you can manage gifts and guests."
        footer={<>New here? <Link href="/register" className="font-medium text-brand">Create an account</Link></>}
      >
        <div className="space-y-3 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand"><Lock className="h-6 w-6" /></span>
          <ButtonLink href="/login?next=/event/create" size="lg" className="w-full">Sign in to continue</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  if (created) return <SuccessShare event={created} />;

  return <CreateForm organizerName={user.displayName ?? "Me"} onCreated={setCreated} />;
}

function CreateForm({ organizerName, onCreated }: { organizerName: string; onCreated: (e: GiftEvent) => void }) {
  const [type, setType] = useState<EventType>("wedding");
  const [celebrants, setCelebrants] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
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
    if (!date) return setError("Pick the event date.");
    setError(""); setBusy(true);
    const chosen = TYPES.find((t) => t.id === type)!;
    const event = await repo.createEvent({
      type,
      title: title.trim() || `${chosen.label} of ${celebrants.trim()}`,
      celebrants: celebrants.trim(),
      date: new Date(date).toISOString(),
      story: story.trim() || undefined,
      gradient: chosen.gradient,
      currency,
      showTotal,
      goalAmount: goal ? toMinor(Number(goal)) : undefined,
      campaignMode: campaignMode || undefined,
      maxContribution: campaignMode && maxContribution ? toMinor(Number(maxContribution)) : undefined,
      isPublic: true,
      organizerName,
    });
    setBusy(false);
    onCreated(event);
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-4 pb-10 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>
        <h1 className="mt-8 text-balance font-display text-2xl font-semibold sm:text-3xl">Create an event gift page 💍</h1>
        <p className="mt-1 text-sm text-muted">Perfect for weddings &amp; ceremonies. Share it so guests can send cash from anywhere.</p>

        <div className="mt-6 space-y-4">
          <Field label="Event type">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TYPES.map((t) => (
                <button key={t.id} onClick={() => setType(t.id)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-xs ${type === t.id ? "border-brand bg-brand-soft" : "border-ink/10 bg-white"}`}>
                  <span className="text-xl">{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Celebrant name(s) *"><input className={inputCls} value={celebrants} onChange={(e) => setCelebrants(e.target.value)} placeholder="e.g. Tunde & Zainab" /></Field>
          <Field label="Page title (optional)"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The wedding of Tunde & Zainab" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Event date *"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Currency">
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Fundraising goal (optional)"><input className={inputCls} inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 500000 — shows a goal thermometer on the big screen" /></Field>
          <Field label="Story / welcome note (optional)"><textarea rows={3} className={inputCls} value={story} onChange={(e) => setStory(e.target.value)} placeholder="A warm note for your guests…" /></Field>
          <button onClick={() => setShowTotal((v) => !v)} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm">
            <span>👁️ Show total received to guests</span>
            <span className={`relative h-6 w-11 rounded-full transition ${showTotal ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showTotal ? "left-[22px]" : "left-0.5"}`} /></span>
          </button>

          <button onClick={() => setCampaignMode((v) => !v)} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm">
            <span>🏛️ Campaign mode (donor info + caps)</span>
            <span className={`relative h-6 w-11 rounded-full transition ${campaignMode ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${campaignMode ? "left-[22px]" : "left-0.5"}`} /></span>
          </button>
          {campaignMode && (
            <div className="space-y-3 rounded-2xl border border-brand/15 bg-brand-soft/30 p-4">
              <Field label="Max contribution per donor (optional)">
                <input className={inputCls} inputMode="numeric" value={maxContribution} onChange={(e) => setMaxContribution(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 100000" />
              </Field>
              <p className="text-xs text-muted">
                Campaign mode requires a donor name (no anonymous gifts) and enforces the cap.
                ⚠️ You are responsible for complying with campaign-finance &amp; KYC rules in your jurisdiction (donor disclosure, contribution limits, eligible/non-foreign sources). Do not use for vote inducement.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-pink">{error}</p>}
          <Button onClick={create} size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Create &amp; share</Button>
        </div>
      </div>
    </div>
  );
}

function SuccessShare({ event }: { event: GiftEvent }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/event/${event.slug}` : `/event/${event.slug}`;
  const dateStr = new Date(event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const message = `🎉 You're invited to ${event.celebrants}!\n${dateStr}\n\nIf you'd like to bless us with a cash gift, tap below — it only takes a moment. 💛`;

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-4 pb-10 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>

        <div className="mt-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white shadow-lift">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Your event page is live! 🎉</h1>
          <p className="mt-1 text-muted">Share it with your guests — they can gift from anywhere.</p>
        </div>

        <div className="mt-7 rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft">
          <ShareHub
            url={url}
            title={event.title}
            defaultMessage={message}
            qrLabel="Scan to gift at the venue"
            calendar={{
              title: event.title,
              details: `Celebrate ${event.celebrants}. Send a cash gift: ${url}`,
              start: event.date,
            }}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ButtonLink href={`/event/${event.slug}`} variant="outline" className="w-full">View event page</ButtonLink>
          <ButtonLink href="/dashboard" variant="gold" className="w-full">Done</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm text-muted">{label}</span>{children}</label>;
}
