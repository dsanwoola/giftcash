import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import { serviceFee } from "@/lib/money";
import type { ContributionData } from "@/lib/data/repo-types";
import type { GiftEvent } from "@/lib/types";
import {
  TEMP_SETTLEMENT_ACCOUNT,
  createGiftCashReference,
  type BankTransferPaymentIntent,
} from "@/lib/payments/bank-transfer";

const MIN_AMOUNT = 100_00; // ₦100

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const data = (await req.json()) as ContributionData;
    const db = adminDb();
    const eventSnap = await db.collection("events").doc(slug).get();
    const event = eventSnap.data() as GiftEvent | undefined;
    if (!event) throw new HttpError(404, "Event not found");
    if (!Number.isInteger(data.amount) || data.amount < MIN_AMOUNT) throw new HttpError(400, "Enter a valid amount.");
    if (event.campaignMode) {
      if (data.anonymous || !data.name?.trim()) throw new HttpError(400, "Donor name is required for this campaign.");
      if (event.maxContribution && data.amount > event.maxContribution) throw new HttpError(400, "This contribution exceeds the campaign limit.");
    }

    const fee = serviceFee(data.amount);
    const now = new Date();
    const reference = await uniqueReference(db);
    const contribution: ContributionData = {
      name: data.anonymous ? "Anonymous" : data.name?.trim() || "A guest",
      anonymous: !!data.anonymous,
      amount: data.amount,
      ...(data.message ? { message: data.message.trim() } : {}),
      ...(data.table ? { table: data.table } : {}),
    };
    const intent: BankTransferPaymentIntent = {
      id: reference,
      reference,
      eventSlug: slug,
      eventId: event.id,
      expectedAmount: data.amount,
      serviceFee: fee,
      totalTransferAmount: data.amount + fee,
      currency: event.currency,
      contribution,
      status: "pending",
      settlementAccount: TEMP_SETTLEMENT_ACCOUNT,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    };
    await db.collection<BankTransferPaymentIntent>("payment_intents").doc(reference).set(intent);
    return NextResponse.json(intent);
  } catch (e) {
    return fail(e);
  }
}

async function uniqueReference(db: ReturnType<typeof adminDb>) {
  for (let i = 0; i < 25; i += 1) {
    const reference = createGiftCashReference();
    const existing = await db.collection("payment_intents").doc(reference).get();
    if (!existing.exists) return reference;
  }
  throw new HttpError(503, "Could not generate a unique payment code. Please try again.");
}
