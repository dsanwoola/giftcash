import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/data/server-store";
import { serviceFee } from "@/lib/money";
import { calculatePlatformFee } from "@/lib/monetization";
import type { Contribution, CurrencyCode, GiftEvent, RegistryContribution, RegistryItem } from "@/lib/types";
import type { RegistryReservation } from "@/lib/registry/server";
import {
  initializeFlutterwavePayment,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
  type FlutterwaveVerifyResult,
} from "./flutterwave";

export interface FlutterwaveRegistryIntent {
  id: string;
  provider: "flutterwave";
  productKind: "registry_gift";
  reference: string;
  eventSlug: string;
  eventId: string;
  organizerId: string;
  registryId: string;
  itemId: string;
  itemName: string;
  fundingMode: RegistryItem["fundingMode"];
  expectedAmount: number;
  serviceFee: number;
  totalChargeAmount: number;
  currency: CurrencyCode;
  contribution: { name: string; anonymous: boolean; message?: string };
  status: "initialized" | "pending" | "confirmed" | "failed";
  reservationExpiresAt: string;
  authorizationUrl?: string;
  providerTransactionId?: string | number;
  providerStatus?: string;
  providerChannel?: string;
  providerMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

function cleanName(value: unknown, anonymous: boolean) {
  if (anonymous) return "Anonymous";
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) throw new HttpError(400, "Your name is required.");
  return name;
}

function cleanMessage(value: unknown) {
  const message = typeof value === "string" ? value.trim() : "";
  if (message.length > 500) throw new HttpError(400, "Gift message is too long.");
  return message || undefined;
}

export async function createRegistryReference() {
  const db = adminDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = `RGFLW${nanoid(14).replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}`;
    if (!(await db.collection("payment_intents").doc(reference).get()).exists) return reference;
  }
  throw new HttpError(503, "Could not allocate a registry payment reference.");
}

