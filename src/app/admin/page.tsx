"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";

export default function AdminOverview() {
  const { data: stats } = useRepoData(() => repo.adminStats());

  const metrics = stats
    ? [
        { label: "Total gifts sent", value: stats.totalGifts },
        { label: "Total gift value", value: formatMoney(stats.totalGiftValue) },
        { label: "Claimed gifts", value: stats.claimedGifts },
        { label: "Unclaimed gifts", value: stats.unclaimedGifts },
        { label: "Total users", value: stats.totalUsers },
        { label: "Withdrawals", value: stats.totalWithdrawals },
        { label: "Pending withdrawals", value: stats.pendingWithdrawals, alert: stats.pendingWithdrawals > 0 },
        { label: "Pending KYC", value: stats.pendingKyc, alert: stats.pendingKyc > 0 },
        { label: "Failed payments", value: stats.failedPayments },
        { label: "Group gifts", value: stats.groupGifts },
        { label: "Event pages", value: stats.events },
        { label: "Contributions value", value: formatMoney(stats.contributionsValue) },
      ]
    : [];

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-cream/60">Platform metrics across all users (demo data).</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-display text-2xl font-semibold">{m.value}</p>
            <p className="mt-1 text-xs text-cream/60">{m.label}</p>
            {m.alert ? <span className="mt-2 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold">needs review</span> : null}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/withdrawals" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
          <p className="text-2xl">🏦</p>
          <p className="mt-2 font-medium">Review withdrawals</p>
          <p className="text-xs text-cream/60">{stats?.pendingWithdrawals ?? 0} pending approval</p>
        </Link>
        <Link href="/admin/gifts" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
          <p className="text-2xl">🎁</p>
          <p className="mt-2 font-medium">Manage gifts</p>
          <p className="text-xs text-cream/60">{stats?.totalGifts ?? 0} total</p>
        </Link>
        <Link href="/admin/users" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
          <p className="text-2xl">🪪</p>
          <p className="mt-2 font-medium">Approve users/KYC</p>
          <p className="text-xs text-cream/60">{stats?.pendingKyc ?? 0} pending review</p>
        </Link>
      </div>
    </AdminShell>
  );
}
