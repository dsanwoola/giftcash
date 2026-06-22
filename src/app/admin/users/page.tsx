"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { relativeTime } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const kycTint: Record<UserProfile["kycStatus"], string> = {
  none: "bg-white/10 text-cream/60",
  pending: "bg-gold/20 text-gold",
  verified: "bg-emerald/20 text-emerald",
  rejected: "bg-pink/20 text-pink",
};

const filters: Array<UserProfile["kycStatus"] | "all"> = ["all", "pending", "verified", "rejected", "none"];

export default function AdminUsers() {
  const { data: users } = useRepoData(() => repo.listUsers());
  const [filter, setFilter] = useState<(typeof filters)[number]>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const list = users ?? [];
    return filter === "all" ? list : list.filter((u) => u.kycStatus === filter);
  }, [users, filter]);

  const updateKyc = async (userId: string, status: UserProfile["kycStatus"]) => {
    setBusy(userId);
    setError("");
    try {
      await repo.updateUserKyc(userId, status);
      window.dispatchEvent(new Event("giftcash:change"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update KYC status.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Users & approvals</h1>
          <p className="mt-1 text-sm text-cream/60">Review users, approve KYC, and reject risky accounts.</p>
        </div>
        <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">
          {(users ?? []).filter((u) => u.kycStatus === "pending").length} pending
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
        {visible.map((u) => {
          const initials = u.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
          const pending = u.kycStatus === "pending" || u.kycStatus === "none";
          return (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                  {initials || "U"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{u.fullName} {u.role === "admin" && <span className="text-gold">★</span>}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${kycTint[u.kycStatus]}`}>KYC: {u.kycStatus}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-cream/50">{u.email || "No email"} • {u.country} • joined {relativeTime(u.createdAt)}</p>
                  <p className="mt-1 truncate text-xs text-cream/40">User ID: {u.id}</p>
                </div>
              </div>

              {pending && (
                <div className="mt-4 grid gap-2 sm:flex">
                  <button
                    onClick={() => updateKyc(u.id, "verified")}
                    disabled={busy === u.id}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve KYC
                  </button>
                  <button
                    onClick={() => updateKyc(u.id, "rejected")}
                    disabled={busy === u.id}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-cream/60">No users in this queue.</p>}
      </div>
    </AdminShell>
  );
}