export async function createRegistryCheckout(
  slug: string,
  itemId: string,
  input: { amount?: number; name?: string; anonymous?: boolean; message?: string; email?: string; phone?: string },
  origin: string,
) {
  const db = adminDb();
  const [eventSnap, registrySnap, itemSnap] = await Promise.all([
    db.collection<GiftEvent>("events").doc(slug).get(),
    db.collection("event_registries").where("eventSlug", "==", slug).limit(1).get(),
    db.collection<RegistryItem>("event_registry_items").doc(itemId).get(),
  ]);
  const event = eventSnap.data();
  const registry = registrySnap.docs[0]?.data() as { id?: string; enabled?: boolean } | undefined;
  const item = itemSnap.data();
  if (!event || !event.isPublic) throw new HttpError(404, "Gift Party not found");
  if (!registry?.enabled) throw new HttpError(409, "This gift registry is not available.");
  if (!item || item.eventSlug !== slug || item.status !== "active") throw new HttpError(404, "Registry item not found");
  const email = input.email?.trim() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "A valid email is required for your payment receipt.");
  const anonymous = Boolean(input.anonymous);
  const amount = item.fundingMode === "full" ? item.targetAmount : Number(input.amount);
  if (!Number.isInteger(amount) || amount < 10_000) throw new HttpError(400, "Contribution must be at least 100 in the event currency.");
  const reference = await createRegistryReference();
  const createdAt = new Date().toISOString();
  // Flutterwave hosted checkout is configured globally for 30 minutes. Keep the
  // item reserved for five additional minutes so a provider callback cannot
  // race a newly-created checkout for the same gift.
  const reservationExpiresAt = new Date(Date.now() + 35 * 60 * 1000).toISOString();
  const fee = serviceFee(amount);
  const intent: FlutterwaveRegistryIntent = {
    id: reference,
    provider: "flutterwave",
    productKind: "registry_gift",
    reference,
    eventSlug: slug,
    eventId: event.id,
    organizerId: event.organizerId,
    registryId: registry.id ?? event.id,
    itemId,
    itemName: item.name,
    fundingMode: item.fundingMode,
    expectedAmount: amount,
    serviceFee: fee,
    totalChargeAmount: amount + fee,
    currency: item.currency,
    contribution: { name: cleanName(input.name, anonymous), anonymous, message: cleanMessage(input.message) },
    status: "initialized",
    reservationExpiresAt,
    createdAt,
  };
  const reservation: RegistryReservation = { id: reference, reference, eventSlug: slug, itemId, amount, quantity: item.fundingMode === "full" ? 1 : 0, status: "pending", expiresAt: reservationExpiresAt, createdAt };
  const intentRef = db.collection<FlutterwaveRegistryIntent>("payment_intents").doc(reference);
  const reservationRef = db.collection<RegistryReservation>("registry_reservations").doc(reference);
  const itemRef = db.collection<RegistryItem>("event_registry_items").doc(itemId);
  await db.runTransaction(async (tx) => {
    const [freshItemSnap, reservationsSnap] = await Promise.all([
      tx.get(itemRef),
      tx.get(db.collection<RegistryReservation>("registry_reservations").where("itemId", "==", itemId)),
    ]);
    const freshItem = freshItemSnap.data();
    if (!freshItem || freshItem.status !== "active") throw new HttpError(409, "This registry item is unavailable.");
    const now = Date.now();
    const active = reservationsSnap.docs.map((doc) => doc.data()).filter((entry) => entry.status === "pending" && new Date(entry.expiresAt).getTime() > now);
    if (freshItem.fundingMode === "full") {
      const reservedQuantity = active.reduce((sum, entry) => sum + entry.quantity, 0);
      if (freshItem.fundedQuantity + reservedQuantity >= freshItem.quantity) throw new HttpError(409, "Someone is currently gifting this item.");
      if (amount !== freshItem.targetAmount) throw new HttpError(400, "This gift must be funded at its listed value.");
    } else {
      const reservedAmount = active.reduce((sum, entry) => sum + entry.amount, 0);
      const remaining = freshItem.targetAmount - freshItem.fundedAmount - reservedAmount;
      if (remaining <= 0) throw new HttpError(409, "This gift has already been fully funded.");
      if (amount > remaining) throw new HttpError(409, "That contribution amount is no longer available. Choose a smaller amount.");
    }
    // Touch the item so concurrent financial edits/deletes conflict and retry.
    tx.update(itemRef, { reservationUpdatedAt: createdAt });
    tx.set(intentRef, intent);
    tx.set(reservationRef, reservation);
  });

  try {
    const result = await initializeFlutterwavePayment({
      txRef: reference,
      amount: intent.totalChargeAmount,
      currency: intent.currency,
      redirectUrl: `${origin}/api/events/${slug}/registry/payments/flutterwave/callback?reference=${reference}`,
      customer: {
        email,
        name: anonymous ? "Anonymous Gifter" : intent.contribution.name,
        phonenumber: input.phone?.replace(/\D/g, "") || undefined,
      },
      meta: { product: "giftcash_registry_gift", eventSlug: slug, itemId, registryId: intent.registryId, giftAmount: amount, serviceFee: fee },
      customizations: { title: "GiftCash Registry", description: `Fund ${item.name} for ${event.celebrants}` },
    });
    await Promise.all([
      intentRef.update({ status: "pending", authorizationUrl: result.link }),
      reservationRef.update({ status: "pending" }),
    ]);
    return { provider: "flutterwave", reference, authorizationUrl: result.link, amount: intent.totalChargeAmount, currency: intent.currency };
  } catch (error) {
    await Promise.all([
      intentRef.update({ status: "failed", providerMessage: error instanceof Error ? error.message : "Checkout initialization failed", failedAt: new Date().toISOString() }).catch(() => undefined),
      reservationRef.update({ status: "failed" }).catch(() => undefined),
    ]);
    throw error;
  }
}

async function verifyIntent(intent: FlutterwaveRegistryIntent, options?: { transactionId?: string | number; verified?: FlutterwaveVerifyResult }) {
  const result = options?.verified ?? (options?.transactionId ? await verifyFlutterwaveTransaction(options.transactionId) : await verifyFlutterwaveTransactionByReference(intent.reference));
  if (result.txRef !== intent.reference) throw new HttpError(400, "Flutterwave reference mismatch.");
  if (result.amount !== intent.totalChargeAmount || result.currency !== intent.currency) throw new HttpError(400, "Flutterwave payment amount/currency mismatch.");
  if (result.status !== "successful") throw new HttpError(400, "Flutterwave payment was not successful.");
  return result;
}

