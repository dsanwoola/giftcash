import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { serviceFee } from "@/lib/money";
import {
  appendVerifiedGroupContribution,
  createVerifiedGift,
  HttpError,
  validateGiftInput,
} from "@/lib/data/server-store";
import type { ContributionData, CreateGiftInput } from "@/lib/data/repo-types";
import type { CurrencyCode, Gift, GroupGift } from "@/lib/types";
import {
  initializeFlutterwavePayment,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveTransactionByReference,
  type FlutterwaveVerifyResult,
} from "./flutterwave";
import { confirmFlutterwaveEventPayment } from "./flutterwave-event-payments";

interface ProductIntentBase {
  id: string;
  provider: "flutterwave";
  reference: string;
  expectedAmount: number;
  serviceFee: number;
  totalChargeAmount: number;
  currency: CurrencyCode;
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

export interface FlutterwavePersonalGiftIntent extends ProductIntentBase {
  productKind: "personal_gift";
  senderUid: string;
  giftSlug: string;
  giftInput: CreateGiftInput;
}

export interface FlutterwaveGroupGiftIntent extends ProductIntentBase {
  productKind: "group_gift";
  groupSlug: string;
  groupId: string;
  contribution: ContributionData;
}

type ProductIntent = FlutterwavePersonalGiftIntent | FlutterwaveGroupGiftIntent;

function safeSlugPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "gift";
}

export function productReference() {
  return `GCFLW${nanoid(14).replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}`;
}

export async function createUniqueProductReference() {
  const db = adminDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = productReference();
    const existing = await db.collection("payment_intents").doc(reference).get();
    if (!existing.exists) return reference;
  }
  throw new HttpError(503, "Could not allocate a payment reference. Please try again.");
}

export function buildPersonalGiftIntent(senderUid: string, reference: string, input: CreateGiftInput): FlutterwavePersonalGiftIntent {
  const { recipientName, fee } = validateGiftInput(input);
  return {
    id: reference,
    provider: "flutterwave",
    productKind: "personal_gift",
    reference,
    senderUid,
    giftSlug: `${safeSlugPart(recipientName)}-${reference.slice(-6).toLowerCase()}`,
    giftInput: input,
    expectedAmount: input.amount,
    serviceFee: fee,
    totalChargeAmount: input.amount + fee,
    currency: input.currency,
    status: "initialized",
    createdAt: new Date().toISOString(),
  };
}

export function buildGroupGiftIntent(group: GroupGift, reference: string, data: ContributionData): FlutterwaveGroupGiftIntent {
  if (!Number.isInteger(data.amount) || data.amount < 100_00) throw new HttpError(400, "Contribution must be at least ₦100.");
  if (!data.anonymous && !data.name?.trim()) throw new HttpError(400, "Contributor name is required.");
  if (group.status !== "open") throw new HttpError(409, "This group gift is closed.");
  if (new Date(group.deadline).getTime() < Date.now()) throw new HttpError(409, "This group gift has ended.");
  const fee = serviceFee(data.amount);
  return {
    id: reference,
    provider: "flutterwave",
    productKind: "group_gift",
    reference,
    groupSlug: group.slug,
    groupId: group.id,
    contribution: {
      ...data,
      name: data.anonymous ? "Anonymous" : data.name.trim(),
      message: data.message?.trim().slice(0, 500) || undefined,
    },
    expectedAmount: data.amount,
    serviceFee: fee,
    totalChargeAmount: data.amount + fee,
    currency: group.currency,
    status: "initialized",
    createdAt: new Date().toISOString(),
  };
}

export async function initializePersonalGiftCheckout(
  intent: FlutterwavePersonalGiftIntent,
  input: { email: string; phone?: string; origin: string },
) {
  const email = input.email.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "A valid sender email is required for the payment receipt.");
  const phone = input.phone?.replace(/\D/g, "") || undefined;
  const result = await initializeFlutterwavePayment({
    txRef: intent.reference,
    amount: intent.totalChargeAmount,
    currency: intent.currency,
    redirectUrl: `${input.origin}/api/gifts/payments/flutterwave/callback?reference=${intent.reference}`,
    customer: { email, name: intent.giftInput.senderName, phonenumber: phone },
    meta: {
      product: "giftcash_personal_gift",
      giftSlug: intent.giftSlug,
      recipientName: intent.giftInput.recipientName,
      giftAmount: intent.expectedAmount,
      serviceFee: intent.serviceFee,
    },
    customizations: { title: "GiftCash", description: `Cash gift for ${intent.giftInput.recipientName}` },
  });
  return result.link;
}

