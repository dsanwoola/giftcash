import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { serviceFee } from "@/lib/money";
import { appendVerifiedEventContribution, HttpError } from "@/lib/data/server-store";
import type { ContributionData } from "@/lib/data/repo-types";
import type { CurrencyCode, GiftEvent } from "@/lib/types";
import { buildPaysureCheckoutUrl, verifyPaysureCheckoutTransaction, type PaysureVerifyResult } from "./paysure";
import { cleanContribution, validateContributionForEvent } from "./event-payments";

export interface PaysureEventPaymentIntent {
  id: string;
  provider: "paysure";
  reference: string;
  eventSlug: string;
  eventId: string;
  expectedAmount: number;
  serviceFee: number;
  totalChargeAmount: number;
  currency: CurrencyCode;
  contribution: ContributionData;
  status: "initialized" | "pending" | "confirmed" | "failed";
  authorizationUrl?: string;
  providerStatus?: string;
  providerChannel?: string;
  providerMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

export const paysureReference = () => `OCPSR${nanoid(14).replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}`;

export async function createUniquePaysureReference() {
  const db = adminDb();
  for (let i = 0; i < 5; i += 1) {
    const reference = paysureReference();
    const existing = await db.collection("payment_intents").doc(reference).get();
    if (!existing.exists) return reference;
  }
  return paysureReference();
}

export function buildPaysureIntent(event: GiftEvent, slug: string, reference: string, data: ContributionData): PaysureEventPaymentIntent {
  const contribution = cleanContribution(data);
  const fee = serviceFee(contribution.amount);
  return {
    id: reference,
    provider: "paysure",
    reference,
    eventSlug: slug,
    eventId: event.id,
    expectedAmount: contribution.amount,
    serviceFee: fee,
    totalChargeAmount: contribution.amount + fee,
    currency: event.currency,
    contribution,
    status: "initialized",
    createdAt: new Date().toISOString(),
  };
}

export function addPaysureCheckoutUrl(intent: PaysureEventPaymentIntent, input: { email?: string; phone?: string; origin: string }) {
  const safeReference = intent.reference.toUpperCase();
  const email = input.email?.trim() || `guest-${safeReference.toLowerCase()}@occasion.ng`;
  const phone = input.phone?.replace(/\D/g, "") || "08000000000";
  const name = intent.contribution.anonymous ? "Anonymous Guest" : intent.contribution.name || "Occasion Guest";
  return buildPaysureCheckoutUrl({
    reference: safeReference,
    amount: intent.totalChargeAmount,
    email,
    name,
    phone,
    callbackUrl: `${input.origin}/api/events/${intent.eventSlug}/payments/paysure/callback?reference=${safeReference}`,
    cancelUrl: `${input.origin}/event/${intent.eventSlug}?payment=cancelled&reference=${safeReference}`,
  });
}

export async function confirmPaysureEventPayment(reference: string, verified?: PaysureVerifyResult) {
  const db = adminDb();
  const ref = reference.toUpperCase();
  const intentRef = db.collection("payment_intents").doc(ref);
  const snap = await intentRef.get();
  const intent = snap.data() as PaysureEventPaymentIntent | undefined;
  if (!intent || intent.provider !== "paysure") throw new HttpError(404, "Paysure payment reference not found");
  if (intent.status === "confirmed") return intent;

  const result = verified ?? await verifyPaysureCheckoutTransaction(ref);
  if (result.reference !== ref) throw new HttpError(400, "Paysure reference mismatch.");
  if (result.amount !== intent.totalChargeAmount || result.currency !== intent.currency) {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: "Amount or currency mismatch", failedAt: new Date().toISOString() });
    throw new HttpError(400, "Paysure payment amount/currency mismatch.");
  }
  if (!result.success) {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: result.providerMessage ?? "Payment was not successful", failedAt: new Date().toISOString() });
    throw new HttpError(400, "Paysure payment was not successful.");
  }

  await appendVerifiedEventContribution(intent.eventSlug, intent.contribution, {
    paymentReference: ref,
    settlementStatus: "pending",
  });
  const confirmedAt = result.paidAt ?? new Date().toISOString();
  await intentRef.update({
    status: "confirmed",
    providerStatus: result.status,
    providerChannel: result.channel,
    providerMessage: result.providerMessage,
    confirmedAt,
  });
  return { ...intent, status: "confirmed" as const, confirmedAt };
}

export { validateContributionForEvent };
