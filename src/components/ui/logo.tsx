import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-xl font-semibold", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand text-cream">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9L12 3.5z" fill="currentColor" />
        </svg>
      </span>
      <span>Gift<span className="text-brand">Cash</span></span>
    </Link>
  );
}
