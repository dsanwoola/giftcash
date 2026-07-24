"use client";

import Link from "next/link";
import { Gift as GiftIcon, FileSpreadsheet, Heart, Plus, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ButtonLink } from "@/components/ui/button";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { occasionById } from "@/lib/occasions";
import { relativeTime } from "@/lib/utils";

const statusTint: Record<string, string> = {
  claimed: "bg-emerald/10 text-emerald",
  delivered: "bg-brand-soft text-brand",
  opened: "bg-gold-soft text-ink/70",
  expired: "bg-ink/10 text-muted",
};

export default function DashboardHome() {
  const { data: wallet } = useRepoData(() => repo.getWallet());
  const { data: sent } = useRepoData(() => repo.listSentGifts());
  const { data: groups } = useRepoData(() => repo.listGroupGifts());
  const { data: events } = useRepoData(() => repo.listEvents());

  const thankYous = (sent ?? []).filter((g) => g.thankYou?.message);

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Welcome back 👋</p>
          <h1 className="font-display text-3xl font-semibold">Your celebrations</h1>
        </div>
      </div>

      {/* Wallet card */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-cream shadow-lift">
        <div className="flex items-center gap-2 text-cream/70 text-sm"><Wallet className="h-4 w-4" /> Wallet balance</div>
        <p className="mt-2 font-display text-4xl font-semibold">
          {wallet ? formatMoney(wallet.available, wallet.currency) : "—"}
        </p>
        {wallet && wallet.pending > 0 && (
          <p className="mt-1 text-sm text-cream/60">{formatMoney(wallet.pending, wallet.currency)} pending</p>
        )}
        <div className="mt-5 flex gap-3">
          <Link href="/dashboard/withdraw"><span className="rounded-full bg-white/15 px-4 py-2 text-sm">Withdraw</span></Link>
          <Link href="/dashboard/wallet"><span className="rounded-full bg-white/15 px-4 py-2 text-sm">View ledger</span></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Gifts sent" value={sent?.length ?? 0} icon={GiftIcon} />
        <Stat label="Claimed" value={(sent ?? []).filter((g) => g.status === "claimed").length} icon={Wallet} />
        <Stat label="Thank-yous" value={thankYous.length} icon={Heart} />
      </div>

      {/* Group gifts & events */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/group/create" className="rounded-3xl border border-ink/5 bg-white/70 p-5 transition hover:shadow-soft">
          <p className="text-2xl">🤝</p>
          <p className="mt-2 font-medium">Start a group gift</p>
          <p className="text-xs text-muted">{groups?.length ? `${groups.length} active` : "Pool money toward one big gift"}</p>
        </Link>
        <Link href="/party/create" className="rounded-3xl border border-ink/5 bg-white/70 p-5 transition hover:shadow-soft">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-medium">Create a Gift Party</p>
          <p className="text-xs text-muted">{events?.length ? `${events.length} active` : "QR gifting pages with live Party Mode"}</p>
        </Link>
      </div>
      {(groups?.length || events?.length) ? (
        <div className="mt-3 space-y-2">
          {groups?.map((g) => (
            <Link key={g.id} href={`/group/${g.slug}`} className="flex items-center justify-between rounded-2xl border border-ink/5 bg-white/60 px-4 py-3 text-sm transition hover:shadow-soft">
              <span className="truncate">🤝 {g.title}</span>
              <span className="shrink-0 text-muted">{g.contributions.length} in</span>
            </Link>
          ))}
          {events?.map((e) => (
            <div key={e.id} className="rounded-2xl border border-ink/5 bg-white/60 px-4 py-3 text-sm transition hover:shadow-soft">
              <Link href={`/party/${e.slug}`} className="flex items-center justify-between gap-3">
                <span className="truncate">🎉 {e.title}</span>
                <span className="shrink-0 text-muted">{e.contributions.length} gifts</span>
              </Link>
              <Link href={`/party/${e.slug}/report`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Gifters report
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {/* Recent gifts */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Recent gifts</h2>
        <ButtonLink href="/gift/create" size="sm" variant="outline"><Plus className="h-4 w-4" /> New</ButtonLink>
      </div>

      <div className="mt-4 space-y-3 pb-24 md:pb-0">
        {sent?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white/50 p-10 text-center">
            <p className="text-4xl">🎁</p>
            <p className="mt-3 font-medium">No gifts yet</p>
            <p className="text-sm text-muted">Send your first Gift Cash and it&apos;ll show up here.</p>
            <ButtonLink href="/gift/create" className="mt-4">Send a gift</ButtonLink>
          </div>
        )}
        {sent?.map((g) => {
          const o = occasionById(g.occasion);
          return (
            <Link key={g.id} href={`/gift/${g.slug}`} className="flex items-center gap-4 rounded-2xl border border-ink/5 bg-white/70 p-4 transition hover:shadow-soft">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `linear-gradient(135deg, ${o.gradient[0]}22, ${o.gradient[1]}22)` }}>{o.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{g.recipientName} • {o.label}</p>
                <p className="truncate text-xs text-muted">{relativeTime(g.createdAt)}{g.thankYou?.message ? " • said thanks 💛" : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(g.amount, g.currency)}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusTint[g.status] ?? "bg-ink/10 text-muted"}`}>{g.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white/70 p-3 sm:p-4">
      <Icon className="h-4 w-4 text-brand" />
      <p className="mt-2 font-display text-xl font-semibold sm:text-2xl">{value}</p>
      <p className="text-[11px] leading-tight text-muted sm:text-xs">{label}</p>
    </div>
  );
}