export async function confirmFlutterwaveRegistryPayment(reference: string, options?: { transactionId?: string | number; verified?: FlutterwaveVerifyResult; expectedEventSlug?: string }) {
  const db = adminDb();
  const ref = reference.toUpperCase();
  const intentRef = db.collection<FlutterwaveRegistryIntent>("payment_intents").doc(ref);
  const snap = await intentRef.get();
  const intent = snap.data();
  if (!intent || intent.productKind !== "registry_gift") throw new HttpError(404, "Registry payment reference not found.");
  if (options?.expectedEventSlug && intent.eventSlug !== options.expectedEventSlug) throw new HttpError(400, "Payment does not belong to this Gift Party.");
  if (intent.status === "confirmed") return intent;
  const result = await verifyIntent(intent, options);
  const transactionId = result.transactionId;
  if (transactionId === undefined || transactionId === null || transactionId === "") throw new HttpError(400, "Flutterwave transaction ID is missing.");
  const confirmedAt = result.paidAt ?? new Date().toISOString();
  const itemRef = db.collection<RegistryItem>("event_registry_items").doc(intent.itemId);
  const eventRef = db.collection<GiftEvent>("events").doc(intent.eventSlug);
  const reservationRef = db.collection<RegistryReservation>("registry_reservations").doc(ref);
  const contributionRef = db.collection<RegistryContribution>("registry_contributions").doc(ref);
  const receiptRef = db.collection("provider_transactions").doc(`flutterwave-${String(transactionId).replace(/[^a-zA-Z0-9_-]/g, "-")}`);

  await db.runTransaction(async (tx) => {
    const [freshIntentSnap, itemSnap, eventSnap, contributionSnap, receiptSnap] = await Promise.all([
      tx.get(intentRef), tx.get(itemRef), tx.get(eventRef), tx.get(contributionRef), tx.get(receiptRef),
    ]);
    const freshIntent = freshIntentSnap.data();
    if (freshIntent?.status === "confirmed") return;
    const item = itemSnap.data();
    const event = eventSnap.data();
    if (!item || !event || item.eventSlug !== intent.eventSlug) throw new HttpError(409, "Registry item is no longer available.");
    const receipt = receiptSnap.data() as { paymentReference?: string } | undefined;
    if (receipt && receipt.paymentReference !== ref) throw new HttpError(409, "This Flutterwave transaction has already funded another payment.");
    const existingContribution = contributionSnap.data();
    const registryContribution: RegistryContribution = existingContribution ?? {
      id: ref,
      registryId: intent.registryId,
      itemId: intent.itemId,
      eventId: intent.eventId,
      eventSlug: intent.eventSlug,
      organizerId: intent.organizerId,
      name: intent.contribution.name,
      anonymous: intent.contribution.anonymous,
      message: intent.contribution.message,
      amount: intent.expectedAmount,
      currency: intent.currency,
      paymentReference: ref,
      paymentProvider: "flutterwave",
      providerTransactionId: transactionId,
      createdAt: confirmedAt,
    };
    if (!existingContribution) {
      const fundedAmount = item.fundedAmount + intent.expectedAmount;
      const fundedQuantity = item.fundingMode === "full" ? Math.min(item.quantity, item.fundedQuantity + 1) : (fundedAmount >= item.targetAmount ? 1 : 0);
      tx.update(itemRef, { fundedAmount, fundedQuantity, updatedAt: confirmedAt });
      tx.set(contributionRef, registryContribution);
      const current = event.contributions ?? [];
      if (!current.some((entry) => entry.paymentReference === ref)) {
        const fee = calculatePlatformFee(intent.expectedAmount, "giftcash", event.revenuePlan, event.currency);
        const eventContribution: Contribution = {
          id: `reg_${nanoid(10)}`,
          name: intent.contribution.name,
          anonymous: intent.contribution.anonymous,
          amount: intent.expectedAmount,
          platformFee: fee.platformFee,
          netAmount: fee.netAmount,
          message: intent.contribution.message ? `[Registry: ${intent.itemName}] ${intent.contribution.message}` : `Registry gift: ${intent.itemName}`,
          paymentReference: ref,
          paymentProvider: "flutterwave",
          providerTransactionId: transactionId,
          settlementStatus: "pending",
          createdAt: confirmedAt,
        };
        tx.update(eventRef, { contributions: [eventContribution, ...current] });
      }
    }
    if (!receiptSnap.exists) tx.set(receiptRef, { provider: "flutterwave", providerTransactionId: transactionId, paymentReference: ref, productKind: "registry_gift", resultSlug: intent.eventSlug, itemId: intent.itemId, createdAt: confirmedAt });
    tx.update(intentRef, { status: "confirmed", providerStatus: result.status, providerChannel: result.channel, providerMessage: result.processorResponse, providerTransactionId: transactionId, confirmedAt });
    tx.update(reservationRef, { status: "confirmed" });
  });
  return { ...intent, status: "confirmed" as const, providerTransactionId: transactionId, confirmedAt };
}
