import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Camera,
  Check,
  Gift,
  Heart,
  HeartHandshake,
  LockKeyhole,
  MonitorPlay,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";

const giftWays = [
  {
    icon: Gift,
    eyebrow: "One thoughtful moment",
    title: "Send a personal cash gift",
    body: "Turn cash into something warmer—with a private gift page, a personal message and a simple way for your recipient to receive it.",
    href: "/gift/create",
    cta: "Send a GiftCash",
  },
  {
    icon: Users,
    eyebrow: "One gift, many contributors",
    title: "Bring everyone into a group gift",
    body: "Give friends, family or colleagues one shareable place to contribute towards a meaningful gift together.",
    href: "/group/create",
    cta: "Start a group gift",
  },
  {
    icon: Sparkles,
    eyebrow: "One link for the celebration",
    title: "Create a Gift Party",
    body: "Welcome guests, receive cash gifts, share moments, add a gift registry and celebrate every verified contribution live.",
    href: "/party/create",
    cta: "Create a Gift Party",
  },
];

const partyFeatures = [
  { icon: QrCode, title: "One link and QR code", body: "Make gifting easy for guests in the room or joining from anywhere." },
  { icon: MonitorPlay, title: "Live Party Mode", body: "Show verified gifts, messages and celebration moments on the big screen." },
  { icon: HeartHandshake, title: "Cash-backed Gift Registry", body: "Let guests fund selected gift ideas without exposing private retailer details." },
  { icon: Camera, title: "Moments Album", body: "Collect celebration photos with organizer-controlled moderation and publishing." },
];

const steps = [
  { number: "01", title: "Choose your kind of gift", body: "Send privately, collect with a group, or create a Gift Party for a larger celebration." },
  { number: "02", title: "Make it feel personal", body: "Add the names, message, gift details or celebration story that make the moment yours." },
  { number: "03", title: "Share, pay and celebrate", body: "Use the private link or QR code. GiftCash verifies payments before updating gift records." },
];

