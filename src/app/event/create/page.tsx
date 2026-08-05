"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ShareHub } from "@/components/share/share-hub";
import { CURRENCIES, toMinor } from "@/lib/money";
import { repo } from "@/lib/data/repo";
import type { CreateEventInput } from "@/lib/data/repo-types";
import { useAuth, friendlyAuthError } from "@/lib/auth/auth-context";
import { OCCASIONS, occasionById } from "@/lib/occasions";
import type { CurrencyCode, EventType, GiftEvent } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateGiftPartyPage() {
  const [created, setCreated] = useState<GiftEvent | null>(null);
  if (created) return <SuccessShare party={created} />;
  return <CreateForm onCreated={setCreated} />;
}

function CreateForm({ onCreated }: { onCreated: (party: GiftEvent) => void }) {
  const { user, signInWithGoogle } = useAuth();

  const [type, setType] = useState<EventType>("birthday");
  const [celebrants, setCelebrants] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:59");
  const [story, setStory] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [goal, setGoal] = useState("");
  const [showTotal, setShowTotal] = useState(false);
  const [campaignMode, setCampaignMode] = useState(false);
  const [maxContribution, setMaxContribution] = useState("");

  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Holds the validated payload while we sign the organizer in, then creates.
  const [pending, setPending] = useState<CreateEventInput | null>(null);

  const chosen = occasionById(type as never);

  function buildInput(): CreateEventInput | string {
    if (!celebrants.trim()) return "Add the name(s) we're celebrating.";
    const day = date || todayISO();
    const startsAt = new Date(`${day}T${startTime || "18:00"}`);
    const endsAt = new Date(`${day}T${endTime || "23:59"}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return "Enter a valid date and time.";
    if (endsAt <= startsAt) return "End time must be after the start time.";
    return {
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
      ticketingEnabled: false,
      rsvpEnabled: false,
      seatingEnabled: false,
      checkInEnabled: false,
      ticketTypes: [],
      tables: [],
      guests: [],
      tickets: [],
      organizerName: "Me",
    };
  }

  async function runCreate(input: CreateEventInput, organizerName: string) {
    setBusy(true);
    setError("");
    try {
      onCreated(await repo.createEvent({ ...input, organizerName }));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not create Gift Party.");
    } finally {
      setBusy(false);
    }
  }

  // Once sign-in completes, create the party the user was already building.
  useEffect(() => {
    if (user && pending) {
      const input = pending;
      setPending(null);
      void runCreate(input, user.displayName ?? "Me");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pending]);

  async function submit() {
    const input = buildInput();
    if (typeof input === "string") { setError(input); return; }
    setError("");
    if (user) {
      void runCreate(input, user.displayName ?? "Me");
      return;
    }
    // Deferred sign-in: fold Google one-tap into this single action.
    setBusy(true);
    try {
      await signInWithGoogle();
      setPending(input); // effect finishes the create once `user` is set
    } catch (authError) {
      setBusy(false);
      setError(friendlyAuthError(authError));
    }
  }

  const quickOccasions = OCCASIONS.slice(0, 8);

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-5 pb-16 sm:px-5 sm:py-7">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link>
        </div>

        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Create in seconds
        </span>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold sm:text-4xl">Who are we celebrating? 🎉</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Add a name, tap create, and share your Gift Party anywhere.</p>

        <div className="mt-6 space-y-5">
          {/* Occasion quick-pick */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {quickOccasions.map((occasion) => {
              const active = occasion.id === type;
              return (
                <button
                  key={occasion.id}
                  type="button"
                  onClick={() => setType(occasion.id as EventType)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${active ? "border-brand bg-brand text-white shadow-soft" : "border-ink/10 bg-white hover:border-brand/40"}`}
                >
                  <span>{occasion.emoji}</span> {occasion.label}
                </button>
              );
            })}
          </div>

          {/* Name — the one required field */}
          <input
            autoFocus
            className={`${inputCls} text-lg font-medium`}
            value={celebrants}
            onChange={(event) => setCelebrants(event.target.value)}
            placeholder="e.g. Tunde & Zainab"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />

          {/* Optional date */}
          <label className="block">
            <span className="text-sm text-muted">When&apos;s the celebration? <span className="text-muted/60">(optional)</span></span>
            <input type="date" className={`${inputCls} mt-1.5`} value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          {error && <p className="text-sm text-pink">{error}</p>}

          <Button onClick={submit} size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {busy ? "Creating…" : "Create & Share"}
          </Button>
          <p className="text-center text-xs text-muted">
            {user ? "Your Gift Party is saved to your account." : "No account needed to start — you'll sign in with Google when you create."}
          </p>

          {/* Progressive disclosure — everything else is optional */}
          <button
            type="button"
            onClick={() => setAdvanced((value) => !value)}
            className="flex w-full items-center justify-center gap-1.5 pt-1 text-sm font-medium text-brand"
          >
            More options <ChevronDown className={`h-4 w-4 transition ${advanced ? "rotate-180" : ""}`} />
          </button>

          {advanced && (
            <div className="space-y-4 rounded-3xl border border-ink/5 bg-white/60 p-4">
              <Field label="Gift Party title"><input className={inputCls} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${chosen.label} Gift Party for ${celebrants || "…"}`} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start time"><input type="time" className={inputCls} value={startTime} onChange={(event) => setStartTime(event.target.value)} /></Field>
                <Field label="End time"><input type="time" className={inputCls} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></Field>
              </div>
              <Field label="Currency"><select className={inputCls} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.symbol} {item.code}</option>)}</select></Field>
              <Field label="Gift goal"><input className={inputCls} inputMode="numeric" value={goal} onChange={(event) => setGoal(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 500000" /></Field>
              <Field label="Welcome message"><textarea rows={3} className={inputCls} value={story} onChange={(event) => setStory(event.target.value)} placeholder="A warm note for everyone celebrating with you…" /></Field>
              <Toggle checked={showTotal} onClick={() => setShowTotal((value) => !value)} label="Show total in organizer Party Mode" icon="👁️" />
              <Toggle checked={campaignMode} onClick={() => setCampaignMode((value) => !value)} label="Campaign contribution mode" icon="🏛️" />
              {campaignMode && (
                <div className="space-y-3 rounded-2xl border border-brand/15 bg-brand-soft/30 p-4">
                  <Field label="Maximum contribution per donor (optional)"><input className={inputCls} inputMode="numeric" value={maxContribution} onChange={(event) => setMaxContribution(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 100000" /></Field>
                  <p className="text-xs leading-5 text-muted">Campaign mode requires a donor name, disables anonymous gifts and applies the contribution cap. The organizer remains responsible for applicable donor-disclosure and campaign-finance rules.</p>
                </div>
              )}
            </div>
          )}
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
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-6 pb-12 sm:px-5">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted">Dashboard</Link></div>
        <div className="mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white shadow-lift"><CheckCircle2 className="h-8 w-8" /></div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Your Gift Party is live! 🎉</h1>
          <p className="mt-1 text-muted">Share it anywhere — everyone can celebrate with a gift in seconds.</p>
        </div>
        <div className="mt-7 rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft">
          <ShareHub url={url} title={party.title} defaultMessage={message} qrLabel="Scan to send a GiftCash" calendar={{ title: party.title, details: `Celebrate ${party.celebrants} with a cash gift: ${url}`, start: party.date }} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ButtonLink href={`/party/${party.slug}`} variant="outline" className="w-full">View Gift Party</ButtonLink>
          <ButtonLink href={`/party/${party.slug}/live`} variant="gold" className="w-full">Open Party Mode</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm text-muted">{label}</span>{children}</label>;
}
function Toggle({ checked, onClick, label, icon }: { checked: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm">
      <span>{icon} {label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} /></span>
    </button>
  );
}
