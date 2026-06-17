import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-xl font-semibold", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand text-cream shadow-soft">
        <span className="text-lg" aria-hidden>
          🎁
        </span>
      </span>
      <span>
        Gift<span className="text-brand">Cash</span>
      </span>
    </Link>
  );
}
