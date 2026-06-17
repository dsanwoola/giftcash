"use client";

import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import type { Contribution, CurrencyCode } from "@/lib/types";

const AVATAR_COLORS = ["#6429c9", "#0ea271", "#f25c9e", "#e6b143", "#2e1065"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || /anonymous/i.test(name)) return "🎁";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ContributionWall({
  contributions,
  currency,
  showAmounts = true,
}: {
  contributions: Contribution[];
  currency: CurrencyCode;
  showAmounts?: boolean;
}) {
  if (contributions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/15 bg-white/50 p-8 text-center">
        <p className="text-3xl">💌</p>
        <p className="mt-2 font-medium">No messages yet</p>
        <p className="text-sm text-muted">Be the first to send your love.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {contributions.map((c, i) => (
        <li key={c.id} className="flex gap-3 rounded-2xl border border-ink/5 bg-white/70 p-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          >
            {initials(c.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate font-medium">{c.name}</p>
              {showAmounts && (
                <span className="shrink-0 text-sm font-semibold text-emerald">
                  {formatMoney(c.amount, currency)}
                </span>
              )}
            </div>
            {c.message && <p className="mt-0.5 text-sm text-muted">{c.message}</p>}
            <p className="mt-1 text-xs text-muted/70">{relativeTime(c.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
