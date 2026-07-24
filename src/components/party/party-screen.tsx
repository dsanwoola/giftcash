"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Eye, EyeOff, Loader2, Maximize, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { repo } from "@/lib/data/repo";
import { formatMoney, toMinor } from "@/lib/money";
import { celebrate, fireworks } from "@/lib/confetti";
import { SOUND_THEMES, playGiftSound, playWhoosh, unlockAudio, type SoundTheme } from "@/lib/sound";
import { rankContributors, type ContributorRank } from "@/lib/contributions/leaderboard";
import type { Contribution, CurrencyCode, GiftEvent } from "@/lib/types";

const TEST_NAMES = ["Aunty Ngozi", "Chidi", "The Okafors", "Bisi & Tunde", "Uncle Sam", "Kemi", "Emeka", "Fatima", "Grandma Rose", "David O.", "The Adeyemis", "Zainab"];
const TEST_AMOUNTS = [5000, 10000, 20000, 25000, 50000, 100000];
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function PartyScreen({ slug }: { slug: string }) {
  const [event, setEvent] = useState<GiftEvent | null | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const [celebration, setCelebration] = useState<Contribution | null>(null);
  const [queue, setQueue] = useState<Contribution[]>([]);


  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  // Display settings live on the event doc so a phone host console can drive them.
  const themeRef = useRef<SoundTheme>("fanfare");
  useEffect(() => { if (event) themeRef.current = event.soundTheme ?? "fanfare"; }, [event]);


  // Live subscription (Firestore onSnapshot live; cross-tab in demo).
  useEffect(() => repo.subscribeEvent(slug, setEvent), [slug]);

  // Diff incoming contributions → celebration queue (only after the show starts).
  useEffect(() => {
    if (!started || !event) return;
    const contribs = event.contributions ?? [];
    if (!initialized.current) {
      contribs.forEach((c) => seen.current.add(c.id));
      initialized.current = true;
      return;
    }
    const fresh = contribs.filter((c) => !seen.current.has(c.id));
    if (fresh.length) {
      fresh.forEach((c) => seen.current.add(c.id));
      // contributions are newest-first; queue them chronologically
      setQueue((q) => [...q, ...fresh.reverse()]);
    }
  }, [event, started]);

  // Celebration runner.
  useEffect(() => {
    if (!started || celebration || queue.length === 0) return;
    setCelebration(queue[0]);
    setQueue((q) => q.slice(1));
  }, [queue, celebration, started]);

  // Fire effects when a celebration begins.
  useEffect(() => {
    if (!celebration) return;
    playWhoosh();
    const t1 = setTimeout(() => { playGiftSound(themeRef.current); celebrate(2600); }, 450);
    if (celebration.amount >= toMinor(50000)) setTimeout(() => fireworks(2600), 700);
    const done = setTimeout(() => setCelebration(null), 6800);
    return () => { clearTimeout(t1); clearTimeout(done); };
  }, [celebration]);

  const start = async () => {
    await unlockAudio();
    setStarted(true);
    try { await document.documentElement.requestFullscreen?.(); } catch { /* ignore */ }
  };

  const addTestGift = useCallback(() => {
    repo.contributeToEvent(slug, {
      name: rand(TEST_NAMES),
      anonymous: Math.random() < 0.12,
      amount: toMinor(rand(TEST_AMOUNTS)),

      message: Math.random() < 0.4 ? rand(["Congratulations! 🎉", "So happy for you ❤️", "God bless you both 🙏", "Enjoy! 🥳"]) : undefined,
    });
  }, [slug]);

  if (event === undefined) {
    return <div className="grid min-h-dvh place-items-center bg-ink text-cream"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (event === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-6 text-center text-cream">
        <div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Gift Party not found</h1><Link href="/" className="mt-4 inline-block text-gold underline">Go home</Link></div>
      </div>
    );
  }

  const showTotal = event.showTotal;
  const theme = event.soundTheme ?? "fanfare";
  const ranks = rankContributors(event.contributions);
  const total = event.contributions.reduce((s, c) => s + c.amount, 0);
  const url = typeof window !== "undefined" ? `${window.location.origin}/party/${event.slug}` : "";
  const bg = `radial-gradient(80% 60% at 50% 0%, ${event.gradient[0]} 0%, #0c0712 60%), #0c0712`;

  return (
    <div className="relative min-h-dvh overflow-hidden text-cream" style={{ background: bg }}>
      {/* Top stats dashboard */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-xl">🎁</span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cream/50">Gift Cash · Live</p>
            <h1 className="font-display text-xl font-semibold leading-tight md:text-2xl">{event.celebrants}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <Stat label="Gifts" value={String(event.contributions.length)} />
          <div className="h-10 w-px bg-white/10" />
          <button onClick={() => repo.updateEventSettings(slug, { showTotal: !showTotal })} className="group flex items-center gap-2 text-left" title="Show/hide total">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-cream/50">Total raised</p>
              <p className="font-display text-2xl font-semibold gold-foil md:text-3xl">
                {showTotal ? formatMoney(total, event.currency) : "•••••"}
              </p>
            </div>
            {showTotal ? <Eye className="h-4 w-4 text-cream/40" /> : <EyeOff className="h-4 w-4 text-cream/40" />}
          </button>
        </div>
      </header>

      {/* Goal thermometer */}
      {event.goalAmount ? (
        <div className="relative z-20 px-6 md:px-10">
          <GoalBar raised={total} goal={event.goalAmount} currency={event.currency} showAmount={showTotal} />
        </div>
      ) : null}

      {/* Stage */}
      <main className="relative z-10 grid min-h-[calc(100dvh-200px)] place-items-center px-6">
        {celebration ? (
          <GiftExplosion gift={celebration} currency={event.currency} showAmount={showTotal} settlementBank={event.settlementAccount?.bankName} />
        ) : (
          <Leaderboard ranks={ranks} currency={event.currency} showAmount={showTotal} />
        )}
      </main>

      {/* Footer: QR to gift */}
      <footer className="relative z-20 flex items-center justify-center gap-4 px-6 pb-6">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 backdrop-blur">
          <div className="rounded-lg bg-white p-1.5"><QRCodeSVG value={url} size={56} fgColor="#0c0712" /></div>
          <div className="text-left">
            <p className="text-sm font-medium">Scan to send a gift</p>
            <p className="text-xs text-cream/50">Open it on your phone — it takes seconds</p>
          </div>
        </div>
      </footer>

      {/* Controls (organizer) */}
      {started && (
        <>
          <div className="absolute bottom-5 left-5 z-30 flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur">
            <span className="px-2 text-xs text-cream/50">Sound</span>
            {SOUND_THEMES.map((s) => (
              <button
                key={s.id}
                onClick={() => { repo.updateEventSettings(slug, { soundTheme: s.id }); playGiftSound(s.id); }}
                title={s.label}
                className={`rounded-full px-2.5 py-1 text-sm transition ${theme === s.id ? "bg-gold text-ink" : "hover:bg-white/10"}`}
              >
                {s.emoji}
              </button>
            ))}
          </div>
          <div className="absolute bottom-5 right-5 z-30 flex gap-2">
            <button onClick={addTestGift} className="rounded-full bg-white/10 px-4 py-2 text-xs backdrop-blur hover:bg-white/20">＋ Simulate gift</button>
            <button onClick={() => document.documentElement.requestFullscreen?.()} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><Maximize className="h-4 w-4" /></button>
          </div>
        </>
      )}

      {/* Start overlay */}
      <AnimatePresence>
        {!started && (
          <motion.div
            className="absolute inset-0 z-40 grid place-items-center bg-ink/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <Sparkles className="mx-auto h-10 w-10 text-gold" />
              <h2 className="mt-4 font-display text-3xl font-semibold">Party Mode</h2>
              <p className="mt-2 max-w-sm text-cream/60">Put this on the big screen. Every gift explodes live with name, amount, fanfare &amp; confetti.</p>
              <button onClick={start} className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-lg font-semibold text-ink shadow-lift transition hover:-translate-y-0.5">
                <Play className="h-5 w-5" /> Start the show
              </button>
              <p className="mt-3 text-xs text-cream/40">Enables sound &amp; fullscreen</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-cream/50">{label}</p>
      <p className="font-display text-2xl font-semibold md:text-3xl">{value}</p>
    </div>
  );
}

/* ---------------- Gift explosion ---------------- */
function GiftExplosion({ gift, currency, showAmount, settlementBank }: { gift: Contribution; currency: CurrencyCode; showAmount: boolean; settlementBank?: string }) {
  return (
    <motion.div
      key={gift.id}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 16 }}
      className="flex flex-col items-center text-center"
    >
      {/* Envelope */}
      <motion.div
        initial={{ rotateX: 0, y: 0 }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid h-32 w-44 place-items-center rounded-2xl bg-gradient-to-br from-gold to-[#b8860b] text-6xl shadow-lift md:h-40 md:w-56"
      >
        <span className="drop-shadow">✉️</span>
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/30" />
      </motion.div>

      <motion.p
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
        className="mt-8 text-sm uppercase tracking-[0.3em] text-cream/60"
      >
        New GiftCash
      </motion.p>
      <motion.h2
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
        className="mt-2 font-display text-5xl font-semibold md:text-7xl"
      >
        {gift.anonymous ? "A secret admirer" : gift.name}
      </motion.h2>
      {showAmount && (
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 200, damping: 12 }}
          className="mt-4 gold-foil font-display text-6xl font-bold md:text-8xl"
        >
          {formatMoney(gift.amount, currency)}
        </motion.p>
      )}
      {gift.message && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 max-w-xl text-xl text-cream/70">
          “{gift.message}”
        </motion.p>
      )}
      {gift.paymentReference && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-5 rounded-2xl border border-emerald/30 bg-emerald/15 px-5 py-3 text-sm text-cream/80 backdrop-blur">
          <p className="font-semibold text-emerald">Payment alert received</p>
          <p className="mt-1">
            Ref: {gift.paymentReference}{settlementBank && gift.settlementAccountLast4 ? ` · routed to ${settlementBank} ••••${gift.settlementAccountLast4}` : ""}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ---------------- Leaderboard (idle) ---------------- */
function Leaderboard({ ranks, currency, showAmount }: { ranks: ContributorRank[]; currency: CurrencyCode; showAmount: boolean }) {
  if (ranks.length === 0) {
    return (
      <div className="text-center">
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-7xl">🎁</motion.div>
        <h2 className="mt-6 font-display text-4xl font-semibold">Be the first to gift!</h2>
        <p className="mt-2 text-cream/60">Scan the QR code to send a Gift Cash.</p>
      </div>
    );
  }
  const medals = ["🥇", "🥈", "🥉"];
  const scroll = ranks.length > 7;
  const list = (
    <ul className="space-y-3">
      {ranks.map((r, i) => (
        <li key={r.key} className="flex items-center gap-4 rounded-2xl bg-white/5 px-5 py-3 backdrop-blur">
          <span className="w-10 text-center text-2xl font-semibold">{medals[i] ?? i + 1}</span>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-semibold">
            {r.anonymous ? "🎁" : r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <span className="flex-1 truncate text-xl font-medium">{r.anonymous ? "Anonymous" : r.name}</span>
          {showAmount ? (
            <span className="gold-foil font-display text-xl font-semibold">{formatMoney(r.amount, currency)}</span>
          ) : (
            <span className="text-sm text-cream/50">{r.count} gift{r.count > 1 ? "s" : ""}</span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-center gap-2 text-cream/60">
        <span className="text-2xl">🏆</span>
        <h2 className="font-display text-2xl font-semibold">Gifters Leaderboard</h2>
      </div>
      {scroll ? (
        <div className="relative h-[52dvh] overflow-hidden [mask-image:linear-gradient(transparent,black_12%,black_88%,transparent)]">
          <motion.div
            animate={{ y: ["0%", "-50%"] }}
            transition={{ duration: Math.max(12, ranks.length * 2.5), repeat: Infinity, ease: "linear" }}
          >
            {list}
            <div className="h-3" />
            {list}
          </motion.div>
        </div>
      ) : (
        list
      )}
    </div>
  );
}

/* ---------------- Goal thermometer ---------------- */
function GoalBar({ raised, goal, currency, showAmount }: { raised: number; goal: number; currency: CurrencyCode; showAmount: boolean }) {
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  const hit = pct >= 100;
  return (
    <div className="rounded-2xl bg-white/5 px-5 py-3 backdrop-blur">
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 text-cream/70">
          🎯 Goal{showAmount ? ` · ${formatMoney(goal, currency)}` : ""}
        </span>
        <span className="gold-foil font-display text-lg font-semibold">
          {hit ? "Goal reached! 🎉 " : ""}{pct}%{showAmount ? ` · ${formatMoney(raised, currency)}` : ""}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald via-gold to-pink"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
