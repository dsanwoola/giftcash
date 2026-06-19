"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ButtonLink } from "@/components/ui/button";

export function HeaderAuth() {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-9 w-24 animate-pulse rounded-full bg-ink/5" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/gift/create" className="hidden text-sm text-muted hover:text-ink sm:block">Send</Link>
        <ButtonLink href="/dashboard" size="sm" variant="primary">Dashboard</ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="text-sm text-muted hover:text-ink">Sign in</Link>
      <ButtonLink href="/gift/create" size="sm" variant="primary" className="px-3 sm:px-4"><span className="sm:hidden">Send</span><span className="hidden sm:inline">Send a Gift</span></ButtonLink>
    </div>
  );
}
