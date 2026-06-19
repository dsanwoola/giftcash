"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gift as GiftIcon,
  Heart,
  Loader2,
  Lock,
  PartyPopper,
  Send,
  Share2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GiftVisual } from "./gift-visual";
import { repo } from "@/lib/data/repo";
import { occasionById, themeById } from "@/lib/occasions";
import { formatMoney } from "@/lib/money";
import { burst, celebrate, fireworks } from "@/lib/confetti";
import type { Gift } from "@/lib/types";

type Stage = "intro" | "message" | "amount" | "claim" | "claimed";

export function RevealExperience({ slug }: { slug: string }) {
  const [gift, setGift] = useState<Gift | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("intro");
  const [opening, setOpening] = useState(false);
  const [answer, setAnswer] = useState("");
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    repo.getGift(slug).then((g) => {
      setGift(g);
      if (g?.claimStatus === "claimed") setStage("claimed");
    });
  }, [slug]);

  const fireTheme = useCallback((theme: string) => {
    if (theme === "fireworks") fireworks();
    else celebrate();
  }, []);

  const open = useCallback(async () => {
    if (!gift) return;
    if (gift.revealGate === "question" && gift.revealAnswer) {
      if (answer.trim().toLowerCase() !== gift.revealAnswer.trim().toLowerCase()) {
        setGateError("That's not quite it — try again!");
        return;
      }
    }
    setOpening(true);
    burst();
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    await repo.markOpened(slug);
    setTimeout(() => {
      setOpening(false);
      setStage("message");
    }, 950);
  }, [gift, answer, slug]);

  // ---- Loading / not found / expired ----
  if (gift === undefined) {
    return (
      <Centered>
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
      </Centered>
    );
  }
  if (gift === null) {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-5xl">🔍</p>
          <h1 className="mt-4 font-display text-2xl font-semibold">Gift not found</h1>
          <p className="mt-2 text-muted">This gift link is invalid or has been removed.</p>
          <Link href="/" className="mt-6 inline-block text-brand underline">Go home</Link>
        </div>
      </Centered>
    );
  }

  const occasion = occasionById(gift.occasion);
  const theme = themeById(gift.theme);
  const senderLabel = gift.anonymous ? "Someone special" : gift.senderName;

  const unlockAt = gift.scheduledAt ? new Date(gift.scheduledAt) : null;
  if (unlockAt && unlockAt.getTime() > Date.now()) {
    return <LockedScreen occasion={occasion} recipient={gift.recipientNickname || gift.recipientName} senderLabel={senderLabel} unlockAt={unlockAt} />;
  }

  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{
        background: `radial-gradient(120% 80% at 50% -10%, ${occasion.gradient[0]}26, transparent 60%), radial-gradient(90% 60% at 50% 110%, ${occasion.gradient[1]}22, transparent 55%)`,
      }}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-5 sm:px-5 sm:py-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <>
            {/* ---------- INTRO ---------- */}
            {stage === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex w-full flex-col items-center text-center"
              >
                <p className="text-sm font-medium text-muted">{occasion.emoji} {occasion.label}</p>
                <h1 className="mt-2 text-balance font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  {gift.recipientNickname || gift.recipientName}, <br />
                  {senderLabel} sent you a special Gift Cash
                </h1>

                <div className="my-10">
                  <GiftVisual occasion={occasion} theme={theme} opening={opening} />
                </div>

                {gift.revealGate === "question" && gift.revealQuestion ? (
                  <div className="w-full">
                    <p className="text-sm text-muted">{gift.revealQuestion}</p>
                    <input
                      value={answer}
                      onChange={(e) => { setAnswer(e.target.value); setGateError(""); }}
                      placeholder="Your answer…"
                      className="mt-3 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-center outline-none focus:border-brand"
                    />
                    {gateError && <p className="mt-2 text-sm text-pink">{gateError}</p>}
                    <Button onClick={open} size="lg" className="mt-4 w-full" disabled={opening}>
                      Unlock my gift
                    </Button>
                  </div>
                ) : (
                  <Button onClick={open} size="lg" variant="primary" disabled={opening} className="w-full max-w-xs">
                    {opening ? <Loader2 className="h-5 w-5 animate-spin" /> : <GiftIcon className="h-5 w-5" />}
                    {gift.revealGate === "hold" ? "Press to open your gift" : gift.revealGate === "swipe" ? "Swipe up to open" : "Tap to open your gift"}
                  </Button>
                )}
                <p className="mt-4 text-xs text-muted">A little something is waiting inside ✨</p>
              </motion.div>
            )}

            {/* ---------- MESSAGE (before money) ---------- */}
            {stage === "message" && (
              <motion.div
                key="message"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="w-full text-center"
              >
                <PartyPopper className="mx-auto h-8 w-8 text-gold" />
                <p className="mt-3 text-sm text-muted">A message from {senderLabel}</p>
                <div className="mt-4 rounded-3xl border border-ink/5 bg-white/80 p-7 shadow-soft">
                  <p className="font-display text-xl leading-relaxed">&ldquo;{gift.message}&rdquo;</p>
                  {gift.media.length > 0 && (
                    <p className="mt-4 text-xs text-muted">🎥 Includes a personal {gift.media[0].type} message</p>
                  )}
                </div>
                <Button onClick={() => { setStage("amount"); setTimeout(() => fireTheme(theme.id), 150); }} size="lg" className="mt-6 w-full">
                  {gift.mystery ? "Reveal my gift" : "Continue"}
                </Button>
              </motion.div>
            )}

            {/* ---------- AMOUNT ---------- */}
            {stage === "amount" && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                className="w-full text-center"
              >
                <p className="text-sm text-muted">{senderLabel} gifted you</p>
                <AmountReveal value={gift.amount} currency={gift.currency} />
                <p className="mt-2 text-sm text-muted">{occasion.emoji} {occasion.label} gift</p>

                <div className="mt-8 space-y-3">
                  <Button onClick={() => setStage("claim")} size="lg" variant="primary" className="w-full">
                    <Wallet className="h-5 w-5" /> Claim to Gift Cash wallet
                  </Button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ThankYouButton slug={slug} sender={senderLabel} existing={gift.thankYou?.message} />
                    <ShareButton recipient={gift.recipientName} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------- CLAIM ---------- */}
            {stage === "claim" && (
              <ClaimForm
                key="claim"
                gift={gift}
                onClaimed={(g) => { setGift(g); setStage("claimed"); }}
              />
            )}

            {/* ---------- CLAIMED ---------- */}
            {stage === "claimed" && (
              <Claimed key="claimed" gift={gift} slug={slug} senderLabel={senderLabel} />
            )}
          </>
        </div>
      </div>
    </div>
  );
}

