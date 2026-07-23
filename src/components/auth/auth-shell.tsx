"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="grid min-h-dvh place-items-center px-5 py-10"
      style={{ background: "radial-gradient(70% 50% at 50% 0%, #ede4ff 0%, transparent 60%), #fbf6ee" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center"><Logo /></div>
        <div className="mt-8 rounded-3xl border border-ink/5 bg-white/80 p-7 shadow-soft">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-ink">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
