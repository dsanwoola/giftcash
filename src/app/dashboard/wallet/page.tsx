"use client";

import { ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import type { LedgerType } from "@/lib/types";

const LABELS: Record<LedgerType, string> = {
  gift_funded: "Gift funded",
  gift_claimed: "Gift received",
  gift_expired: "Gift expired",
  gift_refunded: "Gift refunded",
  wallet_credit: "Wallet top-up",
  wallet_debit: "Wallet debit",
  withdrawal_requested: "Withdrawal",
  withdrawal_completed: "Withdrawal completed",
  withdrawal_failed: "Withdrawal failed",
  merchant_spend: "Merchant spend",
  admin_adjustment: "Adjustment",
};

export default function WalletPage() {
  const { data: wallet } = useRepoData(() => repo.getWallet());
  const { data: ledger } = useRepoData(() => repo.getLedger());

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Wallet</h1>
        <Button variant="ghost" size="sm" onClick={() => repo.reset()}>
          <RotateCcw className="h-4 w-4" /> Reset demo
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-cream shadow-lift">
          <p className="text-sm text-cream/70">Available balance</p>
          <p className="mt-1 font-display text-4xl font-semibold">{wallet ? formatMoney(wallet.available, wallet.currency) : "—"}</p>
          <ButtonLink href="/dashboard/withdraw" variant="gold" size="sm" className="mt-4">Withdraw to bank</ButtonLink>
        </div>
        <div className="rounded-3xl border border-ink/5 bg-white/70 p-6">
          <p className="text-sm text-muted">Pending</p>
          <p className="mt-1 font-display text-3xl font-semibold">{wallet ? formatMoney(wallet.pending, wallet.currency) : "—"}</p>
          <p className="mt-3 text-xs text-muted">Balance is derived from an append-only ledger — never stored as a bare number.</p>
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Transaction history</h2>
      <div className="mt-4 space-y-2 pb-24 md:pb-0">
        {ledger?.length === 0 && <p className="text-sm text-muted">No transactions yet.</p>}
        {ledger?.map((e) => {
          const credit = e.direction === "credit";
          return (
            <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-ink/5 bg-white/70 p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-full ${credit ? "bg-emerald/10 text-emerald" : "bg-ink/5 text-ink/60"}`}>
                {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{LABELS[e.transactionType]}</p>
                <p className="truncate text-xs text-muted">{relativeTime(e.createdAt)} • {e.reference}</p>
              </div>
              <p className={`font-semibold ${credit ? "text-emerald" : "text-ink"}`}>
                {credit ? "+" : "−"}{formatMoney(e.amount, e.currency)}
              </p>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
