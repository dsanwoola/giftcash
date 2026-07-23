"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Banknote, Plus, Inbox, ShieldCheck, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/received", label: "Received", icon: Inbox },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/withdraw", label: "Withdraw", icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, router, user]);
  const signOut = async () => {
    await signOutUser();
    router.push("/");
  };
  const displayName = user?.displayName ?? user?.email ?? "Guest";
  const initials = displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (loading || !user) {
    return <div className="grid min-h-dvh place-items-center bg-cream text-sm text-muted">Loading your account…</div>;
  }

  return (
    <div className="min-h-dvh bg-cream md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-ink/5 bg-white/50 p-5 md:block">
        <Logo />
        <nav className="mt-8 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-brand text-white shadow-soft" : "text-muted hover:bg-ink/5 hover:text-ink",
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <ButtonLink href="/gift/create" className="mt-6 w-full"><Plus className="h-4 w-4" /> New gift</ButtonLink>
        <Link href="/admin" className="mt-6 flex items-center gap-2 px-4 text-xs text-muted hover:text-ink">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin dashboard
        </Link>

        <div className="mt-8 border-t border-ink/5 pt-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <button onClick={signOut} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <ButtonLink href="/login" variant="outline" size="sm" className="w-full">Sign in</ButtonLink>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/5 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <ButtonLink href="/gift/create" size="sm"><Plus className="h-4 w-4" /> New</ButtonLink>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-5 pb-32 sm:px-5 sm:py-8 md:pb-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink/5 bg-white/95 px-1 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_-24px_rgb(27_18_38_/_0.45)] backdrop-blur md:hidden">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} className={cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[9px] font-medium sm:text-[11px]", active ? "bg-brand-soft text-brand" : "text-muted")}>
              <n.icon className="h-5 w-5" /> <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
