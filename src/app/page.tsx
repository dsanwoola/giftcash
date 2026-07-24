import { ArrowRight, Banknote, Gift, HeartHandshake, MonitorPlay, QrCode, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";

const features = [
  { icon: Gift, title: "Send cash gifts", body: "Create a beautiful digital cash gift, add a personal message and share it privately." },
  { icon: Users, title: "Group gifting", body: "Bring friends, family or colleagues together to fund one meaningful gift." },
  { icon: QrCode, title: "Gift Party pages", body: "Share one link or display a QR code so guests can gift from anywhere in seconds." },
  { icon: MonitorPlay, title: "Live Party Mode", body: "Celebrate gifts on the big screen with sounds, confetti, messages and a fair gifter leaderboard." },
  { icon: Banknote, title: "Wallet and payouts", body: "Track received gifts, settlement records and withdrawals from one secure dashboard." },
  { icon: ShieldCheck, title: "Trusted payments", body: "Verified payment callbacks, duplicate protection and a clear audit trail for every gift." },
];

const steps = [
  { n: "01", title: "Choose how to gift", body: "Send directly, start a group gift, or create a Gift Party page." },
  { n: "02", title: "Add your message", body: "Personalise the gift, celebration page or contribution link." },
  { n: "03", title: "Share the joy", body: "Pay securely, share the link or QR code, and celebrate gifts live in Party Mode." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ background: "radial-gradient(60% 50% at 80% 0%, #ede4ff 0%, transparent 60%), radial-gradient(50% 40% at 0% 20%, #fbeecb 0%, transparent 55%)" }} />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-5 sm:py-16 md:grid-cols-2 md:py-24">
            <div className="animate-rise text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/60 px-4 py-1.5 text-xs font-medium text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Cash gifting made memorable
              </span>
              <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl md:text-6xl">
                Send cash. Share joy. <span className="text-gradient">Celebrate together.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg md:mx-0">
                GiftCash makes personal gifts, group collections and live celebration gifting beautiful, secure and easy to share.
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center md:justify-start">
                <ButtonLink href="/gift/create" size="lg" className="w-full sm:w-auto">Send a cash gift <ArrowRight className="h-4 w-4" /></ButtonLink>
                <ButtonLink href="/party/create" size="lg" variant="gold" className="w-full sm:w-auto">Start a Gift Party</ButtonLink>
                <ButtonLink href="/group/create" size="lg" variant="outline" className="w-full sm:w-auto">Start a group gift</ButtonLink>
              </div>
              <p className="mt-4 text-xs text-muted">Built for gifting from the first message to the final celebration.</p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="animate-float rounded-[2rem] bg-gradient-to-br from-brand to-brand-deep p-1 shadow-lift">
                <div className="rounded-[1.85rem] bg-ink/95 p-7 text-cream">
                  <div className="flex items-center justify-between text-xs text-cream/60"><span>GIFTCASH PARTY</span><span>🎉 Live</span></div>
                  <p className="mt-8 text-sm text-cream/70">Celebrating</p>
                  <p className="font-display text-3xl font-semibold">Tunde &amp; Zainab</p>
                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-cream/50">New gift from Aunty Ngozi</p><p className="gold-foil font-display text-2xl font-semibold">₦50,000</p></div>
                    <div className="grid grid-cols-2 gap-3 text-sm"><span className="rounded-2xl bg-white/5 p-3">Gift messages</span><span className="rounded-2xl bg-white/5 p-3">Live leaderboard</span></div>
                  </div>
                  <div className="mt-6 flex items-end justify-between"><div><p className="text-xs text-cream/50">Scan to send a gift</p><p className="font-medium">Party Mode ready</p></div><span className="grid h-12 w-12 place-items-center rounded-full bg-gold text-ink"><QrCode className="h-5 w-5" /></span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
          <div className="text-center"><h2 className="font-display text-2xl font-semibold sm:text-3xl">How GiftCash works</h2><p className="mt-2 text-muted">A simple way to give, collect and celebrate cash gifts.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map((step) => <div key={step.n} className="rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft"><span className="gold-foil font-display text-4xl font-semibold">{step.n}</span><h3 className="mt-3 text-lg font-semibold">{step.title}</h3><p className="mt-2 text-sm text-muted">{step.body}</p></div>)}</div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="font-display text-2xl font-semibold sm:text-3xl">Everything cash gifting needs</h2><p className="mt-2 max-w-2xl text-muted">From a private birthday gift to a live wedding celebration, every flow stays focused on the gift.</p></div><HeartHandshake className="h-10 w-10 text-brand" /></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map((feature) => <div key={feature.title} className="rounded-3xl border border-ink/5 bg-white/70 p-6 shadow-soft"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><feature.icon className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{feature.title}</h3><p className="mt-1.5 text-sm text-muted">{feature.body}</p></div>)}</div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-5 sm:pb-20">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-brand-deep to-ink p-8 text-center text-cream shadow-lift sm:p-12 md:p-16"><h2 className="font-display text-3xl font-semibold">Ready to make someone’s day?</h2><p className="mx-auto mt-3 max-w-lg text-cream/70">Send a GiftCash, bring people together for a group gift, or create a live Gift Party.</p><div className="mt-7 grid gap-3 sm:flex sm:justify-center"><ButtonLink href="/gift/create" size="lg" variant="gold" className="w-full sm:w-auto">Send GiftCash</ButtonLink><ButtonLink href="/party/create" size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-cream hover:bg-white/20 sm:w-auto">Create Gift Party</ButtonLink></div></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
