import type { OccasionId } from "./types";

/**
 * AI message assistant (spec section I).
 * Frontend placeholder today — `suggestMessage` is async and isolated so a real
 * Gemini call (via Firebase AI Logic) can replace the body without touching UI.
 */

export type MessageTone =
  | "romantic"
  | "funny"
  | "emotional"
  | "formal"
  | "short"
  | "naija"
  | "prayerful"
  | "luxury";

export const TONES: { id: MessageTone; label: string; emoji: string }[] = [
  { id: "romantic", label: "Romantic", emoji: "💕" },
  { id: "funny", label: "Funny", emoji: "😄" },
  { id: "emotional", label: "Emotional", emoji: "🥹" },
  { id: "formal", label: "Formal", emoji: "🎩" },
  { id: "short", label: "Short & sweet", emoji: "✨" },
  { id: "naija", label: "Naija party", emoji: "🥁" },
  { id: "prayerful", label: "Prayerful", emoji: "🙏" },
  { id: "luxury", label: "Luxury", emoji: "👑" },
];

const TEMPLATES: Record<MessageTone, string[]> = {
  romantic: [
    "From the first day, you've been my favourite reason to smile. Here's a little something to celebrate you, my love. 💕",
    "Every moment with you feels like a gift — so today, I'm sending one right back to you.",
  ],
  funny: [
    "I couldn't decide what to buy, so I'm letting you do the shopping. You're welcome 😄 Enjoy!",
    "Warning: this gift may cause uncontrollable joy and impulse purchases. Spend wisely (or don't)!",
  ],
  emotional: [
    "Words can't fully say how much you mean to me. I hope this gift reminds you that you are deeply loved and celebrated. 🥹",
    "You've given so much to so many. Today, let someone celebrate you. With all my heart.",
  ],
  formal: [
    "Wishing you continued success and happiness on this special occasion. Please accept this token with my warmest regards.",
    "On behalf of everyone who admires you, congratulations. May this small gesture brighten your day.",
  ],
  short: [
    "Celebrating you today. Enjoy! ✨",
    "A little something, with a lot of love.",
  ],
  naija: [
    "Owanbe loading! 🥁 No dulling — go and enjoy yourself, the gift don land. Congratulations my person! 🎉",
    "We move! 💃 Sending you small thing to add to the celebration. Stay blessed and keep shining!",
  ],
  prayerful: [
    "May this season bring you favour, joy and overflowing blessings. Receive this gift with my prayers. 🙏",
    "Grace and peace be multiplied to you. I'm believing for greater things ahead — happy celebration!",
  ],
  luxury: [
    "You deserve nothing but the finest. Here's to celebrating you in style. 👑",
    "Some moments call for something special. This one is yours — enjoy every bit of it.",
  ],
};

export async function suggestMessage(
  tone: MessageTone,
  ctx: { recipientName?: string; occasion?: OccasionId } = {},
): Promise<string> {
  // Simulated latency so the UI loading state is exercised; replace with a real
  // model call later (see lib/firebase + Firebase AI Logic).
  await new Promise((r) => setTimeout(r, 450));
  const pool = TEMPLATES[tone];
  let text = pool[Math.floor(Math.random() * pool.length)];
  if (ctx.recipientName) {
    const first = ctx.recipientName.split(" ")[0];
    if (!text.includes(first)) text = `${first}, ${text[0].toLowerCase()}${text.slice(1)}`;
  }
  return text;
}
