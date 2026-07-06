import type { CurrencyCode } from "./types";

export type RevenuePlanId = "starter" | "pro" | "enterprise";
export type MonetizedProduct = "tickets" | "tables" | "giftcash" | "vendor_boost" | "sms" | "premium_event";

export interface RevenuePlan {
  id: RevenuePlanId;
  name: string;
  tagline: string;
  eventSetupFee: number;
  monthlyFee: number;
  ticketFeeBps: number;
  tableFeeBps: number;
  giftCashFeeBps: number;
  minFee: number;
  maxFee?: number;
  currency: CurrencyCode;
  features: string[];
  cta: string;
  recommended?: boolean;
}

export interface FeeBreakdown {
  product: MonetizedProduct;
  planId: RevenuePlanId;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: CurrencyCode;
  feeLabel: string;
}

export const REVENUE_PLANS: RevenuePlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Launch free and pay only when money moves.",
    eventSetupFee: 0,
    monthlyFee: 0,
    ticketFeeBps: 500,
    tableFeeBps: 500,
    giftCashFeeBps: 150,
    minFee: 10_000,
    maxFee: 500_000,
    currency: "NGN",
    features: [
      "Free event page",
      "RSVP, basic ticketing and QR check-in",
      "GiftCash contributions",
      "Basic guest export",
      "Occasion branding",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Occasion Pro",
    tagline: "For paid weddings, dinners, shows and premium events.",
    eventSetupFee: 20_000_00,
    monthlyFee: 0,
    ticketFeeBps: 250,
    tableFeeBps: 250,
    giftCashFeeBps: 100,
    minFee: 10_000,
    maxFee: 250_000,
    currency: "NGN",
    features: [
      "Lower ticket, table and gift fees",
      "Remove Occasion branding",
      "Advanced reports and payout reconciliation",
      "Reserved table sales",
      "Priority launch support",
    ],
    cta: "Upgrade event",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For conferences, concerts, venues and agencies.",
    eventSetupFee: 0,
    monthlyFee: 150_000_00,
    ticketFeeBps: 100,
    tableFeeBps: 100,
    giftCashFeeBps: 50,
    minFee: 0,
    currency: "NGN",
    features: [
      "Custom contract pricing",
      "Dedicated onboarding and account manager",
      "Multi-event dashboard",
      "Custom domain and white-label options",
      "API, webhooks and bulk imports",
    ],
    cta: "Talk to sales",
  },
];

export const MONETIZATION_CHANNELS = [
  {
    title: "Transaction fees",
    description: "A platform fee on ticket, table and GiftCash payments. This is the primary revenue engine and scales with event success.",
  },
  {
    title: "Pro event upgrades",
    description: "Paid upgrade for lower fees, no branding, advanced reports, payout reconciliation and priority support.",
  },
  {
    title: "Premium add-ons",
    description: "Party Mode skins, WhatsApp/SMS bundles, printed QR packs, seating exports and enhanced media pages.",
  },
  {
    title: "Vendor marketplace",
    description: "Sponsored venue/vendor listings and qualified lead fees for caterers, DJs, decorators, ushers and photographers.",
  },
];

export function revenuePlanById(planId?: RevenuePlanId): RevenuePlan {
  return REVENUE_PLANS.find((plan) => plan.id === planId) ?? REVENUE_PLANS[0];
}

function feeBps(plan: RevenuePlan, product: MonetizedProduct) {
  if (product === "giftcash") return plan.giftCashFeeBps;
  if (product === "tables") return plan.tableFeeBps;
  if (product === "tickets") return plan.ticketFeeBps;
  return 0;
}

export function calculatePlatformFee(
  grossAmount: number,
  product: MonetizedProduct,
  planId: RevenuePlanId = "starter",
  currency: CurrencyCode = "NGN",
): FeeBreakdown {
  const plan = revenuePlanById(planId);
  const bps = feeBps(plan, product);
  const percentageFee = Math.round(grossAmount * (bps / 10_000));
  const platformFee = grossAmount <= 0 || bps === 0
    ? 0
    : Math.min(plan.maxFee ?? Number.MAX_SAFE_INTEGER, Math.max(plan.minFee, percentageFee));
  return {
    product,
    planId: plan.id,
    grossAmount,
    platformFee,
    netAmount: Math.max(0, grossAmount - platformFee),
    currency,
    feeLabel: `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%${plan.maxFee ? " capped" : ""}`,
  };
}
