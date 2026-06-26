import {
  Gift,
  Sparkles,
  Users,
  QrCode,
  Banknote,
  Store,
  ArrowRight,
  MonitorPlay,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { OCCASIONS } from "@/lib/occasions";
import Link from "next/link";

const features: {
  icon: React.ElementType;
  title: string;
  body: string;
  soon?: boolean;
  href?: string;
}[] = [
  { icon: Gift, title: "Beautiful digital cash gifts", body: "Wrapped in animated boxes, envelopes and cakes — never a cold bank transfer." },
  { icon: Sparkles, title: "Surprise reveal experience", body: "A mini ceremony. The message comes first, the money is revealed last." },
  { icon: Users, title: "Group contributions", body: "Friends, family and colleagues pool together toward one big gift.", href: "/group/chidi-birthday-pool" },
  { icon: QrCode, title: "Wedding & event QR pages", body: "Guests scan a code at the venue and send cash instantly.", href: "/event/create" },
  { icon: MonitorPlay, title: "On-site / Party Mode", body: "Put Gift Cash on a big screen so every live gift explodes with name, amount, sound and confetti.", href: "/event/tunde-and-zainab/live" },
  { icon: Banknote, title: "Withdraw to bank", body: "Claim to a Gift Cash wallet, then cash out to any bank account." },
  { icon: Store, title: "Spend at merchants", body: "Coming soon — spend Gift Cash directly with partner stores.", soon: true },
];

const steps = [
  { n: "01", title: "Choose the moment", body: "Pick an occasion and a gift experience — a cake, a ring box, an envelope." },
  { n: "02", title: "Add your heart", body: "Write a message, set the amount, attach a voice note or video blessing." },
  { n: "03", title: "Send the surprise", body: "Share by WhatsApp, link or QR. They open a gift, not a transfer." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 0%, #ede4ff 0%, transparent 60%), radial-gradient(50% 40% at 0% 20%, #fbeecb 0%, transparent 55%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-9 px-4 py-10 sm:px-5 sm:py-14 md:grid-cols-2 md:gap-12 md:py-24">
          <div className="animate-rise text-center md:text-left">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand/15 bg-white/60 px-3 py-1.5 text-center text-xs font-medium text-brand sm:px-4">
              <Sparkles className="h-3.5 w-3.5" /> Digital cash gifting, reimagined
            </span>
            <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl md:text-6xl">
              Don&apos;t just send money.{" "}
              <span className="text-gradient">Send a moment.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted sm:text-lg md:mx-0">
              Gift Cash turns ordinary cash gifts into beautiful digital experiences
              for birthdays, weddings, graduations, Valentine&apos;s Day, and every
              celebration that matters.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center md:justify-start">
              <ButtonLink href="/gift/create" size="lg" variant="primary" className="w-full sm:w-auto">
                Send a Gift Cash <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/event/create" size="lg" variant="gold" className="w-full sm:w-auto">
                Activate Event / Party Mode
              </ButtonLink>
              <ButtonLink href="/gift/tolu-birthday" size="lg" variant="outline" className="w-full sm:w-auto">
                See a live reveal
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted">
              No sign-up needed to try — the demo runs on sample data.
            </p>
          </div>

          {/* Floating gift card preview */}
          <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-sm">
            <div className="animate-float rounded-[2rem] bg-gradient-to-br from-brand to-brand-deep p-1 shadow-lift">
              <div className="rounded-[1.85rem] bg-ink/95 p-5 text-cream sm:p-7">
                <div className="flex items-center justify-between text-xs text-cream/60">
                  <span>GIFT CASH</span>
                  <span>🎂 Birthday</span>
                </div>
                <p className="mt-8 text-sm text-cream/70">A gift is waiting for</p>
                <p className="font-display text-3xl font-semibold">Tolu</p>
                <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-cream/80">
                  &ldquo;Happy Birthday Tolu. You are deeply loved and celebrated.&rdquo;
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-cream/50">Tap to reveal</p>
                    <p className="gold-foil font-display text-2xl font-semibold">₦ ? ? ?</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gold text-ink">
                    <Gift className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section id="occasions" className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-12">
        <h2 className="font-display text-2xl font-semibold">For every celebration</h2>
        <div className="mt-6 flex gap-3 overflow-x-auto pb-3 no-scrollbar">
          {OCCASIONS.filter((o) => o.id !== "custom").map((o) => (
            <Link
              key={o.id}
              href="/gift/create"
              className="group flex min-w-[140px] flex-col gap-2 rounded-2xl border border-ink/5 bg-white/70 p-4 transition hover:-translate-y-1 hover:shadow-soft"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
                style={{ background: `linear-gradient(135deg, ${o.gradient[0]}22, ${o.gradient[1]}22)` }}
              >
                {o.emoji}
              </span>
              <span className="font-medium">{o.label}</span>
              <span className="text-xs text-muted">{o.tagline}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">How it works</h2>
          <p className="mt-2 text-muted">Three steps to a moment they&apos;ll never forget.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-3xl border border-ink/5 bg-white/70 p-5 shadow-soft sm:p-7">
              <span className="gold-foil font-display text-4xl font-semibold">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <h2 className="text-balance font-display text-2xl font-semibold sm:text-3xl">Everything a cash gift should be</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const card = (
              <>
                {f.soon && (
                  <span className="absolute right-4 top-4 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold text-ink/70">
                    COMING SOON
                  </span>
                )}
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{f.body}</p>
                {f.href && <p className="mt-3 text-sm font-medium text-brand">See it live →</p>}
              </>
            );
            const cls = "relative block rounded-3xl border border-ink/5 bg-white/70 p-5 shadow-soft sm:p-6";
            return f.href ? (
              <Link key={f.title} href={f.href} className={`${cls} transition hover:-translate-y-1`}>{card}</Link>
            ) : (
              <div key={f.title} className={cls}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-20">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-brand-deep to-ink p-6 text-center text-cream shadow-lift sm:p-10 md:rounded-[2.5rem] md:p-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl md:text-4xl">
            Ready to send a moment?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-cream/70">
            Create your first Gift Cash in under two minutes. Free to try.
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
            <ButtonLink href="/gift/create" size="lg" variant="gold" className="w-full sm:w-auto">
              Send a Gift Cash
            </ButtonLink>
            <ButtonLink href="/gift/tolu-birthday" size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-cream hover:bg-white/20 sm:w-auto">
              See the reveal
            </ButtonLink>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
