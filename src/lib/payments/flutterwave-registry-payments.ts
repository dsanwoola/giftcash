import "server-only";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/data/server-store";
import { serviceFee } from "@/lib/money";
import { calculatePlatformFee } from "@/lib/monetization";
import { validateContributionForEvent } from "@/lib/payments/event-payments";
import type { Contribution, CurrencyCode, GiftEvent, RegistryContribution, RegistryItem } from "@/lib/types";
import type { RegistryReservation } from "@/lib/registry/server";
import {
  initializeFlutterwavePayment,
  FlutterwaveApiError,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
  type FlutterwaveVerifyResult,
} from "./flutterwave";

const CHECKOUT_WINDOW_MS = 15 * 60 * 1000;
const CHECKOUT_LIMIT = 5;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function checkoutClientKey(req: Request, email: string) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim();
  return digest(ip ? `ip:${ip}` : `email:${email.toLowerCase()}`);
}

async function enforceCheckoutRateLimit(req: Request, itemId: string, email: string) {
  const db = adminDb();
  const now = Date.now();
  const clientKey = checkoutClientKey(req, email);
  const keys = [digest(`client:${clientKey}:${itemId}`), digest(`email:${email.toLowerCase()}:${itemId}`)];
  const refs = keys.map((key) => db.collection<{ count: number; windowStartedAt: string; expiresAt: string }>("registry_checkout_limits").doc(key));
  await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const counts = snaps.map((snap) => {
      const data = snap.data();
      return data && now - new Date(data.windowStartedAt).getTime() < CHECKOUT_WINDOW_MS ? data.count : 0;
    });
    if (counts.some((count) => count >= CHECKOUT_LIMIT)) throw new HttpError(429, "Too many checkout attempts. Please wait and try again.");
    const windowStartedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + CHECKOUT_WINDOW_MS * 2).toISOString();
    refs.forEach((ref, index) => tx.set(ref, {
      count: counts[index] + 1,
      windowStartedAt: counts[index] === 0 ? windowStartedAt : snaps[index].data()!.windowStartedAt,
      expiresAt,
    }));
  });
  return clientKey;
}

async function markExpiredReservationFailed(reference: string) {
  const db = adminDb();
  const intentRef = db.collection<FlutterwaveRegistryIntent>("payment_intents").doc(reference);
  const reservationRef = db.collection<RegistryReservation>("registry_reservations").doc(reference);
  await db.runTransaction(async (tx) => {
    const [intentSnap, reservationSnap] = await Promise.all([tx.get(intentRef), tx.get(reservationRef)]);
    if (intentSnap.data()?.status === "confirmed" || reservationSnap.data()?.status === "confirmed") return;
    const failedAt = new Date().toISOString();
    if (intentSnap.exists) tx.update(intentRef, { status: "failed", providerMessage: "Hosted checkout expired without a successful payment.", failedAt });
    if (reservationSnap.exists) tx.update(reservationRef, { status: "failed" });
  });
}

async function reconcileExpiredReservations(itemId: string) {
  const db = adminDb();
  const snap = await db.collection<RegistryReservation>("registry_reservations").where("itemId", "==", itemId).get();
  const expired = snap.docs.map((doc) => doc.data()).filter((entry) => entry.status === "pending" && new Date(entry.expiresAt).getTime() <= Date.now());
  for (const reservation of expired) {
    try {
      const verified = await verifyFlutterwaveTransactionByReference(reservation.reference);
      if (verified.status === "successful") {
        await confirmFlutterwaveRegistryPayment(reservation.reference, { verified });
      } else if (verified.status === "failed" || verified.status === "cancelled") {
        await markExpiredReservationFailed(reservation.reference);
      } else {
        throw new HttpError(409, "A previous checkout is still being verified. Please try again shortly.");
      }
    } catch (error) {
      if (error instanceof FlutterwaveApiError && error.status === 404) {
        await markExpiredReservationFailed(reservation.reference);
        continue;
      }
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, "A previous checkout could not be verified. Please try again shortly.");
    }
  }
}

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
  req: Request,
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
  const contribution = { name: cleanName(input.name, anonymous), anonymous, message: cleanMessage(input.message), amount };
  validateContributionForEvent(event, contribution);
  const clientKey = await enforceCheckoutRateLimit(req, itemId, email);
  await reconcileExpiredReservations(itemId);
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
    contribution: { name: contribution.name, anonymous, message: contribution.message },
    status: "initialized",
    reservationExpiresAt,
    createdAt,
  };
  const reservation: RegistryReservation = { id: reference, reference, eventSlug: slug, itemId, amount, quantity: item.fundingMode === "full" ? 1 : 0, clientKey, status: "pending", expiresAt: reservationExpiresAt, createdAt };
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
    const active = reservationsSnap.docs.map((doc) => doc.data()).filter((entry) => entry.status === "pending");
    if (active.some((entry) => entry.clientKey === clientKey)) throw new HttpError(429, "You already have an active checkout for this gift.");
    if (active.length >= 10) throw new HttpError(429, "This gift has too many active checkouts. Please try again shortly.");
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
    const [freshIntentSnap, itemSnap, eventSnap, reservationSnap, contributionSnap, receiptSnap] = await Promise.all([
      tx.get(intentRef), tx.get(itemRef), tx.get(eventRef), tx.get(reservationRef), tx.get(contributionRef), tx.get(receiptRef),
    ]);
    const freshIntent = freshIntentSnap.data();
    if (freshIntent?.status === "confirmed") return;
    const item = itemSnap.data();
    const event = eventSnap.data();
    const reservation = reservationSnap.data();
    if (!item || !event || item.eventSlug !== intent.eventSlug) throw new HttpError(409, "Registry item is no longer available.");
    if (!reservation || reservation.status === "failed") throw new HttpError(409, "This checkout reservation is no longer valid.");
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
      if (item.fundingMode !== intent.fundingMode || item.currency !== intent.currency) throw new HttpError(409, "Registry funding terms changed before confirmation.");
      if (item.fundingMode === "full" && (item.fundedQuantity >= item.quantity || intent.expectedAmount !== item.targetAmount)) throw new HttpError(409, "This gift has already been funded.");
      if (item.fundingMode === "group" && item.fundedAmount + intent.expectedAmount > item.targetAmount) throw new HttpError(409, "This payment exceeds the remaining registry target.");
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