const trustPoints = [
  { icon: ShieldCheck, title: "Verified payment updates", body: "Gift records change only after server-side payment confirmation." },
  { icon: LockKeyhole, title: "Private details stay private", body: "Organizer records, retailer references and exact totals are protected by role." },
  { icon: WalletCards, title: "Clear money records", body: "Organizers can track received gifts, settlement status and withdrawals in one dashboard." },
  { icon: BadgeCheck, title: "No confusing promises", body: "GiftCash clearly explains when a registry gift is cash-backed rather than physically delivered." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden border-b border-ink/5">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,#fffaf2_0%,#fbf6ee_72%,#f7efe5_100%)]" />
          <div className="pointer-events-none absolute -left-32 top-20 -z-10 h-80 w-80 rounded-full bg-gold-soft/70 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 -top-20 -z-10 h-[28rem] w-[28rem] rounded-full bg-brand-soft/80 blur-3xl" />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-5 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            <div className="animate-rise text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/75 px-4 py-2 text-xs font-semibold text-brand shadow-soft">
                <Heart className="h-3.5 w-3.5 fill-current" /> Thoughtful cash gifting, beautifully done
              </span>
              <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:mx-0 lg:text-[4rem]">
                Make every cash gift <span className="text-gradient">feel personal.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8 lg:mx-0">
                Send a meaningful cash gift, bring people together for one special present, or create a beautiful Gift Party guests can join from anywhere.
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
                <ButtonLink href="/gift/create" size="lg" className="w-full sm:w-auto">
                  Send a cash gift <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/party/create" size="lg" variant="gold" className="w-full sm:w-auto">
                  Create a Gift Party
                </ButtonLink>
              </div>
              <Link href="/group/create" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-deep">
                Planning one gift together? Start a group gift <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 border-t border-ink/10 pt-5 text-xs text-muted lg:mx-0 lg:justify-start">
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald" /> Secure checkout</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald" /> Verified gift records</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald" /> Transparent pricing</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[30rem] lg:mx-0">
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand/15 via-gold/10 to-pink/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-lift backdrop-blur sm:p-5">
                <div className="rounded-[1.6rem] bg-gradient-to-br from-brand-deep via-[#3d167c] to-ink p-5 text-cream sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">GiftCash Party</p>
                      <p className="mt-1 font-display text-2xl font-semibold">Amara’s 30th</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Live</span>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-soft backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs text-cream/60">A cash gift just arrived</p><p className="mt-1 font-display text-3xl font-semibold text-gold">₦25,000</p></div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink"><Gift className="h-4 w-4" /></span>
                    </div>
                    <p className="mt-4 border-t border-white/10 pt-3 text-sm leading-6 text-cream/80">“Wishing you a beautiful new chapter filled with joy.”</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wide text-cream/45">Party Mode</p><p className="mt-1 text-sm font-semibold">Ready to celebrate</p></div>
                    <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wide text-cream/45">Gift Registry</p><p className="mt-1 text-sm font-semibold">Cash-backed gifts</p></div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-5">
                  <div className="flex -space-x-2">
                    {["T", "N", "K"].map((letter, index) => <span key={letter} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-xs font-bold ${index === 0 ? "bg-brand-soft text-brand" : index === 1 ? "bg-gold-soft text-ink" : "bg-pink/15 text-pink"}`}>{letter}</span>)}
                  </div>
                  <div className="text-right"><p className="text-xs font-semibold text-ink">One link. Every gift.</p><p className="text-[11px] text-muted">Easy to share with guests</p></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-emerald/15 bg-white px-4 py-3 shadow-lift sm:-left-8">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald/10 text-emerald"><ShieldCheck className="h-4 w-4" /></span>
                <div><p className="text-xs font-semibold">Payment verified</p><p className="text-[10px] text-muted">Gift record updated securely</p></div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="GiftCash trust highlights" className="border-b border-ink/5 bg-white/55">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-6 sm:px-5 md:grid-cols-4">
            {["Personal by design", "Built for group giving", "Made for celebrations", "Clear organizer records"].map((item) => <p key={item} className="px-2 py-2 text-center text-xs font-semibold text-ink/70 sm:text-sm">{item}</p>)}
          </div>
        </section>

        <section id="ways" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">However you want to show up</p>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">The right way to gift for every kind of moment</h2>
            <p className="mt-4 leading-7 text-muted">From a quiet thank-you to a room full of guests, GiftCash keeps the experience simple, warm and easy to share.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {giftWays.map((way, index) => (
              <article key={way.title} className={`group flex min-h-[22rem] flex-col rounded-[2rem] border p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7 ${index === 2 ? "border-brand/20 bg-brand-deep text-cream" : "border-ink/5 bg-white/80"}`}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${index === 2 ? "bg-gold text-ink" : "bg-brand-soft text-brand"}`}><way.icon className="h-5 w-5" /></span>
                <p className={`mt-8 text-[10px] font-bold uppercase tracking-[0.18em] ${index === 2 ? "text-gold" : "text-brand"}`}>{way.eyebrow}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">{way.title}</h3>
                <p className={`mt-3 text-sm leading-6 ${index === 2 ? "text-cream/70" : "text-muted"}`}>{way.body}</p>
                <Link href={way.href} className={`mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold ${index === 2 ? "text-gold" : "text-brand"}`}>{way.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section id="party" className="px-4 py-6 sm:px-5">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-ink text-cream shadow-lift">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative overflow-hidden p-7 sm:p-10 lg:p-12">
                <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand/50 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gold"><Sparkles className="h-3.5 w-3.5" /> More than a contribution link</span>
                  <h2 className="mt-6 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">Give your celebration a beautiful digital home.</h2>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-cream/65 sm:text-base">A Gift Party brings gifting, messages, selected gift ideas, shared photos and live celebration moments into one experience your guests can understand immediately.</p>
                  <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/party/create" size="lg" variant="gold">Create your Gift Party <ArrowRight className="h-4 w-4" /></ButtonLink><ButtonLink href="/pricing" size="lg" variant="outline" className="border-white/15 bg-white/5 text-cream hover:bg-white/10">View pricing</ButtonLink></div>
                </div>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                {partyFeatures.map((feature) => <div key={feature.title} className="bg-white/[0.04] p-7 sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-gold"><feature.icon className="h-5 w-5" /></span><h3 className="mt-5 font-semibold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-cream/60">{feature.body}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Simple from the start</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">A thoughtful gift should not feel complicated.</h2>
              <p className="mt-4 leading-7 text-muted">GiftCash guides you from the idea to the celebration, with the right details and actions at each step.</p>
            </div>
            <div className="space-y-3">
              {steps.map((step) => <div key={step.number} className="grid gap-4 rounded-3xl border border-ink/5 bg-white/75 p-5 shadow-soft sm:grid-cols-[4rem_1fr] sm:items-start sm:p-6"><span className="font-display text-3xl font-semibold text-brand/35">{step.number}</span><div><h3 className="text-lg font-semibold">{step.title}</h3><p className="mt-1.5 text-sm leading-6 text-muted">{step.body}</p></div></div>)}
            </div>
          </div>
        </section>

        <section id="trust" className="border-y border-ink/5 bg-white/55">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Joy with the right safeguards</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Warm on the outside. Careful underneath.</h2><p className="mt-4 leading-7 text-muted">The experience feels celebratory, while payment confirmation, privacy boundaries and organizer records remain clear.</p></div>
              <ShieldCheck className="h-12 w-12 text-brand" />
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {trustPoints.map((point) => <article key={point.title} className="flex gap-4 rounded-3xl border border-ink/5 bg-cream/70 p-5 sm:p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><point.icon className="h-5 w-5" /></span><div><h3 className="font-semibold">{point.title}</h3><p className="mt-1.5 text-sm leading-6 text-muted">{point.body}</p></div></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
          <div className="grid items-center gap-8 rounded-[2rem] border border-brand/10 bg-gradient-to-br from-brand-soft/70 via-white to-gold-soft/60 p-7 shadow-soft sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">
            <div><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand"><Banknote className="h-4 w-4" /> Straightforward pricing</span><h2 className="mt-4 font-display text-3xl font-semibold">Start free. Pay when money moves.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">Explore personal gifts, group gifting and Gift Parties with transparent platform fees and optional celebration upgrades.</p></div>
            <ButtonLink href="/pricing" size="lg" variant="dark" className="w-full lg:w-auto">See pricing <ArrowRight className="h-4 w-4" /></ButtonLink>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-5 sm:pb-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-brand via-brand-deep to-ink px-6 py-12 text-center text-cream shadow-lift sm:px-10 sm:py-16">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold text-ink"><Gift className="h-5 w-5" /></span>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance font-display text-3xl font-semibold sm:text-4xl">The money matters. The feeling matters more.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-cream/70 sm:text-base">Make your next cash gift feel considered, personal and genuinely worth remembering.</p>
            <div className="mt-8 grid gap-3 sm:flex sm:justify-center"><ButtonLink href="/gift/create" size="lg" variant="gold" className="w-full sm:w-auto">Send a GiftCash <ArrowRight className="h-4 w-4" /></ButtonLink><ButtonLink href="/party/create" size="lg" variant="outline" className="w-full border-white/20 bg-white/5 text-cream hover:bg-white/10 sm:w-auto">Create a Gift Party</ButtonLink></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
