"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import type { BankAlertRecord, BankAlertStatus, BankTransferPaymentIntent } from "@/lib/payments/bank-transfer";

interface QueueItem extends BankAlertRecord {
  intent?: BankTransferPaymentIntent;
}

const filters: Array<BankAlertStatus | "all"> = ["needs_review", "all", "auto_confirmed", "manual_confirmed", "rejected", "duplicate"];
const tint: Record<BankAlertStatus, string> = {
  needs_review: "bg-gold/20 text-gold",
  auto_confirmed: "bg-emerald/20 text-emerald",
  manual_confirmed: "bg-emerald/20 text-emerald",
  rejected: "bg-pink/20 text-pink",
  duplicate: "bg-white/10 text-cream/60",
  ignored: "bg-white/10 text-cream/60",
};

export default function AdminBankAlerts() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("needs_review");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/admin/bank-alerts?status=${filter}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not load bank alerts.");
      setItems(payload.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bank alerts.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const actionable = useMemo(() => items.filter((i) => i.status === "needs_review"), [items]);

  const review = async (id: string, action: "approve" | "reject") => {
    const verb = action === "approve" ? "approve this bank alert and add the gift publicly" : "reject this bank alert";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    setBusy(`${id}:${action}`);
    setError("");
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/admin/bank-alerts/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not review bank alert.");
      await load();
      window.dispatchEvent(new Event("giftcash:change"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not review bank alert.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Bank alert review</h1>
          <p className="mt-1 text-sm text-cream/60">Approve imperfect GTBank alert matches or reject suspicious/duplicate transfers.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-cream/80 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`min-h-10 rounded-full border px-4 text-sm capitalize ${filter === f ? "border-gold bg-gold text-ink" : "border-white/10 bg-white/[0.03] text-cream/70"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink">{error}</p>}
      {filter === "needs_review" && <p className="mt-4 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">{actionable.length} alert{actionable.length === 1 ? "" : "s"} need admin decision.</p>}

      <div className="mt-6 space-y-3">
        {loading && <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.03] py-10"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>}
        {!loading && items.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-cream/60">No bank alerts in this queue.</p>}
        {items.map((alert) => {
          const intent = alert.intent;
          const canApprove = alert.status === "needs_review" && !!intent && ["pending", "review"].includes(intent.status);
          return (
            <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold">{alert.amount ? formatMoney(alert.amount, alert.currency ?? "NGN") : "Amount not parsed"}</p>
                  <p className="mt-1 text-sm text-cream/70">Ref: {alert.matchedReference ?? alert.paymentReference ?? "No GiftCash reference"}</p>
                  <p className="mt-1 break-words text-xs text-cream/50">{alert.senderEmail ?? "Unknown sender"} → {alert.accountLast4 ? `••••${alert.accountLast4}` : "unknown account"} • {relativeTime(alert.createdAt)}</p>
                  <p className="mt-1 break-all text-[11px] text-cream/40">Bank doc: {alert.documentNumber ?? "not parsed"} • Score {alert.matchScore}/100</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tint[alert.status]}`}>{alert.status.replace("_", " ")}</span>
              </div>

              {alert.reviewReason && <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-cream/65"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-gold" /> {alert.reviewReason}</p>}
              {intent && (
                <div className="mt-3 rounded-xl border border-white/10 bg-ink/30 px-3 py-2 text-xs text-cream/70">
                  <p className="font-medium text-cream">Matched payment intent</p>
                  <p>Event: {intent.eventSlug} • Gifter: {intent.contribution.name} • Gift: {formatMoney(intent.expectedAmount, intent.currency)} • Expected transfer: {formatMoney(intent.totalTransferAmount, intent.currency)}</p>
                  <p>Status: {intent.status} • Expires {relativeTime(intent.expiresAt)}</p>
                </div>
              )}

              {alert.status === "needs_review" && (
                <div className="mt-4 grid gap-2 sm:flex">
                  <button onClick={() => review(alert.id, "approve")} disabled={!canApprove || busy === `${alert.id}:approve`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {busy === `${alert.id}:approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve & add gift
                  </button>
                  <button onClick={() => review(alert.id, "reject")} disabled={busy === `${alert.id}:reject`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 disabled:opacity-50">
                    <X className="h-4 w-4" /> Reject
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
