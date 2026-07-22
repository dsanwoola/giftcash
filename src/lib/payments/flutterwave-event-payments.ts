import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { serviceFee } from "@/lib/money";
import { appendVerifiedEventContribution, HttpError } from "@/lib/data/server-store";
import type { ContributionData } from "@/lib/data/repo-types";
import type { CurrencyCode, GiftEvent } from "@/lib/types";
import {
  initializeFlutterwavePayment,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
  type FlutterwaveVerifyResult,
} from "./flutterwave";
import { cleanContribution, validateContributionForEvent } from "./event-payments";

export interface FlutterwaveEventPaymentIntent {
  id: string;
  provider: "flutterwave";
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
  providerTransactionId?: string | number;
  providerStatus?: string;
  providerChannel?: string;
  providerMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

export const flutterwaveReference = () => `OCFLW${nanoid(14).replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}`;

export async function createUniqueFlutterwaveReference() {
  const db = adminDb();
  for (let i = 0; i < 5; i += 1) {
    const reference = flutterwaveReference();
    const existing = await db.collection("payment_intents").doc(reference).get();
    if (!existing.exists) return reference;
  }
  return flutterwaveReference();
}

export function buildFlutterwaveIntent(event: GiftEvent, slug: string, reference: string, data: ContributionData): FlutterwaveEventPaymentIntent {
  const contribution = cleanContribution(data);
  const fee = serviceFee(contribution.amount);
  return {
    id: reference,
    provider: "flutterwave",
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

export async function addFlutterwaveCheckoutUrl(intent: FlutterwaveEventPaymentIntent, input: { email?: string; phone?: string; origin: string; eventTitle?: string }) {
  const safeReference = intent.reference.toUpperCase();
  const email = input.email?.trim() || `guest-${safeReference.toLowerCase()}@occasion.ng`;
  const phone = input.phone?.replace(/\D/g, "") || undefined;
  const name = intent.contribution.anonymous ? "Anonymous Guest" : intent.contribution.name || "Occasion Guest";
  const result = await initializeFlutterwavePayment({
    txRef: safeReference,
    amount: intent.totalChargeAmount,
    currency: intent.currency,
    redirectUrl: `${input.origin}/api/events/${intent.eventSlug}/payments/flutterwave/callback?reference=${safeReference}`,
    customer: { email, name, phonenumber: phone },
    meta: {
      product: "giftcash_event_contribution",
      eventSlug: intent.eventSlug,
      eventId: intent.eventId,
      contributionAmount: intent.expectedAmount,
      serviceFee: intent.serviceFee,
      donorName: intent.contribution.anonymous ? "Anonymous" : intent.contribution.name,
      table: intent.contribution.table,
    },
    customizations: {
      title: "Occasion.ng GiftCash",
      description: input.eventTitle ? `Gift contribution for ${input.eventTitle}` : "Cash gift contribution",
    },
  });
  return result.link;
}

export async function confirmFlutterwaveEventPayment(reference: string, options?: { transactionId?: string | number; verified?: FlutterwaveVerifyResult }) {
  const db = adminDb();
  const ref = reference.toUpperCase();
  const intentRef = db.collection("payment_intents").doc(ref);
  const snap = await intentRef.get();
  const intent = snap.data() as FlutterwaveEventPaymentIntent | undefined;
  if (!intent || intent.provider !== "flutterwave") throw new HttpError(404, "Flutterwave payment reference not found");
  if (intent.status === "confirmed") return intent;

  const result = options?.verified
    ?? (options?.transactionId
      ? await verifyFlutterwaveTransaction(options.transactionId)
      : await verifyFlutterwaveTransactionByReference(ref));

  if (result.txRef !== ref) throw new HttpError(400, "Flutterwave reference mismatch.");
  if (result.amount !== intent.totalChargeAmount || result.currency !== intent.currency) {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: "Amount or currency mismatch", providerTransactionId: result.transactionId, failedAt: new Date().toISOString() });
    throw new HttpError(400, "Flutterwave payment amount/currency mismatch.");
  }
  if (result.status !== "successful") {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: result.processorResponse ?? "Payment was not successful", providerTransactionId: result.transactionId, failedAt: new Date().toISOString() });
    throw new HttpError(400, "Flutterwave payment was not successful.");
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
    providerMessage: result.processorResponse,
    providerTransactionId: result.transactionId,
    confirmedAt,
  });
  return { ...intent, status: "confirmed" as const, confirmedAt };
}

export { validateContributionForEvent };