export async function initializeGroupGiftCheckout(
  intent: FlutterwaveGroupGiftIntent,
  input: { email: string; phone?: string; origin: string; groupTitle: string },
) {
  const email = input.email.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "A valid email is required for the payment receipt.");
  const phone = input.phone?.replace(/\D/g, "") || undefined;
  const name = intent.contribution.anonymous ? "Anonymous Gifter" : intent.contribution.name;
  const result = await initializeFlutterwavePayment({
    txRef: intent.reference,
    amount: intent.totalChargeAmount,
    currency: intent.currency,
    redirectUrl: `${input.origin}/api/groups/${intent.groupSlug}/payments/flutterwave/callback?reference=${intent.reference}`,
    customer: { email, name, phonenumber: phone },
    meta: {
      product: "giftcash_group_gift",
      groupSlug: intent.groupSlug,
      groupId: intent.groupId,
      contributionAmount: intent.expectedAmount,
      serviceFee: intent.serviceFee,
    },
    customizations: { title: "GiftCash", description: `Group gift contribution for ${input.groupTitle}` },
  });
  return result.link;
}

async function verifyProductIntent(intent: ProductIntent, options?: { transactionId?: string | number; verified?: FlutterwaveVerifyResult }) {
  const result = options?.verified
    ?? (options?.transactionId
      ? await verifyFlutterwaveTransaction(options.transactionId)
      : await verifyFlutterwaveTransactionByReference(intent.reference));
  if (result.txRef !== intent.reference) throw new HttpError(400, "Flutterwave reference mismatch.");
  if (result.amount !== intent.totalChargeAmount || result.currency !== intent.currency) {
    throw new HttpError(400, "Flutterwave payment amount/currency mismatch.");
  }
  if (result.status !== "successful") throw new HttpError(400, "Flutterwave payment was not successful.");
  return result;
}

export async function confirmFlutterwavePayment(
  reference: string,
  options?: { transactionId?: string | number; verified?: FlutterwaveVerifyResult },
): Promise<{ intent: ProductIntent | Record<string, unknown>; gift?: Gift }> {
  const db = adminDb();
  const ref = reference.toUpperCase();
  const intentRef = db.collection("payment_intents").doc(ref);
  const snap = await intentRef.get();
  const raw = snap.data() as ({
    provider?: unknown;
    eventSlug?: unknown;
    productKind?: unknown;
  } & Record<string, unknown>) | undefined;
  if (!raw || raw.provider !== "flutterwave") throw new HttpError(404, "Flutterwave payment reference not found");

  if (!raw.productKind && typeof raw.eventSlug === "string") {
    const intent = await confirmFlutterwaveEventPayment(ref, options);
    return { intent: intent as unknown as Record<string, unknown> };
  }
  if (raw.productKind !== "personal_gift" && raw.productKind !== "group_gift") {
    throw new HttpError(400, "Unsupported Flutterwave payment product.");
  }
  const intent = raw as unknown as ProductIntent;
  if (intent.status === "confirmed") {
    const gift = intent.productKind === "personal_gift"
      ? (await db.collection("gifts").doc(intent.giftSlug).get()).data() as Gift | undefined
      : undefined;
    return { intent, gift };
  }

  try {
    const result = await verifyProductIntent(intent, options);
    let gift: Gift | undefined;
    if (intent.productKind === "personal_gift") {
      gift = await createVerifiedGift(intent.senderUid, intent.giftInput, {
        reference: ref,
        provider: "flutterwave",
        slug: intent.giftSlug,
      });
    } else {
      await appendVerifiedGroupContribution(intent.groupSlug, intent.contribution, {
        paymentReference: ref,
        settlementStatus: "pending",
      });
    }
    const confirmedAt = result.paidAt ?? new Date().toISOString();
    await intentRef.update({
      status: "confirmed",
      providerStatus: result.status,
      providerChannel: result.channel,
      providerMessage: result.processorResponse,
      providerTransactionId: result.transactionId,
      confirmedAt,
    });
    return { intent: { ...intent, status: "confirmed", confirmedAt }, gift };
  } catch (error) {
    await intentRef.update({
      status: "failed",
      providerMessage: error instanceof Error ? error.message : "Payment verification failed",
      failedAt: new Date().toISOString(),
    });
    throw error;
  }
}
