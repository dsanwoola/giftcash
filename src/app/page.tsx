import {
  Gift,
  Sparkles,
  QrCode,
  Banknote,
  Store,
  ArrowRight,
  MonitorPlay,
  Ticket,
  ClipboardCheck,
  Armchair,
  DoorOpen,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";

const features: {
  icon: React.ElementType;
  title: string;
  body: string;
  soon?: boolean;
  href?: string;
}[] = [
  { icon: ClipboardCheck, title: "Smart invites & RSVP", body: "Personal invite links, guest responses, plus-ones, meal notes and approval workflows." },
  { icon: Ticket, title: "Ticket sales", body: "Sell regular, VIP, VVIP, sponsor and free RSVP passes with QR entry codes.", href: "/event/create" },
  { icon: Armchair, title: "Tables & seating", body: "Create table plans, sell full tables, assign guests and export seating lists." },
  { icon: DoorOpen, title: "QR check-in", body: "Door staff can scan digital passes, prevent duplicate entry and see assigned tables." },
  { icon: Gift, title: "GiftCash module", body: "Collect cash gifts, digital spraying and guest messages on the same event page." },
  { icon: MonitorPlay, title: "Live Party Mode", body: "Show gifts and guest messages on a big screen with confetti, sounds and table QR codes.", href: "/event/tunde-and-zainab/live" },
  { icon: Banknote, title: "Event wallet & reports", body: "Track tickets, table sales, gifts, payouts and reconciliation in one organizer dashboard." },
  { icon: Store, title: "Vendor marketplace", body: "Coming soon — connect hosts with venues, DJs, MCs, caterers, ushers and photographers.", soon: true },
];

const steps = [
  { n: "01", title: "Create your Occasion", body: "Add event details, invite settings, RSVP rules, ticket types and table plans." },
  { n: "02", title: "Share one link", body: "Guests RSVP, buy tickets or tables, send GiftCash and receive a digital QR pass." },
  { n: "03", title: "Run the event", body: "Check guests in, manage seating, display Party Mode and export reports after the event." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

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
              <Sparkles className="h-3.5 w-3.5" /> One link for every event
            </span>
            <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl md:text-6xl">
              Invites, tickets, tables, gifts and check-in. <span className="text-gradient">All on Occasion.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted sm:text-lg md:mx-0">
              Occasion.ng helps hosts sell tickets, manage RSVP, arrange tables, collect GiftCash gifts, and check guests in from one beautiful event page.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center md:justify-start">
              <ButtonLink href="/event/create" size="lg" variant="primary" className="w-full sm:w-auto">
                Create an Occasion <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/gift/create" size="lg" variant="gold" className="w-full sm:w-auto">
                Send GiftCash
              </ButtonLink>
              <ButtonLink href="/event/tunde-and-zainab" size="lg" variant="outline" className="w-full sm:w-auto">
                See sample event
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted">GiftCash is now the cash-gifting module inside Occasion.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-sm">
            <div className="animate-float rounded-[2rem] bg-gradient-to-br from-brand to-brand-deep p-1 shadow-lift">
              <div className="rounded-[1.85rem] bg-ink/95 p-5 text-cream sm:p-7">
                <div className="flex items-center justify-between text-xs text-cream/60">
                  <span>OCCASION PASS</span>
                  <span>🎉 Wedding</span>
                </div>
                <p className="mt-8 text-sm text-cream/70">You are invited to</p>
                <p className="font-display text-3xl font-semibold">Tunde & Zainab</p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-cream/80">
                  <span className="rounded-2xl bg-white/5 p-3">VIP Ticket</span>
                  <span className="rounded-2xl bg-white/5 p-3">Table A1</span>
                  <span className="rounded-2xl bg-white/5 p-3">RSVP Yes</span>
                  <span className="rounded-2xl bg-white/5 p-3">GiftCash ✓</span>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-cream/50">Digital QR pass</p>
                    <p className="gold-foil font-display text-2xl font-semibold">Ready</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gold text-ink">
                    <QrCode className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">How Occasion works</h2>
          <p className="mt-2 text-muted">Before, during and after the event — one operating system for hosts.</p>
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

      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <h2 className="text-balance font-display text-2xl font-semibold sm:text-3xl">Everything your event needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const card = (
              <>
                {f.soon && <span className="absolute right-4 top-4 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold text-ink/70">COMING SOON</span>}
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{f.body}</p>
                {f.href && <p className="mt-3 text-sm font-medium text-brand">See it live →</p>}
              </>
            );
            const cls = "relative block rounded-3xl border border-ink/5 bg-white/70 p-5 shadow-soft sm:p-6";
            return f.href ? <Link key={f.title} href={f.href} className={`${cls} transition hover:-translate-y-1`}>{card}</Link> : <div key={f.title} className={cls}>{card}</div>;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-20">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-brand-deep to-ink p-6 text-center text-cream shadow-lift sm:p-10 md:rounded-[2.5rem] md:p-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl md:text-4xl">Ready to create your Occasion?</h2>
          <p className="mx-auto mt-3 max-w-md text-cream/70">Launch an event page with RSVP, tickets, tables, QR check-in and GiftCash in minutes.</p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
            <ButtonLink href="/event/create" size="lg" variant="gold" className="w-full sm:w-auto">Create an Occasion</ButtonLink>
            <ButtonLink href="/event/tunde-and-zainab" size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-cream hover:bg-white/20 sm:w-auto">View sample</ButtonLink>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
