import { ArrowRight, CheckCircle2, Gift, Percent, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { MONETIZATION_CHANNELS, REVENUE_PLANS } from "@/lib/monetization";
import { formatMoney } from "@/lib/money";

const channelIcons = [Percent, Sparkles, Gift, Users];
const feeText = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-cream">
        <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-5 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/70 px-4 py-1.5 text-xs font-semibold text-brand"><Gift className="h-3.5 w-3.5" /> Simple GiftCash pricing</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">Start gifting free. Pay only when money moves.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">Personal gifts, group collections and Gift Parties use one transparent gifting fee model.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><ButtonLink href="/party/create" size="lg">Create a Gift Party <ArrowRight className="h-4 w-4" /></ButtonLink><ButtonLink href="/gift/create" size="lg" variant="gold">Send GiftCash</ButtonLink></div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20">
          <div className="grid gap-5 lg:grid-cols-3">
            {REVENUE_PLANS.map((plan) => (
              <div key={plan.id} className={`relative rounded-[2rem] border bg-white/80 p-6 shadow-soft ${plan.recommended ? "border-brand/30 ring-4 ring-brand-soft" : "border-ink/5"}`}>
                {plan.recommended && <span className="absolute right-5 top-5 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Popular</span>}
                <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm text-muted">{plan.tagline}</p>
                <div className="mt-6 rounded-3xl bg-brand-soft/35 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-brand">Plan price</p><p className="mt-2 font-display text-3xl font-semibold">{plan.eventSetupFee ? formatMoney(plan.eventSetupFee, plan.currency) : plan.monthlyFee ? formatMoney(plan.monthlyFee, plan.currency) : "Free"}</p><p className="text-xs text-muted">{plan.monthlyFee ? "per month" : plan.eventSetupFee ? "per Gift Party upgrade" : "to start"}</p></div>
                <div className="mt-5 rounded-2xl bg-white p-4 text-center shadow-soft"><p className="font-display text-2xl font-semibold text-brand">{feeText(plan.giftCashFeeBps)}</p><p className="text-xs text-muted">GiftCash platform fee</p></div>
                {plan.maxFee && <p className="mt-3 text-xs text-muted">Fee capped at {formatMoney(plan.maxFee, plan.currency)} per transaction where applicable.</p>}
                <ul className="mt-5 space-y-3 text-sm">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /><span>{feature}</span></li>)}</ul>
                <ButtonLink href={plan.id === "enterprise" ? "/dashboard" : "/party/create"} variant={plan.recommended ? "primary" : "outline"} className="mt-6 w-full">{plan.cta}</ButtonLink>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-24">
          <div className="rounded-[2rem] bg-ink p-6 text-cream shadow-lift sm:p-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-semibold uppercase tracking-wide text-gold">Sustainable GiftCash</p><h2 className="mt-3 font-display text-3xl font-semibold">Built around gifting—not event access.</h2><p className="mt-3 text-sm leading-6 text-cream/70">GiftCash earns through transparent transaction fees and optional upgrades while keeping personal, group and Party Mode experiences focused and easy to understand.</p></div><div className="grid gap-3 sm:grid-cols-2">{MONETIZATION_CHANNELS.map((channel, index) => { const Icon = channelIcons[index] ?? Percent; return <div key={channel.title} className="rounded-3xl border border-white/10 bg-white/5 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold text-ink"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{channel.title}</h3><p className="mt-1.5 text-sm text-cream/65">{channel.description}</p></div>; })}</div></div></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
