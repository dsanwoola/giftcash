import { Logo } from "./ui/logo";
import { HeaderAuth } from "./auth/header-auth";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <Link href="/#ways" className="hover:text-ink">Ways to gift</Link>
          <Link href="/#party" className="hover:text-ink">Gift Parties</Link>
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/#trust" className="hover:text-ink">Trust &amp; safety</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>

          <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
