import { Logo } from "./ui/logo";
import { HeaderAuth } from "./auth/header-auth";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="/#how" className="hover:text-ink">How it works</a>
          <a href="/#occasions" className="hover:text-ink">Occasions</a>
          <a href="/#features" className="hover:text-ink">Features</a>
          <a href="/dashboard" className="hover:text-ink">Dashboard</a>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
