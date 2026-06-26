import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import { initializePaystackTransaction } from "@/lib/payments/paystack";
import {
  buildPaystackIntent,
  createUniquePaystackReference,
  validateContributionForEvent,
} from "@/lib/payments/event-payments";
import type { ContributionData } from "@/lib/data/repo-types";
import type { GiftEvent } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const data = (await req.json()) as ContributionData & { email?: string };
    const db = adminDb();
    const eventSnap = await db.collection("events").doc(slug).get();
    const event = eventSnap.data() as GiftEvent | undefined;
    if (!event) throw new HttpError(404, "Event not found");
    validateContributionForEvent(event, data);

    const reference = await createUniquePaystackReference();
    const intent = buildPaystackIntent(event, slug, reference, data);
    const origin = new URL(req.url).origin;
    const email = data.email?.trim() || `guest-${reference.toLowerCase()}@giftcash.app`;
    const payment = await initializePaystackTransaction({
      email,
      amount: intent.totalChargeAmount,
      currency: intent.currency,
      reference,
      callbackUrl: `${origin}/api/events/${slug}/payments/paystack/callback?reference=${reference}`,
      metadata: {
        product: "giftcash_event_contribution",
        eventSlug: slug,
        eventId: event.id,
        eventTitle: event.title,
        contributionAmount: intent.expectedAmount,
        serviceFee: intent.serviceFee,
        donorName: intent.contribution.anonymous ? "Anonymous" : intent.contribution.name,
        table: intent.contribution.table,
      },
    });

    await db.collection("payment_intents").doc(reference).set({
      ...intent,
      status: "pending",
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
    });

    return NextResponse.json({
      provider: "paystack",
      reference,
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      amount: intent.totalChargeAmount,
      currency: intent.currency,
    });
  } catch (e) {
    return fail(e);
  }
}
