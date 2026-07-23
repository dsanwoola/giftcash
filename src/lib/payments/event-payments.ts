import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { serviceFee } from "@/lib/money";
import { appendVerifiedEventContribution, HttpError } from "@/lib/data/server-store";
import type { ContributionData } from "@/lib/data/repo-types";
import type { CurrencyCode, GiftEvent } from "@/lib/types";
import { verifyPaystackTransaction, type PaystackVerifyResult } from "./paystack";

export interface PaystackEventPaymentIntent {
  id: string;
  provider: "paystack";
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
  accessCode?: string;
  providerStatus?: string;
  providerChannel?: string;
  providerMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

export const paystackReference = () => `GCPSK${nanoid(14).replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}`;

export function validateContributionForEvent(event: GiftEvent, data: ContributionData) {
  if (!Number.isInteger(data.amount) || data.amount < 100_00) throw new HttpError(400, "Enter a valid amount.");
  if (event.campaignMode) {
    if (data.anonymous || !data.name?.trim()) throw new HttpError(400, "Donor name is required for this campaign.");
    if (event.maxContribution && data.amount > event.maxContribution) throw new HttpError(400, "This contribution exceeds the campaign limit.");
  }
}

export function cleanContribution(data: ContributionData): ContributionData {
  const contributorId = data.contributorId?.trim();
  return {
    name: data.anonymous ? "Anonymous" : data.name?.trim() || "A guest",
    anonymous: !!data.anonymous,
    amount: data.amount,
    ...(data.message?.trim() ? { message: data.message.trim() } : {}),
    ...(data.table?.trim() ? { table: data.table.trim() } : {}),
    ...(!data.anonymous && contributorId && /^[a-zA-Z0-9_-]{16,128}$/.test(contributorId)
      ? { contributorId }
      : {}),
  };
}

export async function createUniquePaystackReference() {
  const db = adminDb();
  for (let i = 0; i < 5; i += 1) {
    const reference = paystackReference();
    const existing = await db.collection("payment_intents").doc(reference).get();
    if (!existing.exists) return reference;
  }
  return paystackReference();
}

export function buildPaystackIntent(event: GiftEvent, slug: string, reference: string, data: ContributionData): PaystackEventPaymentIntent {
  const contribution = cleanContribution(data);
  const fee = serviceFee(contribution.amount);
  const now = new Date().toISOString();
  return {
    id: reference,
    provider: "paystack",
    reference,
    eventSlug: slug,
    eventId: event.id,
    expectedAmount: contribution.amount,
    serviceFee: fee,
    totalChargeAmount: contribution.amount + fee,
    currency: event.currency,
    contribution,
    status: "initialized",
    createdAt: now,
  };
}

export async function confirmPaystackEventPayment(reference: string, verified?: PaystackVerifyResult) {
  const db = adminDb();
  const ref = reference.toUpperCase();
  const intentRef = db.collection("payment_intents").doc(ref);
  const snap = await intentRef.get();
  const intent = snap.data() as PaystackEventPaymentIntent | undefined;
  if (!intent || intent.provider !== "paystack") throw new HttpError(404, "Paystack payment reference not found");
  if (intent.status === "confirmed") return intent;

  const result = verified ?? await verifyPaystackTransaction(ref);
  if (result.reference !== ref) throw new HttpError(400, "Paystack reference mismatch.");
  if (result.amount !== intent.totalChargeAmount || result.currency !== intent.currency) {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: "Amount or currency mismatch", failedAt: new Date().toISOString() });
    throw new HttpError(400, "Paystack payment amount/currency mismatch.");
  }
  if (result.status !== "success") {
    await intentRef.update({ status: "failed", providerStatus: result.status, providerMessage: result.gatewayResponse ?? "Payment was not successful", failedAt: new Date().toISOString() });
    throw new HttpError(400, "Paystack payment was not successful.");
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
    providerMessage: result.gatewayResponse,
    confirmedAt,
  });
  return { ...intent, status: "confirmed" as const, confirmedAt };
}
