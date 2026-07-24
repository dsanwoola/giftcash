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
      "Free Gift Party page",
      "Personal and group cash gifting",
      "Live Party Mode",
      "Basic gifter report",
      "GiftCash branding",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "GiftCash Pro",
    tagline: "For celebrations that expect more gifts and need advanced controls.",
    eventSetupFee: 20_000_00,
    monthlyFee: 0,
    ticketFeeBps: 250,
    tableFeeBps: 250,
    giftCashFeeBps: 100,
    minFee: 10_000,
    maxFee: 250_000,
    currency: "NGN",
    features: [
      "Lower GiftCash transaction fees",
      "Reduced GiftCash branding",
      "Advanced reports and payout reconciliation",
      "Premium Party Mode presentation",
      "Priority launch support",
    ],
    cta: "Upgrade Gift Party",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For agencies, charities and organizations running multiple Gift Parties.",
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
      "Multi-party dashboard",
      "Custom domain and white-label options",
      "API, webhooks and bulk imports",
    ],
    cta: "Talk to sales",
  },
];

export const MONETIZATION_CHANNELS = [
  {
    title: "Transaction fees",
    description: "A transparent platform fee on completed GiftCash payments that scales with gifting activity.",
  },
  {
    title: "Gift Party upgrades",
    description: "Paid upgrades for lower fees, reduced branding, premium Party Mode, reports and payout reconciliation.",
  },
  {
    title: "Premium add-ons",
    description: "Party Mode themes, WhatsApp/SMS bundles, printed QR packs and enhanced gift media experiences.",
  },
  {
    title: "Business gifting",
    description: "Managed gifting campaigns, branded experiences and API access for organizations and agencies.",
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
