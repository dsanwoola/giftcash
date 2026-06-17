"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { occasionById } from "@/lib/occasions";
import { relativeTime } from "@/lib/utils";

const tint: Record<string, string> = {
  claimed: "bg-emerald/20 text-emerald",
  delivered: "bg-brand/30 text-cream",
  opened: "bg-gold/20 text-gold",
  expired: "bg-white/10 text-cream/60",
  refunded: "bg-pink/20 text-pink",
};

export default function AdminGifts() {
  const { data: gifts } = useRepoData(() => repo.listAllGifts());

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Gifts</h1>
      <p className="mt-1 text-sm text-cream/60">All gifts across the platform.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        {gifts?.map((g, i) => {
          const o = occasionById(g.occasion);
          return (
            <Link
              key={g.id}
              href={`/gift/${g.slug}`}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04] ${i ? "border-t border-white/5" : ""}`}
            >
              <span className="text-xl">{o.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{g.recipientName} • {o.label}</p>
                <p className="truncate text-xs text-cream/50">{g.anonymous ? "Anonymous" : g.senderName} • {relativeTime(g.createdAt)}</p>
              </div>
              <span className="text-sm font-semibold">{formatMoney(g.amount, g.currency)}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${tint[g.status] ?? "bg-white/10 text-cream/60"}`}>{g.status}</span>
            </Link>
          );
        })}
        {gifts?.length === 0 && <p className="px-4 py-6 text-sm text-cream/60">No gifts yet.</p>}
      </div>
    </AdminShell>
  );
}
