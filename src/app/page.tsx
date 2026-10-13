import { ArrowRight, Check, Gift, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";

const giftWays = [
  {
    title: "Send a personal cash gift",
    body: "Turn cash into something warmer — a private gift page, a personal message and a simple way for your recipient to receive it.",
    href: "/gift/create",
    cta: "Send a GiftCash",
  },
  {
    title: "Bring everyone into a group gift",
    body: "Give friends, family or colleagues one shareable place to contribute towards a meaningful gift together.",
    href: "/group/create",
    cta: "Start a group gift",
  },
  {
    title: "Create a Gift Party",
    body: "Welcome guests, receive cash gifts, share moments, add a gift registry and celebrate every verified contribution live.",
    href: "/party/create",
    cta: "Create a Gift Party",
  },
  {
    title: "Create a Gift Registry",
    body: "Pick the gifts you'd love and let friends fund each one — cash-backed, with no private retailer details exposed.",
    href: "/party/create?registry=1",
    cta: "Create a Gift Registry",
  },
];

const partyFeatures = [
  { title: "One link and QR code", body: "Make gifting easy for guests in the room or joining from anywhere." },
  { title: "Live Party Mode", body: "Show verified gifts, messages and celebration moments on the big screen." },
  { title: "Cash-backed Gift Registry", body: "Let guests fund selected gift ideas without exposing private retailer details." },
  { title: "Moments Album", body: "Collect celebration photos with organizer-controlled moderation and publishing." },
];

const steps = [
  { title: "First, choose your kind of gift", body: "Send privately, collect with a group, or create a Gift Party for a larger celebration." },
  { title: "Then make it feel personal", body: "Add the names, message, gift details or celebration story that make the moment yours." },
  { title: "Finally, share, pay and celebrate", body: "Use the private link or QR code. GiftCash verifies payments before updating gift records." },
];

const trustPoints = [
  { title: "Verified payment updates", body: "Gift records change only after server-side payment confirmation." },
  { title: "Private details stay private", body: "Organizer records, retailer references and exact totals are protected by role." },
  { title: "Clear money records", body: "Organizers track received gifts, settlement status and withdrawals in one dashboard." },
  { title: "No confusing promises", body: "GiftCash explains plainly when a registry gift is cash-backed rather than physically delivered." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="bg-cream">
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-5 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
            <div className="animate-rise text-center lg:text-left">
              <h1 className="mx-auto max-w-[46rem] text-balance font-display text-4xl font-semibold leading-[1.0] tracking-[-0.04em] text-ink sm:text-5xl lg:mx-0 lg:text-[4.25rem]">
                Make every cash gift <span className="text-brand">feel personal.</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-ink/80 lg:mx-0">
                Send a meaningful cash gift, bring people together for one special present, or create a beautiful Gift Party guests can join from anywhere.
              </p>
              <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
                <ButtonLink href="/gift/create" size="lg" className="w-full sm:w-auto">
                  Send a cash gift <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/party/create" size="lg" variant="gold" className="w-full sm:w-auto">
                  Create a Gift Party
                </ButtonLink>
                <ButtonLink href="/party/create?registry=1" size="lg" variant="outline" className="w-full sm:w-auto">
                  Create a Gift Registry
                </ButtonLink>
              </div>
              <Link href="/group/create" className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-brand hover:text-brand-deep">
                Planning one gift together? Start a group gift <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink/70 lg:mx-0 lg:justify-start">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald" /> Secure checkout</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald" /> Verified gift records</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald" /> Transparent pricing</span>
              </div>
            </div>

            {/* Live party card — a drawn illustration of the product, flat surfaces */}
            <div className="relative mx-auto w-full max-w-[30rem] lg:mx-0">
              <div data-ui className="relative overflow-hidden rounded-[2rem] bg-white p-4 shadow-lift sm:p-5">
                <div className="rounded-[1.6rem] bg-brand-deep p-5 text-cream sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-2xl font-semibold">Amara&rsquo;s 30th</p>
                      <p className="mt-1 text-sm text-cream/70">GiftCash Party</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Live</span>
                  </div>

                  <div className="mt-6 rounded-3xl bg-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm text-cream/70">A cash gift just arrived</p><p className="mt-1 font-display text-4xl font-semibold text-gold">&#8358;25,000</p></div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink"><Gift className="h-4 w-4" /></span>
                    </div>
                    <p className="mt-4 text-base leading-6 text-cream/85">&ldquo;Wishing you a beautiful new chapter filled with joy.&rdquo;</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 p-3"><p className="text-sm text-cream/60">Party Mode</p><p className="mt-1 text-base font-semibold">Ready to celebrate</p></div>
                    <div className="rounded-2xl bg-white/5 p-3"><p className="text-sm text-cream/60">Gift Registry</p><p className="mt-1 text-base font-semibold">Cash-backed gifts</p></div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-5">
                  <div className="flex -space-x-2">
                    {["T", "N", "K"].map((letter, index) => <span key={letter} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-sm font-bold ${index === 0 ? "bg-brand-soft text-brand" : index === 1 ? "bg-gold-soft text-ink" : "bg-pink/15 text-pink"}`}>{letter}</span>)}
                  </div>
                  <div className="text-right"><p className="text-sm font-semibold text-ink">One link. Every gift.</p><p className="text-sm text-ink/60">Easy to share with guests</p></div>
                </div>
              </div>
              <div data-ui className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-cream shadow-lift sm:-left-8">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald/20 text-emerald"><ShieldCheck className="h-4 w-4" /></span>
                <div><p className="text-sm font-semibold">Payment verified</p><p className="text-sm text-cream/60">Gift record updated securely</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* WAYS TO GIFT — editorial list, no icon cards */}
        <section id="ways" className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
            <div className="animate-rise max-w-3xl">
              <h2 className="text-balance font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">The right way to gift, every time</h2>
              <p className="mt-5 text-lg leading-8 text-ink/75">From a quiet thank-you to a room full of guests, GiftCash keeps the experience simple, warm and easy to share.</p>
            </div>
            <ol className="mt-14 space-y-px overflow-hidden rounded-[2rem] bg-ink/10">
              {giftWays.map((way, index) => (
                <li key={way.title} className={`flex flex-col gap-5 p-8 sm:flex-row sm:items-baseline sm:justify-between sm:p-10 ${index === 2 ? "bg-brand-deep text-cream" : "bg-white"}`}>
                  <h3 className="font-display text-3xl font-semibold sm:w-[22rem] sm:shrink-0 sm:text-4xl">{way.title}</h3>
                  <div className="sm:max-w-md">
                    <p className={`text-lg leading-7 ${index === 2 ? "text-cream/80" : "text-ink/75"}`}>{way.body}</p>
                    <Link href={way.href} className={`mt-5 inline-flex items-center text-base font-semibold underline-offset-4 hover:underline ${index === 2 ? "text-gold" : "text-brand"}`}>{way.cta} &rarr;</Link>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* SHOWCASE — the product's own interface, drawn */}
        <section id="see" className="bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
            <div className="animate-rise max-w-3xl">
              <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">See it the way your people will</h2>
              <p className="mt-5 text-lg leading-8 text-ink/75">Every gift, group and registry lives on one clear page — the reveal, the running total, the list of ideas.</p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {/* 1 — Personal reveal */}
              <figure data-ui className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft">
                <figcaption className="text-sm font-semibold text-ink/60">Personal gift</figcaption>
                <div className="mt-4 flex flex-1 flex-col justify-center rounded-3xl bg-brand-deep p-6 text-cream">
                  <p className="text-sm text-cream/70">A gift for you, Chidi</p>
                  <p className="mt-2 font-display text-5xl font-semibold text-gold">&#8358;50,000</p>
                  <p className="mt-4 text-base leading-6 text-cream/85">&ldquo;For the move to Lagos. Go well, we are proud of you.&rdquo;</p>
                  <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink">Open your gift</span>
                </div>
              </figure>

              {/* 2 — Group gift progress */}
              <figure data-ui className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft">
                <figcaption className="text-sm font-semibold text-ink/60">Group gift</figcaption>
                <div className="mt-4 flex flex-1 flex-col rounded-3xl bg-brand-soft p-6">
                  <p className="font-display text-xl font-semibold text-ink">Farewell for Tunde</p>
                  <p className="mt-1 text-sm text-ink/70">14 colleagues contributing</p>
                  <p className="mt-6 font-display text-4xl font-semibold text-brand">&#8358;182,000</p>
                  <p className="text-sm text-ink/70">of &#8358;250,000 goal</p>
                  <div className="mt-3 h-2.5 w-full rounded-full bg-white">
                    <div className="h-2.5 rounded-full bg-brand" style={{ width: "73%" }} />
                  </div>
                  <div className="mt-6 flex -space-x-2">
                    {["A", "B", "F", "K", "M"].map((l) => <span key={l} className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-soft bg-white text-xs font-bold text-brand">{l}</span>)}
                    <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-soft bg-brand text-xs font-bold text-white">+9</span>
                  </div>
                </div>
              </figure>

              {/* 3 — Gift registry */}
              <figure data-ui className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-soft">
                <figcaption className="text-sm font-semibold text-ink/60">Gift registry</figcaption>
                <div className="mt-4 flex flex-1 flex-col gap-3 rounded-3xl bg-gold-soft p-6">
                  <p className="font-display text-xl font-semibold text-ink">Amara &amp; Emeka&rsquo;s list</p>
                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between"><p className="font-semibold text-ink">Home coffee set</p><span className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-xs font-semibold text-[#0a6e4d]">Funded</span></div>
                    <p className="mt-1 text-sm text-ink/60">Cash-backed &middot; &#8358;45,000</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between"><p className="font-semibold text-ink">Weekend getaway</p><span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Fund this</span></div>
                    <p className="mt-1 text-sm text-ink/60">&#8358;88,000 of &#8358;150,000</p>
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* GIFT PARTY — dark editorial split */}
        <section id="party" className="px-4 py-6 sm:px-5">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-ink text-cream">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="animate-rise p-8 sm:p-12 lg:p-14">
                <h2 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">A beautiful home for your celebration.</h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-cream/75">A Gift Party brings gifting, messages, selected gift ideas, shared photos and live celebration moments into one experience your guests understand immediately.</p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <ButtonLink href="/party/create" size="lg" variant="gold">Create your Gift Party <ArrowRight className="h-4 w-4" /></ButtonLink>
                  <ButtonLink href="/pricing" size="lg" variant="outline" className="border-white/20 bg-transparent text-cream hover:bg-white/10">View pricing</ButtonLink>
                </div>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                {partyFeatures.map((feature) => (
                  <div key={feature.title} className="bg-ink p-8 sm:p-9">
                    <h3 className="font-display text-2xl font-semibold">{feature.title}</h3>
                    <p className="mt-3 text-lg leading-7 text-cream/70">{feature.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — real ordered list, no decorative numbers */}
        <section id="how" className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="animate-rise">
                <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Gifting made simple.</h2>
                <p className="mt-5 text-lg leading-8 text-ink/75">GiftCash guides you from the idea to the celebration, with the right details and actions at each step.</p>
              </div>
              <ol className="grid gap-px overflow-hidden rounded-[2rem] bg-ink/10">
                {steps.map((step) => (
                  <li key={step.title} className="bg-white p-7 sm:p-9">
                    <h3 className="font-display text-2xl font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 text-lg leading-7 text-ink/75">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section id="trust" className="bg-brand-soft">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
            <div className="animate-rise max-w-2xl">
              <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Warm on the outside. Careful underneath.</h2>
              <p className="mt-5 text-lg leading-8 text-ink/75">The experience feels celebratory, while payment confirmation, privacy boundaries and organizer records remain clear.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] bg-ink/10 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <article key={point.title} className="bg-cream p-8 sm:p-9">
                  <h3 className="font-display text-2xl font-semibold text-ink">{point.title}</h3>
                  <p className="mt-3 text-lg leading-7 text-ink/75">{point.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING CTA — flat fill */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
            <div className="animate-rise grid items-center gap-8 rounded-[2rem] bg-gold-soft p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:p-14">
              <div>
                <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Start free. Pay as you go.</h2>
                <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/75">Explore personal gifts, group gifting and Gift Parties with transparent platform fees and optional celebration upgrades.</p>
              </div>
              <ButtonLink href="/pricing" size="lg" variant="dark" className="w-full lg:w-auto">See pricing <ArrowRight className="h-4 w-4" /></ButtonLink>
            </div>
          </div>
        </section>

        {/* FINAL CTA — flat deep fill */}
        <section className="px-4 pb-20 sm:px-5 sm:pb-28">
          <div className="animate-rise mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-brand-deep px-6 py-16 text-center text-cream sm:px-10 sm:py-20">
            <h2 className="mx-auto max-w-3xl text-balance font-display text-4xl font-semibold sm:text-5xl">The feeling matters most.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-cream/75">The money matters — but make your next cash gift feel considered, personal and genuinely worth remembering.</p>
            <div className="mt-9 grid gap-3 sm:flex sm:justify-center">
              <ButtonLink href="/gift/create" size="lg" variant="gold" className="w-full sm:w-auto">Send a GiftCash <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/party/create" size="lg" variant="outline" className="w-full border-white/25 bg-transparent text-cream hover:bg-white/10 sm:w-auto">Create a Gift Party</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
