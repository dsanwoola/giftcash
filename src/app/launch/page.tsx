import { ArrowRight, Banknote, CheckCircle2, Globe2, Rocket, ShieldCheck, Ticket, TriangleAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { REVENUE_PLANS } from "@/lib/monetization";
import { formatMoney } from "@/lib/money";

const launchItems = [
  {
    title: "Create events in minutes",
    body: "Hosts can create public Occasion pages with RSVP, tickets, table seating, GiftCash and QR check-in modules.",
    icon: Rocket,
    status: "Ready",
  },
  {
    title: "Firebase production backend",
    body: "The app is deployed on Firebase App Hosting with Firestore server access for production data after the Firebase cutover.",
    icon: ShieldCheck,
    status: "Ready",
  },
  {
    title: "Custom domain cutover",
    body: "Hostinger DNS records are prepared for occasion.ng and www.occasion.ng. Final public propagation is the remaining gate.",
    icon: Globe2,
    status: "Propagating",
  },
  {
    title: "Monetization model",
    body: "Starter, Pro and Enterprise pricing is live with ticket, table and GiftCash platform-fee calculations.",
    icon: Banknote,
    status: "Ready",
  },
];

const revenueChecklist = [
  "5% Starter fee on ticket/table sales, capped per transaction",
  "1.5% Starter fee on GiftCash contributions, capped per transaction",
  "₦20,000 Pro event upgrade for lower fees and priority launch support",
  "Enterprise monthly/custom pricing for venues, conferences and agencies",
  "Paystack webhook signature verification implemented server-side",
];

function feeText(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export default function LaunchPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-cream">
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/70 px-4 py-1.5 text-xs font-semibold text-brand">
                <Rocket className="h-3.5 w-3.5" /> Launch room
              </span>
              <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Occasion.ng is ready for a controlled launch and paid pilot.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                The product is positioned as one link for invites, RSVP, tickets, tables, GiftCash and check-in. Firebase is now the launch target; once DNS finishes moving from Cloudflare, the custom domain can be announced.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/event/create" size="lg" variant="primary">Create first event <ArrowRight className="h-4 w-4" /></ButtonLink>
                <ButtonLink href="/pricing" size="lg" variant="outline">View pricing</ButtonLink>
              </div>
            </div>

            <div className="rounded-[2rem] border border-ink/5 bg-white/80 p-6 shadow-lift">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Launch gates</p>
              <div className="mt-5 space-y-3">
                {launchItems.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-3xl bg-cream/70 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><item.icon className="h-5 w-5" /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.status === "Ready" ? "bg-emerald/10 text-emerald" : "bg-gold-soft text-ink/70"}`}>{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20">
          <div className="grid gap-5 lg:grid-cols-3">
            {REVENUE_PLANS.map((plan) => (
              <div key={plan.id} className={`rounded-[2rem] border bg-white/80 p-6 shadow-soft ${plan.recommended ? "border-brand/30 ring-4 ring-brand-soft" : "border-ink/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm text-muted">{plan.tagline}</p>
                  </div>
                  {plan.recommended && <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Pilot</span>}
                </div>
                <p className="mt-6 font-display text-3xl font-semibold">
                  {plan.eventSetupFee ? formatMoney(plan.eventSetupFee, plan.currency) : plan.monthlyFee ? formatMoney(plan.monthlyFee, plan.currency) : "Free"}
                </p>
                <p className="text-xs text-muted">{plan.monthlyFee ? "per month" : plan.eventSetupFee ? "per event upgrade" : "to launch"}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-cream/70 p-3"><p className="font-semibold">{feeText(plan.ticketFeeBps)}</p><p className="text-muted">tickets</p></div>
                  <div className="rounded-2xl bg-cream/70 p-3"><p className="font-semibold">{feeText(plan.tableFeeBps)}</p><p className="text-muted">tables</p></div>
                  <div className="rounded-2xl bg-cream/70 p-3"><p className="font-semibold">{feeText(plan.giftCashFeeBps)}</p><p className="text-muted">gifts</p></div>
                </div>
                <ButtonLink href={plan.id === "enterprise" ? "/dashboard" : "/event/create"} variant={plan.recommended ? "primary" : "outline"} className="mt-6 w-full">{plan.cta}</ButtonLink>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-24">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] bg-ink p-6 text-cream shadow-lift sm:p-8">
              <Ticket className="h-8 w-8 text-gold" />
              <h2 className="mt-4 font-display text-3xl font-semibold">Revenue plan for launch</h2>
              <p className="mt-3 text-sm leading-6 text-cream/70">
                Start with free event creation and monetize only when money moves. This lowers host friction while capturing revenue from tickets, table reservations and GiftCash.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-cream/80">
                {revenueChecklist.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{item}</li>)}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-soft sm:p-8">
              <div className="flex gap-3">
                <TriangleAlert className="mt-1 h-6 w-6 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-display text-2xl font-semibold">Payment launch gate</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-900/80">
                    Paystack checkout, transaction verification and webhook signature checks are implemented. Before public paid events, add the Paystack server secret to Firebase App Hosting and configure the Paystack webhook URL.
                  </p>
                  <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-amber-950">
                    <p className="font-semibold">Webhook URL</p>
                    <code className="mt-1 block break-all text-xs">https://occasion.ng/api/payments/paystack/webhook</code>
                  </div>
                  <p className="mt-4 text-xs text-amber-900/70">
                    Until that secret is configured and verified, market the site as ready for free event pages and controlled paid pilots, not fully live paid processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
