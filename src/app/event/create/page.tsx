"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock, Ticket, Armchair, ClipboardCheck, QrCode } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ShareHub } from "@/components/share/share-hub";
import { CURRENCIES, toMinor } from "@/lib/money";
import { REVENUE_PLANS, type RevenuePlanId } from "@/lib/monetization";
import { repo } from "@/lib/data/repo";
import type { CreateEventInput } from "@/lib/data/repo-types";
import { useAuth } from "@/lib/auth/auth-context";
import { OCCASIONS, occasionById } from "@/lib/occasions";
import type { CurrencyCode, EventTable, EventTicketType, EventType, GiftEvent } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

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
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:59");
  const [story, setStory] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [goal, setGoal] = useState("");
  const [showTotal, setShowTotal] = useState(false);
  const [campaignMode, setCampaignMode] = useState(false);
  const [maxContribution, setMaxContribution] = useState("");
  const [ticketingEnabled, setTicketingEnabled] = useState(true);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [seatingEnabled, setSeatingEnabled] = useState(true);
  const [checkInEnabled, setCheckInEnabled] = useState(true);
  const [regularTicketPrice, setRegularTicketPrice] = useState("");
  const [regularTicketQty, setRegularTicketQty] = useState("100");
  const [vipTicketPrice, setVipTicketPrice] = useState("");
  const [vipTicketQty, setVipTicketQty] = useState("20");
  const [tableCapacity, setTableCapacity] = useState("10");
  const [tableCount, setTableCount] = useState("10");
  const [tablePrice, setTablePrice] = useState("");
  const [revenuePlan, setRevenuePlan] = useState<RevenuePlanId>("starter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!celebrants.trim()) return setError("Add the celebrant name(s).");
    if (!date) return setError("Pick the event date.");
    if (!startTime || !endTime) return setError("Add the event start and end time.");
    const startsAt = new Date(`${date}T${startTime}`);
    const endsAt = new Date(`${date}T${endTime}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return setError("Enter a valid event date and time.");
    if (endsAt <= startsAt) return setError("Event end time must be after the start time.");
    setError(""); setBusy(true);
    const chosen = occasionById(type as never);
    const ticketTypes: EventTicketType[] = [];
    if (ticketingEnabled) {
      ticketTypes.push({
        id: "regular",
        name: "Regular",
        description: "General admission event pass",
        price: regularTicketPrice ? toMinor(Number(regularTicketPrice)) : 0,
        currency,
        quantity: Math.max(0, Number(regularTicketQty) || 0),
        sold: 0,
        benefits: ["Digital QR pass", "Event access"],
        active: true,
      });
      if (vipTicketPrice || Number(vipTicketQty) > 0) {
        ticketTypes.push({
          id: "vip",
          name: "VIP",
          description: "Premium access for special guests",
          price: vipTicketPrice ? toMinor(Number(vipTicketPrice)) : 0,
          currency,
          quantity: Math.max(0, Number(vipTicketQty) || 0),
          sold: 0,
          benefits: ["VIP digital pass", "Priority check-in", "Premium seating"],
          active: true,
        });
      }
    }
    const tables: EventTable[] = seatingEnabled
      ? Array.from({ length: Math.max(0, Number(tableCount) || 0) }, (_, index) => ({
          id: `table-${index + 1}`,
          name: `Table ${index + 1}`,
          section: index < 2 ? "VIP" : "Regular",
          capacity: Math.max(1, Number(tableCapacity) || 10),
          price: tablePrice ? toMinor(Number(tablePrice)) : undefined,
          currency,
          paymentStatus: "pending",
          assignedGuestIds: [],
        }))
      : [];
    const input: CreateEventInput = {
      type,
      title: title.trim() || `${chosen.label} of ${celebrants.trim()}`,
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
      revenuePlan,
      isPublic: true,
      ticketingEnabled,
      rsvpEnabled,
      seatingEnabled,
      checkInEnabled,
      ticketTypes,
      tables,
      guests: [],
      tickets: [],
      organizerName,
    };
    try {
      const event = await repo.createEvent(input);
      onCreated(event);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Could not create event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-4 py-4 pb-10 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>
        <h1 className="mt-8 text-balance font-display text-2xl font-semibold sm:text-3xl">Create a Party Mode event page 🎉</h1>
        <p className="mt-1 text-sm text-muted">Perfect for weddings, birthdays, graduations and any occasion where guests can send cash gifts live.</p>

        <div className="mt-6 space-y-4">
          <Field label="Event type">
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
            >
              {OCCASIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Celebrant name(s) *"><input className={inputCls} value={celebrants} onChange={(e) => setCelebrants(e.target.value)} placeholder="e.g. Tunde & Zainab" /></Field>
          <Field label="Page title (optional)"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The wedding of Tunde & Zainab" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Event date *"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Start time *"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
            <Field label="End time *"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Currency">
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Fundraising goal (optional)"><input className={inputCls} inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 500000 — shows a goal thermometer on the big screen" /></Field>
          <Field label="Story / welcome note (optional)"><textarea rows={3} className={inputCls} value={story} onChange={(e) => setStory(e.target.value)} placeholder="A warm note for your guests…" /></Field>

          <div className="space-y-4 rounded-3xl border border-brand/15 bg-white/75 p-4 shadow-soft">
            <div>
              <p className="font-display text-lg font-semibold">Occasion modules</p>
              <p className="text-sm text-muted">Turn this event into a full invite, ticketing, RSVP, table and check-in page.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleCard icon={Ticket} title="Ticket sales" enabled={ticketingEnabled} onClick={() => setTicketingEnabled((v) => !v)} />
              <ToggleCard icon={ClipboardCheck} title="RSVP" enabled={rsvpEnabled} onClick={() => setRsvpEnabled((v) => !v)} />
              <ToggleCard icon={Armchair} title="Tables & seating" enabled={seatingEnabled} onClick={() => setSeatingEnabled((v) => !v)} />
              <ToggleCard icon={QrCode} title="QR check-in" enabled={checkInEnabled} onClick={() => setCheckInEnabled((v) => !v)} />
            </div>
            {ticketingEnabled && (
              <div className="grid gap-3 rounded-2xl bg-brand-soft/30 p-3 sm:grid-cols-2">
                <Field label="Regular ticket price"><input className={inputCls} inputMode="numeric" value={regularTicketPrice} onChange={(e) => setRegularTicketPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0 for free RSVP" /></Field>
                <Field label="Regular ticket quantity"><input className={inputCls} inputMode="numeric" value={regularTicketQty} onChange={(e) => setRegularTicketQty(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
                <Field label="VIP ticket price"><input className={inputCls} inputMode="numeric" value={vipTicketPrice} onChange={(e) => setVipTicketPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="optional" /></Field>
                <Field label="VIP ticket quantity"><input className={inputCls} inputMode="numeric" value={vipTicketQty} onChange={(e) => setVipTicketQty(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
              </div>
            )}
            {seatingEnabled && (
              <div className="grid gap-3 rounded-2xl bg-gold-soft/40 p-3 sm:grid-cols-3">
                <Field label="Tables"><input className={inputCls} inputMode="numeric" value={tableCount} onChange={(e) => setTableCount(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
                <Field label="Seats per table"><input className={inputCls} inputMode="numeric" value={tableCapacity} onChange={(e) => setTableCapacity(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
                <Field label="Table price"><input className={inputCls} inputMode="numeric" value={tablePrice} onChange={(e) => setTablePrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="optional" /></Field>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-ink/5 bg-white/75 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">Monetization plan</p>
                <p className="text-sm text-muted">Choose how Occasion earns from this event. Starter is free to launch.</p>
              </div>
              <Link href="/pricing" className="text-sm font-medium text-brand">See pricing</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {REVENUE_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setRevenuePlan(plan.id)}
                  className={`rounded-2xl border p-3 text-left text-sm transition ${revenuePlan === plan.id ? "border-brand/40 bg-brand-soft/50" : "border-ink/10 bg-white"}`}
                >
                  <span className="font-semibold">{plan.name}</span>
                  <span className="mt-1 block text-xs text-muted">Tickets {plan.ticketFeeBps / 100}% · Gifts {plan.giftCashFeeBps / 100}%</span>
                </button>
              ))}
            </div>
          </div>

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

function ToggleCard({ icon: Icon, title, enabled, onClick }: { icon: React.ElementType; title: string; enabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${enabled ? "border-brand/30 bg-brand-soft/40" : "border-ink/10 bg-white"}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${enabled ? "bg-brand text-white" : "bg-ink/5 text-muted"}`}><Icon className="h-4 w-4" /></span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 ${enabled ? "bg-brand" : "bg-ink/15"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-4" : ""}`} /></span>
    </button>
  );
}
