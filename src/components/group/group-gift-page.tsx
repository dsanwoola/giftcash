"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Share2, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ContributionWall } from "@/components/social/contribution-wall";
import { ContributeSheet, type ContributionInput } from "@/components/social/contribute-sheet";
import { useRepoData } from "@/lib/data/use-repo";
import { repo } from "@/lib/data/repo";
import { formatMoney } from "@/lib/money";
import { occasionById } from "@/lib/occasions";
import { relativeTime } from "@/lib/utils";

export function GroupGiftPage({ slug }: { slug: string }) {
  const { data: group, loading } = useRepoData(() => repo.getGroupGift(slug), [slug]);
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <div className="grid min-h-dvh place-items-center bg-cream"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>;
  }
  if (!group) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6 text-center">
        <div><p className="text-5xl">🔍</p><h1 className="mt-3 font-display text-2xl font-semibold">Group gift not found</h1><Link href="/" className="mt-4 inline-block text-brand underline">Go home</Link></div>
      </div>
    );
  }

  const occasion = occasionById(group.occasion);
  const raised = group.contributions.reduce((s, c) => s + c.amount, 0);
  const pct = Math.min(100, Math.round((raised / group.targetAmount) * 100));
  const daysLeft = Math.max(0, Math.ceil((+new Date(group.deadline) - Date.now()) / 86_400_000));

  const contribute = async (c: ContributionInput) => {
    await repo.contributeToGroup(slug, c);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: group.title, url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="flex items-center justify-between"><Logo /><Link href="/dashboard" className="text-sm text-muted hover:text-ink">Dashboard</Link></div>

        {/* Hero */}
        <div className="mt-6 overflow-hidden rounded-3xl p-7 text-cream shadow-lift" style={{ background: `linear-gradient(140deg, ${occasion.gradient[0]}, ${occasion.gradient[1]})` }}>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">{occasion.emoji} Group gift</span>
          <h1 className="mt-3 font-display text-2xl font-semibold">{group.title}</h1>
          <p className="mt-1 text-cream/80">For {group.recipientName}</p>
        </div>

        {/* Progress */}
        <div className="mt-5 rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-3xl font-semibold">{formatMoney(raised, group.currency)}</p>
              <p className="text-sm text-muted">raised of {formatMoney(group.targetAmount, group.currency)}</p>
            </div>
            <p className="gold-foil font-display text-2xl font-semibold">{pct}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10">
            <motion.div className="h-full rounded-full bg-emerald" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {group.contributions.length} contributors</span>
            <span>{daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Closing soon"}</span>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={() => setSheet(true)} size="lg" className="flex-1">Contribute</Button>
            <Button variant="outline" size="lg" onClick={share}><Share2 className="h-4 w-4" /> {copied ? "Copied" : "Share"}</Button>
          </div>
        </div>

        {group.story && (
          <p className="mt-5 rounded-2xl bg-white/60 p-4 text-sm text-muted">{group.story}</p>
        )}

        {/* Wall */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold">Contribution wall</h2>
          <p className="text-sm text-muted">Started {relativeTime(group.createdAt)} by {group.organizerName}</p>
          <div className="mt-4"><ContributionWall contributions={group.contributions} currency={group.currency} /></div>
        </div>
      </div>

      <ContributeSheet open={sheet} onClose={() => setSheet(false)} onContribute={contribute} currency={group.currency} ctaLabel={`Contribute to ${group.recipientName}'s gift`} />
    </div>
  );
}
