import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import {
  addPaysureCheckoutUrl,
  buildPaysureIntent,
  createUniquePaysureReference,
  validateContributionForEvent,
} from "@/lib/payments/paysure-event-payments";
import { isPaysureConfigured } from "@/lib/payments/paysure";
import type { ContributionData } from "@/lib/data/repo-types";
import type { GiftEvent } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!isPaysureConfigured()) throw new HttpError(503, "Paysure is not configured yet.");
    const { slug } = await ctx.params;
    const data = (await req.json()) as ContributionData & { email?: string; phone?: string };
    const db = adminDb();
    const eventSnap = await db.collection("events").doc(slug).get();
    const event = eventSnap.data() as GiftEvent | undefined;
    if (!event) throw new HttpError(404, "Event not found");
    validateContributionForEvent(event, data);

    const reference = await createUniquePaysureReference();
    const origin = new URL(req.url).origin;
    const baseIntent = buildPaysureIntent(event, slug, reference, data);
    const authorizationUrl = addPaysureCheckoutUrl(baseIntent, { email: data.email, phone: data.phone, origin });

    await db.collection("payment_intents").doc(reference).set({
      ...baseIntent,
      status: "pending",
      authorizationUrl,
    });

    return NextResponse.json({
      provider: "paysure",
      reference,
      authorizationUrl,
      amount: baseIntent.totalChargeAmount,
      currency: baseIntent.currency,
    });
  } catch (e) {
    return fail(e);
  }
}
