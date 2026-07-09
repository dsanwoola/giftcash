import { Logo } from "./ui/logo";
import { HeaderAuth } from "./auth/header-auth";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/#occasions" className="hover:text-ink">Occasions</Link>
          <Link href="/#features" className="hover:text-ink">Features</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/launch" className="hover:text-ink">Launch</Link>
          <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
