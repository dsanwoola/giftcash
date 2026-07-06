import { Logo } from "./ui/logo";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-white/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            One link for invites, tickets, tables, GiftCash gifts, RSVP and guest check-in.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li><Link href="/event/create" className="hover:text-ink">Create an Occasion</Link></li>
            <li><Link href="/gift/create" className="hover:text-ink">Send GiftCash</Link></li>
            <li><Link href="/dashboard" className="hover:text-ink">Dashboard</Link></li>
            <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link href="/dashboard/wallet" className="hover:text-ink">Wallet</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Modules</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>Invites &amp; RSVP</li>
            <li>Ticketing &amp; tables</li>
            <li>QR check-in</li>
            <li>GiftCash</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/5 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Occasion.ng. Built for celebrations across Africa and beyond.
      </div>
    </footer>
  );
}
