"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
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

export function ContributeSheet({
  open,
  onClose,
  onContribute,
  currency,
  ctaLabel = "Contribute",
  requireName = false,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  onContribute: (c: ContributionInput) => Promise<void>;
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
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const [error, setError] = useState("");
  const overlay = useRef<HTMLDivElement>(null);

  const amountMinor = toMinor(Number(amount) || 0);
  const fee = serviceFee(amountMinor);

  const isAnon = requireName ? false : anonymous;

  const submit = async () => {
    if (requireName && !name.trim()) return setError("Your name is required for this event.");
    if (!isAnon && !name.trim()) return setError("Add your name (or contribute anonymously).");
    if (amountMinor < toMinor(100)) return setError("Enter a valid amount.");
    if (maxAmount && amountMinor > maxAmount) return setError(`The maximum contribution is ${formatMoney(maxAmount, cur)}.`);
    setError("");
    setStep("paying");
    await new Promise((r) => setTimeout(r, 1000)); // simulated payment
    await onContribute({ name: name.trim(), anonymous: isAnon, amount: amountMinor, message: message.trim() || undefined });
    burst();
    setStep("done");
  };

  const close = () => {
    setStep("form");
    setName("");
    setAmount("5000");
    setMessage("");
    setAnonymous(false);
    onClose();
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
                <h3 className="mt-3 font-display text-xl font-semibold">Thank you! 🎉</h3>
                <p className="mt-1 text-muted">Your {formatMoney(amountMinor, cur)} contribution has been added.</p>
                <Button onClick={close} size="lg" className="mt-5 w-full">Done</Button>
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
                    <div className="mt-1 flex justify-between font-semibold"><span>Total</span><span>{formatMoney(amountMinor + fee, cur)}</span></div>
                  </div>
                  {error && <p className="text-sm text-pink">{error}</p>}
                  <Button onClick={submit} size="lg" className="w-full">Pay {formatMoney(amountMinor + fee, cur)}</Button>
                  <p className="text-center text-xs text-muted">Demo payment — no real charge.</p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
