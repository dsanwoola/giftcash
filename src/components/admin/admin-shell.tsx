"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gift, Banknote, Users, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/gifts", label: "Gifts", icon: Gift },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-ink text-cream md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-white/10 p-5 md:block">
        <Logo className="text-cream" />
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold text-gold">
          <ShieldCheck className="h-3 w-3" /> ADMIN
        </p>
        <nav className="mt-8 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-brand text-white" : "text-cream/70 hover:bg-white/5 hover:text-cream",
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard" className="mt-6 block text-xs text-cream/50 hover:text-cream">← Back to app</Link>
      </aside>

      {/* Mobile top bar + nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink/95 px-5 py-3 backdrop-blur md:hidden">
        <Logo className="text-cream" />
        <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold text-gold">ADMIN</span>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 pb-32 sm:px-5 md:py-8 md:pb-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-ink/95 px-1 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} className={cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-medium", active ? "bg-gold/15 text-gold" : "text-cream/60")}>
              <n.icon className="h-5 w-5" /> <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
