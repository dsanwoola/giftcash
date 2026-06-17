import { Logo } from "./ui/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-white/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            Don&apos;t just send money. Send a moment. Beautiful digital cash gifts
            for every celebration that matters.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li><a href="/gift/create" className="hover:text-ink">Send a Gift</a></li>
            <li><a href="/dashboard" className="hover:text-ink">Dashboard</a></li>
            <li><a href="/dashboard/wallet" className="hover:text-ink">Wallet</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Occasions</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>Birthdays</li>
            <li>Weddings &amp; events</li>
            <li>Graduations</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/5 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Gift Cash. Built for celebrations across Africa and beyond.
      </div>
    </footer>
  );
}