/* -------------------- sub-components -------------------- */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-cream px-6">{children}</div>;
}

function LockedScreen({
  occasion,
  recipient,
  senderLabel,
  unlockAt,
}: {
  occasion: ReturnType<typeof occasionById>;
  recipient: string;
  senderLabel: string;
  unlockAt: Date;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, unlockAt.getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const units = [
    { v: d, l: "days" },
    { v: h, l: "hrs" },
    { v: m, l: "min" },
    { v: s, l: "sec" },
  ];
  useEffect(() => {
    if (diff === 0) window.location.reload();
  }, [diff]);

  return (
    <div
      className="grid min-h-dvh place-items-center px-6 text-center"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${occasion.gradient[0]}26, transparent 60%)` }}
    >
      <div>
        <Logo />
        <div className="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand text-cream shadow-lift">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">{recipient}, a surprise is on its way</h1>
        <p className="mt-2 text-muted">{senderLabel} scheduled this gift to unlock on<br />{unlockAt.toLocaleString()}</p>
        <div className="mt-7 flex justify-center gap-3">
          {units.map((u) => (
            <div key={u.l} className="w-16 rounded-2xl border border-ink/5 bg-white/80 py-3 shadow-soft">
              <p className="font-display text-2xl font-semibold">{String(u.v).padStart(2, "0")}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">{u.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">Come back when the countdown ends ✨</p>
      </div>
    </div>
  );
}

function AmountReveal({ value, currency }: { value: number; currency: Gift["currency"] }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <motion.p
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className="gold-foil mt-2 break-words font-display text-5xl font-semibold sm:text-6xl"
    >
      {formatMoney(display, currency)}
    </motion.p>
  );
}

function ClaimForm({ gift, onClaimed }: { gift: Gift; onClaimed: (g: Gift) => void }) {
  const [contact, setContact] = useState(gift.recipientPhone || gift.recipientEmail || "");
  const [step, setStep] = useState<"contact" | "otp" | "loading">("contact");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const sendOtp = () => {
    if (!contact.trim()) return setError("Enter your phone number or email.");
    setError("");
    setStep("otp");
  };

  const verify = async () => {
    // OTP is a placeholder — any 4+ digits pass in demo mode.
    if (otp.replace(/\D/g, "").length < 4) return setError("Enter the 4-digit code (any digits in demo).");
    setError("");
    setStep("loading");
    try {
      const claimed = await repo.claimGift(gift.slug, repo.currentUserId());
      burst();
      onClaimed(claimed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not claim gift.");
      setStep("otp");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      <div className="rounded-3xl border border-ink/5 bg-white/85 p-6 shadow-soft">
        <div className="flex items-center gap-2 text-brand">
          <Lock className="h-4 w-4" />
          <p className="text-sm font-medium">Claim your {formatMoney(gift.amount, gift.currency)}</p>
        </div>

        {step === "contact" && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-muted">Phone number or email</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. 0803 000 0000"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand"
            />
            <Button onClick={sendOtp} size="lg" className="w-full">Continue</Button>
          </div>
        )}

        {step === "otp" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted">We sent a verification code to <b>{contact}</b>. Enter it below.</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              placeholder="1234"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-brand"
            />
            <Button onClick={verify} size="lg" className="w-full">Verify &amp; claim</Button>
            <p className="text-center text-xs text-muted">Demo mode — any 4 digits work.</p>
          </div>
        )}

        {step === "loading" && (
          <div className="grid place-items-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
          </div>
        )}

        {error && <p className="mt-3 text-center text-sm text-pink">{error}</p>}
      </div>
    </motion.div>
  );
}

function Claimed({ gift, slug, senderLabel }: { gift: Gift; slug: string; senderLabel: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full text-center"
    >
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white shadow-lift">
        <Wallet className="h-7 w-7" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold">Gift claimed! 🎉</h1>
      <p className="mt-1 text-muted">
        {formatMoney(gift.amount, gift.currency)} has been added to your Gift Cash wallet.
      </p>

      <div className="mt-6 space-y-3">
        <Link href="/dashboard/wallet" className="block">
          <Button size="lg" variant="primary" className="w-full">Go to my wallet</Button>
        </Link>
        <Link href="/dashboard/withdraw" className="block">
          <Button size="lg" variant="outline" className="w-full">Withdraw to bank</Button>
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <ThankYouButton slug={slug} sender={senderLabel} existing={gift.thankYou?.message} />
          <ShareButton recipient={gift.recipientName} />
        </div>
      </div>

      {gift.thankYou?.message && (
        <p className="mt-5 rounded-2xl bg-white/70 p-3 text-sm text-muted">
          Thank-you sent {gift.thankYou.emoji}
        </p>
      )}
    </motion.div>
  );
}

function ThankYouButton({ slug, sender, existing }: { slug: string; sender: string; existing?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(existing ?? "");
  const [emoji, setEmoji] = useState("🥹");
  const [sent, setSent] = useState(Boolean(existing));
  const ref = useRef<HTMLDivElement>(null);

  const send = async () => {
    await repo.saveThankYou(slug, { message: msg, emoji, createdAt: new Date().toISOString() });
    setSent(true);
    setOpen(false);
    burst();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Heart className="h-4 w-4" /> {sent ? "Sent ♥" : "Say thanks"}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
            ref={ref}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="w-full max-w-md rounded-t-3xl bg-cream p-6 sm:rounded-3xl"
            >
              <h3 className="font-display text-xl font-semibold">Say thank you to {sender}</h3>
              <div className="mt-3 flex gap-2">
                {["🥹", "❤️", "🙏", "🎉", "😍"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid h-11 w-11 place-items-center rounded-full text-xl transition ${emoji === e ? "bg-brand-soft ring-2 ring-brand" : "bg-white"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={3}
                placeholder="Write a short thank-you note…"
                className="mt-3 w-full rounded-2xl border border-ink/10 bg-white p-3 outline-none focus:border-brand"
              />
              <Button onClick={send} size="lg" className="mt-3 w-full">
                <Send className="h-4 w-4" /> Send thank you
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ShareButton({ recipient }: { recipient: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${recipient} just received a Gift Cash! 🎁`;
    if (navigator.share) {
      try { await navigator.share({ title: "Gift Cash", text, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Button variant="outline" onClick={share} className="w-full">
      <Share2 className="h-4 w-4" /> {copied ? "Copied!" : "Share"}
    </Button>
  );
}
