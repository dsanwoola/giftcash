"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Gift, HelpCircle, Loader2, Lock, MonitorPlay } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupGuide } from "@/components/party/setup-guide";
import { repo } from "@/lib/data/repo";
import { useAuth } from "@/lib/auth/auth-context";
import { formatMoney, toMinor } from "@/lib/money";
import { contributionsToCsv, downloadCsv } from "@/lib/csv";
import { SOUND_THEMES, playGiftSound, unlockAudio } from "@/lib/sound";
import type { GiftEvent } from "@/lib/types";

const TEST_NAMES = ["Aunty Ngozi", "Chidi", "The Okafors", "Bisi & Tunde", "Uncle Sam", "Kemi", "Emeka", "Fatima"];
const TEST_AMOUNTS = [5000, 10000, 20000, 25000, 50000];
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function HostConsole({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<GiftEvent | null | undefined>(undefined);
  const [goalInput, setGoalInput] = useState("");
  const [goalEditing, setGoalEditing] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => repo.subscribeEvent(slug, setEvent), [slug]);

  if (event === undefined || authLoading) return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  if (event === null) {
    return <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center"><div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Event not found</h1><Link href="/" className="mt-4 inline-block text-brand underline">Go home</Link></div></div>;
  }

  // Organizer-only: the console can change live settings, so it must be the host.
  if (!user) {
    return (
      <AuthShell
        title="Host sign-in required"
        subtitle="The host console controls your live event — please sign in as the organizer."
        footer={<>Not the host? <Link href={`/event/${slug}`} className="font-medium text-brand">View the event page</Link></>}
      >
        <div className="space-y-3 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand"><Lock className="h-6 w-6" /></span>
          <ButtonLink href={`/login?next=/event/${slug}/host`} size="lg" className="w-full">Sign in to continue</ButtonLink>
        </div>
      </AuthShell>
    );
  }
  if (user.uid !== event.organizerId) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pink/10 text-pink"><Lock className="h-6 w-6" /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold">You&apos;re not the host</h1>
          <p className="mt-1 text-muted">Only {event.organizerName} can control this event.</p>
          <ButtonLink href={`/event/${slug}`} variant="outline" className="mt-5">View the event page</ButtonLink>
        </div>
      </div>
    );
  }

  const total = event.contributions.reduce((s, c) => s + c.amount, 0);
  const theme = event.soundTheme ?? "fanfare";
  const liveUrl = typeof window !== "undefined" ? `${window.location.origin}/event/${slug}/live` : "";

  const set = (s: Parameters<typeof repo.updateEventSettings>[1]) => repo.updateEventSettings(slug, s);

  const pickTheme = async (id: typeof SOUND_THEMES[number]["id"]) => {
    await unlockAudio();
    set({ soundTheme: id });
    playGiftSound(id);
  };

  const saveGoal = () => {
    set({ goalAmount: goalInput ? toMinor(Number(goalInput)) : 0 });
    setGoalEditing(false);
  };

  const simulate = () => repo.contributeToEvent(slug, {
    name: rand(TEST_NAMES), anonymous: false, amount: toMinor(rand(TEST_AMOUNTS)),
    table: String(1 + Math.floor(Math.random() * 12)),
  });

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="flex items-center justify-between"><Logo /><Link href={`/event/${slug}`} className="text-sm text-muted hover:text-ink">Event page</Link></div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-brand">Host console</p>
          <h1 className="font-display text-2xl font-semibold">{event.celebrants}</h1>
          <p className="text-sm text-muted">Control the big screen from your phone — changes apply live.</p>
        </div>

        {/* Live stats */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-ink/5 bg-white/70 p-4"><p className="text-xs text-muted">Gifts</p><p className="font-display text-2xl font-semibold">{event.contributions.length}</p></div>
          <div className="rounded-2xl border border-ink/5 bg-white/70 p-4"><p className="text-xs text-muted">Total raised</p><p className="font-display text-2xl font-semibold">{formatMoney(total, event.currency)}</p></div>
        </div>

        {/* Controls */}
        <div className="mt-5 space-y-3">
          <button onClick={() => set({ showTotal: !event.showTotal })} className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm">
            <span>👁️ Show total on screen</span>
            <span className={`relative h-6 w-11 rounded-full transition ${event.showTotal ? "bg-brand" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${event.showTotal ? "left-[22px]" : "left-0.5"}`} /></span>
          </button>

          <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-sm">🔊 Gift sound</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOUND_THEMES.map((s) => (
                <button key={s.id} onClick={() => pickTheme(s.id)} className={`rounded-full px-3 py-1.5 text-sm transition ${theme === s.id ? "bg-brand text-white" : "border border-ink/10 bg-white hover:border-brand/40"}`}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span>🎯 Goal</span>
              <span className="font-medium">{event.goalAmount ? formatMoney(event.goalAmount, event.currency) : "Not set"}</span>
            </div>
            {goalEditing ? (
              <div className="mt-2 flex gap-2">
                <input className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand" inputMode="numeric" value={goalInput} onChange={(e) => setGoalInput(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 500000" />
                <Button size="sm" onClick={saveGoal}>Save</Button>
              </div>
            ) : (
              <button onClick={() => { setGoalInput(event.goalAmount ? String(event.goalAmount / 100) : ""); setGoalEditing(true); }} className="mt-1 text-xs font-medium text-brand">Edit goal</button>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={simulate}><Gift className="h-4 w-4" /> Send a test gift</Button>

          <button
            onClick={() => downloadCsv(`${slug}-donors.csv`, contributionsToCsv(event.contributions, event.currency))}
            disabled={event.contributions.length === 0}
            className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm hover:border-brand/40 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Export donor list (CSV)</span>
            <span className="text-xs text-muted">{event.contributions.length} record{event.contributions.length === 1 ? "" : "s"}</span>
          </button>
          {event.campaignMode && (
            <p className="rounded-xl bg-gold-soft px-3 py-2 text-xs text-ink/70">🏛️ Campaign mode is on — donor names are captured and caps are enforced server-side. Use the CSV for finance reporting.</p>
          )}
        </div>

        {/* Screen links */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <ButtonLink href={`/event/${slug}/live`} variant="dark" className="w-full"><MonitorPlay className="h-4 w-4" /> Open big screen</ButtonLink>
          <button onClick={() => setSetupOpen(true)} className="rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-sm hover:border-brand/40"><HelpCircle className="mr-1 inline h-4 w-4" /> Setup help</button>
        </div>
      </div>

      <SetupGuide open={setupOpen} onClose={() => setSetupOpen(false)} liveUrl={liveUrl} />
    </div>
  );
}
