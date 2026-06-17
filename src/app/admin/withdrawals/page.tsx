"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import type { WithdrawalStatus } from "@/lib/types";

const statusTint: Record<WithdrawalStatus, string> = {
  pending: "bg-gold/20 text-gold",
  processing: "bg-brand/30 text-cream",
  completed: "bg-emerald/20 text-emerald",
  failed: "bg-pink/20 text-pink",
  reversed: "bg-white/10 text-cream/60",
};

export default function AdminWithdrawals() {
  const { data: withdrawals } = useRepoData(() => repo.listAllWithdrawals());
  const { data: users } = useRepoData(() => repo.listUsers());
  const [busy, setBusy] = useState<string | null>(null);

  const nameFor = (uid: string) => users?.find((u) => u.id === uid)?.fullName ?? uid;

  const act = async (id: string, action: "complete" | "fail") => {
    setBusy(id);
    try {
      await repo.processWithdrawal(id, action);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Withdrawals</h1>
      <p className="mt-1 text-sm text-cream/60">Approve payouts or fail &amp; reverse them (restores the user&apos;s balance).</p>

      <div className="mt-6 space-y-3">
        {withdrawals?.length === 0 && <p className="text-sm text-cream/60">No withdrawals yet.</p>}
        {withdrawals?.map((w) => {
          const actionable = w.status === "pending" || w.status === "processing";
          return (
            <div key={w.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold">{formatMoney(w.amount, w.currency)}</p>
                  <p className="text-sm text-cream/70">{nameFor(w.userId)} → {w.bank.accountName}</p>
                  <p className="text-xs text-cream/50">{w.bank.bankName} • {w.bank.accountNumber} • {relativeTime(w.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTint[w.status]}`}>{w.status}</span>
              </div>
              {actionable && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => act(w.id, "complete")} disabled={busy === w.id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {busy === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark paid
                  </button>
                  <button onClick={() => act(w.id, "fail")} disabled={busy === w.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 disabled:opacity-50">
                    <X className="h-4 w-4" /> Fail &amp; reverse
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
