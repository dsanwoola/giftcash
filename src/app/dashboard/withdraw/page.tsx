"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney, toMinor } from "@/lib/money";

const inputCls = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-brand";

export default function WithdrawPage() {
  const { data: wallet } = useRepoData(() => repo.getWallet());
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "review" | "loading" | "done">("form");
  const [error, setError] = useState("");

  const amountMinor = toMinor(Number(amount) || 0);

  const review = () => {
    if (!bankName || !accountNumber || !accountName) return setError("Fill in all bank details.");
    if (amountMinor <= 0) return setError("Enter an amount.");
    if (wallet && amountMinor > wallet.available) return setError("Amount exceeds your available balance.");
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

      <div className="mt-6 max-w-md space-y-4">
        {step === "form" && (
          <>
            <Labeled label="Bank name"><input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" /></Labeled>
            <Labeled label="Account number"><input className={inputCls} inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" /></Labeled>
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
            <div className="flex gap-3">
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
  return <div className="flex justify-between"><span className="text-muted">{label}</span><span className={bold ? "font-semibold" : ""}>{value}</span></div>;
}
