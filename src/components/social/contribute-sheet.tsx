"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardCopy, Clock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, formatMoney, serviceFee, toMinor } from "@/lib/money";
import { burst } from "@/lib/confetti";
import type { CurrencyCode } from "@/lib/types";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-brand";
const QUICK = [2000, 5000, 10000, 25000];

export interface ContributionInput {
  name: string;
  anonymous: boolean;
  amount: number; // minor units
  message?: string;
}

export interface BankTransferIntentView {
  reference: string;
  status: "pending" | "confirmed" | "review" | "expired" | "cancelled";
  expectedAmount: number;
  serviceFee: number;
  totalTransferAmount: number;
  currency: CurrencyCode;
  expiresAt: string;
  settlementAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    alertSenderEmail: string;
  };
}

export function ContributeSheet({
  open,
  onClose,
  onContribute,
  onStartBankTransfer,
  pollBankTransfer,
  currency,
  ctaLabel = "Contribute",
  requireName = false,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  onContribute: (c: ContributionInput) => Promise<void>;
  onStartBankTransfer?: (c: ContributionInput) => Promise<BankTransferIntentView>;
  pollBankTransfer?: (reference: string) => Promise<Pick<BankTransferIntentView, "status"> & { reviewReason?: string }>;
  currency: CurrencyCode;
  ctaLabel?: string;
  requireName?: boolean; // campaign mode: donor name mandatory, no anonymous
  maxAmount?: number; // campaign mode: per-contribution cap (minor units)
}) {
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [amount, setAmount] = useState("5000");
  const [message, setMessage] = useState("");
  const [cur, setCur] = useState<CurrencyCode>(currency);
  const [step, setStep] = useState<"form" | "paying" | "awaiting_bank" | "review" | "done">("form");
  const [intent, setIntent] = useState<BankTransferIntentView | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const overlay = useRef<HTMLDivElement>(null);

  const amountMinor = toMinor(Number(amount) || 0);
  const fee = serviceFee(amountMinor);
  const isAnon = requireName ? false : anonymous;

  useEffect(() => {
    if (step !== "awaiting_bank" || !intent || !pollBankTransfer) return;
    const timer = window.setInterval(async () => {
      try {
        const status = await pollBankTransfer(intent.reference);
        if (status.status === "confirmed") {
          setStep("done");
          burst();
          window.clearInterval(timer);
        } else if (status.status === "review") {
          setReviewReason(status.reviewReason || "Your transfer alert needs admin review.");
          setStep("review");
          window.clearInterval(timer);
        }
      } catch {
        // Keep waiting; connectivity may be temporary.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [step, intent, pollBankTransfer]);

  const submit = async () => {
    if (requireName && !name.trim()) return setError("Your name is required for this event.");
    if (!isAnon && !name.trim()) return setError("Add your name (or contribute anonymously).");
    if (amountMinor < toMinor(100)) return setError("Enter a valid amount.");
    if (maxAmount && amountMinor > maxAmount) return setError(`The maximum contribution is ${formatMoney(maxAmount, cur)}.`);
    setError("");
    setStep("paying");
    const input = { name: name.trim(), anonymous: isAnon, amount: amountMinor, message: message.trim() || undefined };
    try {
      if (onStartBankTransfer) {
        const bankIntent = await onStartBankTransfer(input);
        setIntent(bankIntent);
        setStep("awaiting_bank");
        return;
      }
      await new Promise((r) => setTimeout(r, 1000)); // demo-only fallback for group gifts
      await onContribute(input);
      burst();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be started. Please try again.");
      setStep("form");
    }
  };

  const close = () => {
    setStep("form");
    setName("");
    setAmount("5000");
    setMessage("");
    setAnonymous(false);
    setIntent(null);
    setReviewReason("");
    onClose();
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlay}
          className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === overlay.current) close(); }}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 sm:rounded-3xl"
          >
            {step === "done" ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald" />
                <h3 className="mt-3 font-display text-xl font-semibold">Gift confirmed 🎉</h3>
                <p className="mt-1 text-muted">Your {formatMoney(amountMinor, cur)} contribution has been added to the event.</p>
                {intent?.reference && <p className="mt-2 text-xs text-muted">Reference: {intent.reference}</p>}
                <Button onClick={close} size="lg" className="mt-5 w-full">Done</Button>
              </div>
            ) : step === "review" ? (
              <div className="py-6 text-center">
                <ShieldCheck className="mx-auto h-14 w-14 text-gold" />
                <h3 className="mt-3 font-display text-xl font-semibold">Payment sent for review</h3>
                <p className="mt-1 text-sm text-muted">We found a bank alert, but it needs admin confirmation before it appears on the event screen.</p>
                {reviewReason && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-muted">{reviewReason}</p>}
                <Button onClick={close} size="lg" className="mt-5 w-full">Done</Button>
              </div>
            ) : step === "awaiting_bank" && intent ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Clock className="mx-auto h-12 w-12 text-brand" />
                  <h3 className="mt-3 font-display text-xl font-semibold">Transfer to complete your gift</h3>
                  <p className="mt-1 text-sm text-muted">Use the exact reference below. GiftCash will confirm automatically when the GTBank alert arrives.</p>
                </div>
                <div className="rounded-3xl border border-brand/15 bg-white p-4 text-sm">
                  <CopyRow label="Bank" value={intent.settlementAccount.bankName} onCopy={copy} copied={copied} />
                  <CopyRow label="Account name" value={intent.settlementAccount.accountName} onCopy={copy} copied={copied} />
                  <CopyRow label="Account number" value={intent.settlementAccount.accountNumber} onCopy={copy} copied={copied} />
                  <CopyRow label="Amount to transfer" value={formatMoney(intent.totalTransferAmount, intent.currency)} copyValue={String(intent.totalTransferAmount / 100)} onCopy={copy} copied={copied} strong />
                  <div className="mt-4 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Payment reference</p>
                    <p className="mt-2 break-all font-mono text-3xl font-black text-red-700">{intent.reference}</p>
                    <button onClick={() => copy("Reference", intent.reference)} className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
                      <ClipboardCopy className="h-3.5 w-3.5" /> {copied === "Reference" ? "Copied" : "Copy reference"}
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-gold-soft px-4 py-3 text-xs text-ink/75">
                  Important: type <strong className="text-red-700">{intent.reference}</strong> as your bank transfer narration/reference. Exact reference + exact amount confirms automatically; anything else goes to admin review.
                </div>
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" /> Awaiting GTBank alert from {intent.settlementAccount.alertSenderEmail}
                </div>
                <Button onClick={close} variant="outline" className="w-full">I&apos;ll complete later</Button>
              </div>
            ) : step === "paying" ? (
              <div className="grid place-items-center py-14"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>
            ) : (
              <>
                <h3 className="font-display text-xl font-semibold">{ctaLabel}</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <select className={`${inputCls} w-24`} value={cur} onChange={(e) => setCur(e.target.value as CurrencyCode)}>
                      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol}</option>)}
                    </select>
                    <input className={`${inputCls} text-xl font-semibold`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((a) => (
                      <button key={a} onClick={() => setAmount(String(a))} className={`rounded-full border px-3 py-1.5 text-sm ${amount === String(a) ? "border-brand bg-brand text-white" : "border-ink/10 bg-white"}`}>
                        {formatMoney(toMinor(a), cur)}
                      </button>
                    ))}
                  </div>
                  {maxAmount && <p className="-mt-1 text-xs text-muted">Maximum {formatMoney(maxAmount, cur)} per donor for this event.</p>}
                  <input className={inputCls} placeholder={requireName ? "Your full name (required)" : "Your name"} value={name} onChange={(e) => setName(e.target.value)} disabled={isAnon} />
                  <textarea className={inputCls} rows={2} placeholder="Add a message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
                  {!requireName && (
                    <button onClick={() => setAnonymous((v) => !v)} className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left text-sm">
                      <span>🕶️ Contribute anonymously</span>
                      <span className={`relative h-6 w-11 rounded-full transition ${anonymous ? "bg-brand" : "bg-ink/15"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${anonymous ? "left-[22px]" : "left-0.5"}`} />
                      </span>
                    </button>
                  )}
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    <div className="flex justify-between text-muted"><span>Contribution</span><span>{formatMoney(amountMinor, cur)}</span></div>
                    <div className="flex justify-between text-muted"><span>Service fee</span><span>{formatMoney(fee, cur)}</span></div>
                    <div className="mt-1 flex justify-between font-semibold"><span>{onStartBankTransfer ? "Total transfer" : "Total"}</span><span>{formatMoney(amountMinor + fee, cur)}</span></div>
                  </div>
                  {error && <p className="text-sm text-pink">{error}</p>}
                  <Button onClick={submit} size="lg" className="w-full">{onStartBankTransfer ? "Submit amount and show transfer details" : `Pay ${formatMoney(amountMinor + fee, cur)}`}</Button>
                  <p className="text-center text-xs text-muted">{onStartBankTransfer ? "After you submit, GiftCash will show the GTBank account and your unique red payment reference." : "Demo payment — no real charge."}</p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CopyRow({ label, value, copyValue, onCopy, copied, strong = false }: { label: string; value: string; copyValue?: string; onCopy: (label: string, value: string) => void; copied: string | null; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/5 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className={`truncate ${strong ? "font-semibold text-brand" : "font-medium"}`}>{value}</p>
      </div>
      <button onClick={() => onCopy(label, copyValue ?? value)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1 text-xs hover:border-brand/40">
        <ClipboardCopy className="h-3.5 w-3.5" /> {copied === label ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
