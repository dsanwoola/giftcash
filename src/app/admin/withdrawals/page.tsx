"use client";

import { useMemo, useState } from "react";
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

const filters: Array<WithdrawalStatus | "all" | "actionable"> = ["actionable", "all", "pending", "processing", "completed", "failed"];

export default function AdminWithdrawals() {
  const { data: withdrawals } = useRepoData(() => repo.listAllWithdrawals());
  const { data: users } = useRepoData(() => repo.listUsers());
  const [filter, setFilter] = useState<(typeof filters)[number]>("actionable");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const nameFor = (uid: string) => users?.find((u) => u.id === uid)?.fullName ?? uid;
  const visible = useMemo(() => {
    const list = withdrawals ?? [];
    if (filter === "all") return list;
    if (filter === "actionable") return list.filter((w) => w.status === "pending" || w.status === "processing");
    return list.filter((w) => w.status === filter);
  }, [withdrawals, filter]);

  const act = async (id: string, action: "complete" | "fail") => {
    const verb = action === "complete" ? "mark this payout as paid" : "fail and reverse this payout";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    setBusy(id);
    setError("");
    try {
      await repo.processWithdrawal(id, action);
      window.dispatchEvent(new Event("giftcash:change"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process withdrawal.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Withdrawal approvals</h1>
          <p className="mt-1 text-sm text-cream/60">Approve manual payouts or fail &amp; reverse reserved wallet funds.</p>
        </div>
        <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">
          {(withdrawals ?? []).filter((w) => w.status === "pending" || w.status === "processing").length} actionable
        </span>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`min-h-10 rounded-full border px-4 text-sm capitalize ${filter === f ? "border-gold bg-gold text-ink" : "border-white/10 bg-white/[0.03] text-cream/70"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink">{error}</p>}

      <div className="mt-6 space-y-3">
        {visible.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-cream/60">No withdrawals in this queue.</p>}
        {visible.map((w) => {
          const actionable = w.status === "pending" || w.status === "processing";
          return (
            <div key={w.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold">{formatMoney(w.amount, w.currency)}</p>
                  <p className="mt-1 text-sm text-cream/70">{nameFor(w.userId)} → {w.bank.accountName}</p>
                  <p className="mt-1 break-words text-xs text-cream/50">{w.bank.bankName} • {w.bank.accountNumber} • {relativeTime(w.createdAt)}</p>
                  <p className="mt-1 break-all text-[11px] text-cream/40">Ref: {w.reference}</p>
                  {w.processedAt && <p className="mt-1 text-[11px] text-cream/40">Processed {relativeTime(w.processedAt)}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTint[w.status]}`}>{w.status}</span>
              </div>
              {actionable && (
                <div className="mt-4 grid gap-2 sm:flex">
                  <button onClick={() => act(w.id, "complete")} disabled={busy === w.id} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {busy === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark paid
                  </button>
                  <button onClick={() => act(w.id, "fail")} disabled={busy === w.id} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 disabled:opacity-50">
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
