import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { BankTransferPaymentIntent } from "@/lib/payments/bank-transfer";
import type { PaystackEventPaymentIntent } from "@/lib/payments/event-payments";
import type { PaysureEventPaymentIntent } from "@/lib/payments/paysure-event-payments";
import type { FlutterwaveEventPaymentIntent } from "@/lib/payments/flutterwave-event-payments";

type EventIntent = BankTransferPaymentIntent | PaystackEventPaymentIntent | PaysureEventPaymentIntent | FlutterwaveEventPaymentIntent;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; reference: string }> }) {
  try {
    const { slug, reference } = await ctx.params;
    const safeReference = reference.toUpperCase();
    const snap = await adminDb().collection("payment_intents").doc(safeReference).get();
    const intent = snap.data() as EventIntent | undefined;
    if (!intent || intent.eventSlug !== slug || "totalTransferAmount" in intent) {
      throw new HttpError(404, "Payment reference not found");
    }
    return NextResponse.json({
      reference: safeReference,
      status: intent.status,
      confirmedAt: intent.confirmedAt,
    });
  } catch (error) {
    return fail(error);
  }
}
