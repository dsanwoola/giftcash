"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { OCCASIONS, THEMES, occasionById, themeById } from "@/lib/occasions";
import { CURRENCIES, formatMoney, serviceFee, toMinor } from "@/lib/money";
import { TONES, suggestMessage, type MessageTone } from "@/lib/ai-messages";
import { repo } from "@/lib/data/repo";
import type {
  CurrencyCode,
  DeliveryMethod,
  Gift,
  OccasionId,
  RevealGate,
  ThemeId,
} from "@/lib/types";

interface Form {
  occasion: OccasionId;
  theme: ThemeId;
  recipientName: string;
  recipientNickname: string;
  recipientPhone: string;
  recipientEmail: string;
  delivery: DeliveryMethod;
  amount: string; // major units, as typed
  currency: CurrencyCode;
  premiumAnimation: boolean;
  printedCard: boolean;
  videoMessage: boolean;
  message: string;
  schedule: boolean;
  scheduledAt: string;
  revealGate: RevealGate;
  revealQuestion: string;
  revealAnswer: string;
  mystery: boolean;
  privateGift: boolean;
  anonymous: boolean;
  senderName: string;
}

const STEPS = [
  "Occasion",
  "Experience",
  "Recipient",
  "Amount",
  "Message",
  "Delivery",
  "Payment",
  "Done",
];

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export function CreateGiftWizard() {
  const [step, setStep] = useState(0);
  const [paying, setPaying] = useState(false);
  const [created, setCreated] = useState<Gift | null>(null);
  const [form, setForm] = useState<Form>({
    occasion: "birthday",
    theme: "birthday_cake",
    recipientName: "",
    recipientNickname: "",
    recipientPhone: "",
    recipientEmail: "",
    delivery: "whatsapp",
    amount: "25000",
    currency: "NGN",
    premiumAnimation: true,
    printedCard: false,
    videoMessage: false,
    message: "",
    schedule: false,
    scheduledAt: "",
    revealGate: "tap",
    revealQuestion: "",
    revealAnswer: "",
    mystery: true,
    privateGift: false,
    anonymous: false,
    senderName: "Demo Sender",
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const amountMinor = toMinor(Number(form.amount) || 0);
  const fee = serviceFee(amountMinor);
  const occasion = occasionById(form.occasion);

  const canNext = useMemo(() => {
    switch (step) {
      case 2:
        return form.recipientName.trim().length > 1;
      case 3:
        return amountMinor >= toMinor(100);
      case 4:
        return form.message.trim().length > 0;
      default:
        return true;
    }
  }, [step, form.recipientName, form.message, amountMinor]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const pay = async () => {
    setPaying(true);
    // Simulated payment success (provider abstraction lives in lib/types).
    await new Promise((r) => setTimeout(r, 1100));
    const gift = await repo.createGift({
      occasion: form.occasion,
      theme: form.theme,
      recipientName: form.recipientName.trim(),
      recipientNickname: form.recipientNickname.trim() || undefined,
      recipientPhone: form.recipientPhone.trim() || undefined,
      recipientEmail: form.recipientEmail.trim() || undefined,
      amount: amountMinor,
      currency: form.currency,
      message: form.message.trim(),
      delivery: form.delivery,
      scheduledAt: form.schedule && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      revealGate: form.revealGate,
      revealQuestion: form.revealQuestion.trim() || undefined,
      revealAnswer: form.revealAnswer.trim() || undefined,
      mystery: form.mystery,
      privateGift: form.privateGift,
      anonymous: form.anonymous,
      addOns: {
        premiumAnimation: form.premiumAnimation,
        printedCard: form.printedCard,
        scheduledSurprise: form.schedule,
        videoMessage: form.videoMessage,
      },
      senderName: form.senderName,
    });
    setPaying(false);
    setCreated(gift);
    setStep(STEPS.length - 1);
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-xl px-4 py-4 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link>
        </div>

        {/* Progress */}
        {!created && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{STEPS[step]}</span>
              <span>Step {step + 1} of {STEPS.length - 1}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <motion.div
                className="h-full rounded-full bg-brand"
                animate={{ width: `${(step / (STEPS.length - 2)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {/* STEP 0 — Occasion */}
              {step === 0 && (
                <Section title="What are we celebrating?" subtitle="Pick the occasion.">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {OCCASIONS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { set("occasion", o.id); set("theme", o.defaultTheme); }}
                        className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${form.occasion === o.id ? "border-brand bg-brand-soft" : "border-ink/10 bg-white hover:border-brand/40"}`}
                      >
                        <span className="text-2xl">{o.emoji}</span>
                        <span className="text-sm font-medium">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* STEP 1 — Experience / Theme */}
              {step === 1 && (
                <Section title="Choose the gift experience" subtitle="How the reveal will look and feel.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {THEMES.filter((t) => occasion.suggestedThemes.includes(t.id))
                      .concat(THEMES.filter((t) => !occasion.suggestedThemes.includes(t.id)))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => set("theme", t.id)}
                          className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${form.theme === t.id ? "border-brand bg-brand-soft" : "border-ink/10 bg-white hover:border-brand/40"}`}
                        >
                          {t.premium && (
                            <span className="absolute right-2 top-2 rounded-full bg-gold-soft px-2 py-0.5 text-[9px] font-semibold text-ink/70">PREMIUM</span>
                          )}
                          <span className="text-2xl">{t.emoji}</span>
                          <span className="text-sm font-medium">{t.label}</span>
                          <span className="text-xs text-muted">{t.blurb}</span>
                        </button>
                      ))}
                  </div>
                </Section>
              )}

              {/* STEP 2 — Recipient */}
              {step === 2 && (
                <Section title="Who is it for?" subtitle="We'll personalise the reveal with their name.">
                  <Field label="Recipient name *">
                    <input className={inputCls} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} placeholder="e.g. Tolu" />
                  </Field>
                  <Field label="Nickname (optional)">
                    <input className={inputCls} value={form.recipientNickname} onChange={(e) => set("recipientNickname", e.target.value)} placeholder="e.g. Tee" />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Phone">
                      <input className={inputCls} value={form.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} placeholder="0803…" />
                    </Field>
                    <Field label="Email">
                      <input className={inputCls} value={form.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} placeholder="name@email.com" />
                    </Field>
                  </div>
                  <Field label="Delivery method">
                    <div className="flex flex-wrap gap-2">
                      {(["whatsapp", "sms", "email", "qr", "link"] as DeliveryMethod[]).map((d) => (
                        <Chip key={d} active={form.delivery === d} onClick={() => set("delivery", d)}>{d}</Chip>
                      ))}
                    </div>
                  </Field>
                </Section>
              )}

              {/* STEP 3 — Amount */}
              {step === 3 && (
                <Section title="How much?" subtitle="The message comes first — but let's set the amount.">
                  <div className="grid gap-2 sm:flex">
                    <select className={`${inputCls} sm:w-28`} value={form.currency} onChange={(e) => set("currency", e.target.value as CurrencyCode)}>
                      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                    </select>
                    <input className={`${inputCls} text-2xl font-semibold`} inputMode="numeric" value={form.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((a) => (
                      <Chip key={a} active={form.amount === String(a)} onClick={() => set("amount", String(a))}>
                        {formatMoney(toMinor(a), form.currency)}
                      </Chip>
                    ))}
                  </div>
                  <div className="space-y-2 rounded-2xl bg-white p-4 text-sm">
                    <Row label="Gift amount" value={formatMoney(amountMinor, form.currency)} />
                    <Row label="Service fee" value={formatMoney(fee, form.currency)} />
                    <div className="my-1 h-px bg-ink/10" />
                    <Row label="Total to pay" value={formatMoney(amountMinor + fee, form.currency)} bold />
                  </div>
                  <Field label="Add-ons">
                    <div className="space-y-2">
                      <Toggle label="✨ Premium animation" checked={form.premiumAnimation} onChange={(v) => set("premiumAnimation", v)} />
                      <Toggle label="📨 Printed QR gift card" checked={form.printedCard} onChange={(v) => set("printedCard", v)} />
                      <Toggle label="🎥 Video message" checked={form.videoMessage} onChange={(v) => set("videoMessage", v)} />
                    </div>
                  </Field>
                </Section>
              )}

              {/* STEP 4 — Message */}
              {step === 4 && (
                <MessageStep form={form} set={set} />
              )}

              {/* STEP 5 — Delivery settings */}
              {step === 5 && (
                <Section title="Delivery & reveal settings" subtitle="Control the surprise.">
                  <Toggle label="⏰ Schedule the surprise" checked={form.schedule} onChange={(v) => set("schedule", v)} />
                  {form.schedule && (
                    <input type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
                  )}
                  <Field label="How they unlock it">
                    <div className="flex flex-wrap gap-2">
                      {(["tap", "hold", "swipe", "question"] as RevealGate[]).map((g) => (
                        <Chip key={g} active={form.revealGate === g} onClick={() => set("revealGate", g)}>{g}</Chip>
                      ))}
                    </div>
                  </Field>
                  {form.revealGate === "question" && (
                    <div className="grid grid-cols-1 gap-3">
                      <input className={inputCls} placeholder="Fun question" value={form.revealQuestion} onChange={(e) => set("revealQuestion", e.target.value)} />
                      <input className={inputCls} placeholder="Correct answer" value={form.revealAnswer} onChange={(e) => set("revealAnswer", e.target.value)} />
                    </div>
                  )}
                  <Toggle label="🎁 Mystery gift (hide amount until opened)" checked={form.mystery} onChange={(v) => set("mystery", v)} />
                  <Toggle label="🔒 Make it private" checked={form.privateGift} onChange={(v) => set("privateGift", v)} />
                  <Toggle label="🕶️ Send anonymously" checked={form.anonymous} onChange={(v) => set("anonymous", v)} />
                </Section>
              )}

              {/* STEP 6 — Payment */}
              {step === 6 && (
                <Section title="Review & pay" subtitle="Fund the gift to generate the link.">
                  <div className="space-y-1 rounded-2xl border border-ink/5 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{occasion.emoji}</span>
                      <div>
                        <p className="font-medium">{occasion.label} • {themeById(form.theme).label}</p>
                        <p className="text-sm text-muted">For {form.recipientName || "—"}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <Row label="Gift amount" value={formatMoney(amountMinor, form.currency)} />
                      <Row label="Service fee" value={formatMoney(fee, form.currency)} />
                      <div className="my-1 h-px bg-ink/10" />
                      <Row label="Total" value={formatMoney(amountMinor + fee, form.currency)} bold />
                    </div>
                  </div>
                  <Button onClick={pay} size="lg" variant="primary" className="w-full" disabled={paying}>
                    {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    {paying ? "Processing payment…" : `Pay ${formatMoney(amountMinor + fee, form.currency)}`}
                  </Button>
                  <p className="text-center text-xs text-muted">Demo payment — no real charge. Provider integration is abstracted in code.</p>
                </Section>
              )}

              {/* STEP 7 — Confirmation */}
              {step === 7 && created && (
                <Confirmation gift={created} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        {!created && step < 6 && (
          <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-ink/5 bg-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={next} disabled={!canNext} className="min-w-28">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!created && step === 6 && (
          <div className="mt-6">
            <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Message step (with AI assistant) ---------------- */
function MessageStep({ form, set }: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const [loadingTone, setLoadingTone] = useState<MessageTone | null>(null);
  const generate = async (tone: MessageTone) => {
    setLoadingTone(tone);
    const text = await suggestMessage(tone, { recipientName: form.recipientName, occasion: form.occasion });
    set("message", text);
    setLoadingTone(null);
  };
  return (
    <Section title="Add your heart" subtitle="The message they'll see before the money.">
      <textarea
        rows={5}
        className={inputCls}
        value={form.message}
        onChange={(e) => set("message", e.target.value)}
        placeholder="Write something they'll treasure…"
      />
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand">
          <Sparkles className="h-4 w-4" /> AI message assistant
        </p>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => generate(t.id)}
              disabled={loadingTone !== null}
              className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs hover:border-brand/40 disabled:opacity-50"
            >
              {loadingTone === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{t.emoji}</span>}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Confirmation ---------------- */
function Confirmation({ gift }: { gift: Gift }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/gift/${gift.slug}` : `/gift/${gift.slug}`;
  const waText = encodeURIComponent(`🎁 ${gift.recipientName}, I sent you a Gift Cash! Open it here: ${url}`);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white shadow-lift">
        <Check className="h-8 w-8" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold">Your gift is ready! 🎉</h1>
      <p className="mt-1 text-muted">Share the link below — they&apos;ll open a moment, not a transfer.</p>

      <div className="mx-auto mt-6 w-fit rounded-3xl border border-ink/5 bg-white p-5 shadow-soft">
        <QRCodeSVG value={url} size={160} fgColor="#1b1226" bgColor="#ffffff" />
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-2 pl-4">
        <span className="flex-1 truncate text-left text-sm text-muted">{url}</span>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">
          <Button variant="primary" className="w-full">Share to WhatsApp</Button>
        </a>
        <Link href={`/gift/${gift.slug}`}>
          <Button variant="gold" className="w-full"><Eye className="h-4 w-4" /> Preview</Button>
        </Link>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block text-sm text-brand underline">Go to dashboard</Link>
    </div>
  );
}

/* ---------------- small UI helpers ---------------- */
const inputCls =
  "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-balance font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 py-2 text-sm capitalize transition ${active ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand/40"}`}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand" : "bg-ink/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
