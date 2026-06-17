"use client";

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

export default function AdminUsers() {
  const { data: users } = useRepoData(() => repo.listUsers());

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-cream/60">Registered users and KYC status.</p>

      <div className="mt-6 space-y-3">
        {users?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
              {u.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.fullName} {u.role === "admin" && <span className="text-gold">★</span>}</p>
              <p className="truncate text-xs text-cream/50">{u.email} • {u.country} • joined {relativeTime(u.createdAt)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${kycTint[u.kycStatus]}`}>KYC: {u.kycStatus}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
