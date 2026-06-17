"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ButtonLink } from "@/components/ui/button";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { occasionById } from "@/lib/occasions";
import { relativeTime } from "@/lib/utils";

export default function ReceivedGifts() {
  const { data: received } = useRepoData(() => repo.listReceivedGifts());

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl font-semibold">Gifts received</h1>
      <p className="mt-1 text-sm text-muted">Every gift you&apos;ve claimed — your memory cards. 💛</p>

      <div className="mt-6 space-y-3 pb-24 md:pb-0">
        {received?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white/50 p-10 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 font-medium">No gifts received yet</p>
            <p className="text-sm text-muted">When you claim a Gift Cash, it&apos;ll appear here as a keepsake.</p>
            <ButtonLink href="/gift/tolu-birthday" className="mt-4">Try the live demo reveal</ButtonLink>
          </div>
        )}
        {received?.map((g) => {
          const o = occasionById(g.occasion);
          return (
            <Link key={g.id} href={`/gift/${g.slug}`} className="block rounded-3xl border border-ink/5 bg-white/70 p-5 transition hover:shadow-soft">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `linear-gradient(135deg, ${o.gradient[0]}22, ${o.gradient[1]}22)` }}>{o.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.label} from {g.anonymous ? "Someone" : g.senderName}</p>
                  <p className="text-xs text-muted">Claimed {relativeTime(g.claimedAt ?? g.createdAt)}</p>
                </div>
                <p className="font-display text-lg font-semibold text-emerald">{formatMoney(g.amount, g.currency)}</p>
              </div>
              {g.message && <p className="mt-3 rounded-2xl bg-cream/70 p-3 text-sm text-muted">&ldquo;{g.message}&rdquo;</p>}
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
