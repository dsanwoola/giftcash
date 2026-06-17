"use client";

import { motion } from "framer-motion";
import type { Occasion, Theme } from "@/lib/occasions";

/**
 * A parametric, theme-aware reveal visual. Each theme tints the aura and shows
 * its signature emblem; bespoke per-theme scenes can be layered in later without
 * changing the reveal flow that consumes this component.
 */
export function GiftVisual({
  occasion,
  theme,
  opening,
}: {
  occasion: Occasion;
  theme: Theme;
  opening: boolean;
}) {
  return (
    <div className="relative grid place-items-center">
      {/* Aura */}
      <motion.div
        aria-hidden
        className="absolute h-56 w-56 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${occasion.gradient[0]}, ${occasion.gradient[1]})` }}
        animate={opening ? { scale: [1, 1.6, 0.2], opacity: [0.5, 0.8, 0] } : { scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={opening ? { duration: 0.9, ease: "easeInOut" } : { duration: 4, repeat: Infinity }}
      />

      {/* Orbiting sparkles */}
      {!opening &&
        [0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute text-lg"
            style={{ transformOrigin: "center" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
          >
            <span style={{ display: "inline-block", transform: `translateY(-${90 + i * 6}px)` }}>✨</span>
          </motion.span>
        ))}

      {/* Emblem */}
      <motion.div
        className="relative grid h-40 w-40 place-items-center rounded-[2rem] text-7xl shadow-lift"
        style={{ background: `linear-gradient(145deg, ${occasion.gradient[0]}, ${occasion.gradient[1]})` }}
        initial={false}
        animate={
          opening
            ? { scale: [1, 1.15, 0], rotate: [0, -6, 8, 0], y: [0, -10, 8] }
            : { y: [0, -12, 0], rotate: [0, -3, 3, 0] }
        }
        transition={opening ? { duration: 0.9, ease: "backIn" } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="drop-shadow-lg" aria-hidden>
          {theme.emoji}
        </span>
        {/* Ribbon shimmer */}
        <span className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-white/30" />
      </motion.div>
    </div>
  );
}
