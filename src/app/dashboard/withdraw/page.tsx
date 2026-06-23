"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { limitForKyc } from "@/lib/compliance/limits";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney, toMinor } from "@/lib/money";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none focus:border-brand";

export default function WithdrawPage() {
  const { data: wallet } = useRepoData(() => repo.getWallet());
  const { data: profile } = useRepoData(() => repo.getProfile());
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "review" | "loading" | "done">("form");
  const [error, setError] = useState("");

  const amountMinor = toMinor(Number(amount) || 0);
  const limit = limitForKyc(profile?.kycStatus ?? "none");

  const review = () => {
    const cleanAccountNumber = accountNumber.replace(/\D/g, "");
    if (!bankName.trim() || !accountName.trim()) return setError("Fill in all bank details.");
    if (!/^\d{10}$/.test(cleanAccountNumber)) return setError("Enter a valid 10-digit Nigerian account number.");
    if (amountMinor < toMinor(1_000)) return setError("Minimum withdrawal is ₦1,000.");
    if (amountMinor > limit.perWithdrawal) return setError(`Your ${limit.label} limit allows ${formatMoney(limit.perWithdrawal)} per withdrawal.`);
    if (wallet && amountMinor > wallet.available) return setError("Amount exceeds your available balance.");
    setAccountNumber(cleanAccountNumber);
    setError("");
    setStep("review");
  };

  const submit = async () => {
    setStep("loading");
    try {
      await repo.requestWithdrawal(repo.currentUserId(), amountMinor, { bankName, accountNumber, accountName });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdrawal failed.");
      setStep("form");
    }
  };

  if (step === "done") {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-md py-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Withdrawal requested</h1>
          <p className="mt-2 text-muted">
            {formatMoney(amountMinor)} to {accountName} ({bankName}) is now <b>pending</b>.
            You&apos;ll be notified once it&apos;s processed.
          </p>
          <ButtonLink href="/dashboard/wallet" className="mt-6">Back to wallet</ButtonLink>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl font-semibold">Withdraw to bank</h1>
      <p className="mt-1 text-sm text-muted">
        Available: <b>{wallet ? formatMoney(wallet.available, wallet.currency) : "—"}</b>
      </p>

      <div className="mt-5 rounded-3xl border border-ink/5 bg-white/70 p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Payout limit: {limit.label}</p>
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand capitalize">KYC: {profile?.kycStatus ?? "none"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Limit label="Per withdrawal" value={formatMoney(limit.perWithdrawal)} />
          <Limit label="Daily limit" value={formatMoney(limit.daily)} />
        </div>
        <p className="mt-3 text-xs text-muted">{limit.note}</p>
        {profile && profile.kycStatus !== "verified" && (
          <ButtonLink href="/dashboard/settings" variant="outline" size="sm" className="mt-3 w-full sm:w-auto">Request verification</ButtonLink>
        )}
      </div>

      <div className="mt-6 max-w-md space-y-4 pb-6">
        {step === "form" && (
          <>
            <Labeled label="Bank name"><input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" /></Labeled>
            <Labeled label="Account number"><input className={inputCls} inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="0123456789" /></Labeled>
            <Labeled label="Account name"><input className={inputCls} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account holder name" /></Labeled>
            <Labeled label="Amount"><input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></Labeled>
            {error && <p className="text-sm text-pink">{error}</p>}
            <Button onClick={review} size="lg" className="w-full">Review withdrawal</Button>
          </>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-ink/5 bg-white p-5 text-sm">
              <Row label="Amount" value={formatMoney(amountMinor)} bold />
              <Row label="Bank" value={bankName} />
              <Row label="Account number" value={accountNumber} />
              <Row label="Account name" value={accountName} />
            </div>
            <div className="grid gap-3 sm:flex">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>Edit</Button>
              <Button className="flex-1" onClick={submit}>Confirm</Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="grid place-items-center py-12"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
        )}
      </div>
    </DashboardShell>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm text-muted">{label}</span>{children}</label>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex flex-wrap justify-between gap-2"><span className="text-muted">{label}</span><span className={bold ? "font-semibold" : ""}>{value}</span></div>;
}

function Limit({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-cream px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-semibold">{value}</p></div>;
}
