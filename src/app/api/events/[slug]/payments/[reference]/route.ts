import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { BankTransferPaymentIntent } from "@/lib/payments/bank-transfer";
import type { PaystackEventPaymentIntent } from "@/lib/payments/event-payments";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; reference: string }> }) {
  try {
    const { slug, reference } = await ctx.params;
    const snap = await adminDb().collection("payment_intents").doc(reference.toUpperCase()).get();
    const intent = snap.data() as (BankTransferPaymentIntent | PaystackEventPaymentIntent | undefined);
    if (!intent || intent.eventSlug !== slug) throw new HttpError(404, "Payment reference not found");
    if ("provider" in intent && intent.provider === "paystack") {
      return NextResponse.json({
        provider: "paystack",
        reference: intent.reference,
        status: intent.status,
        expectedAmount: intent.expectedAmount,
        serviceFee: intent.serviceFee,
        totalChargeAmount: intent.totalChargeAmount,
        currency: intent.currency,
        confirmedAt: intent.confirmedAt,
        providerStatus: intent.providerStatus,
      });
    }
    const bankIntent = intent as BankTransferPaymentIntent;
    return NextResponse.json({
      reference: bankIntent.reference,
      status: bankIntent.status,
      expectedAmount: bankIntent.expectedAmount,
      serviceFee: bankIntent.serviceFee,
      totalTransferAmount: bankIntent.totalTransferAmount,
      currency: bankIntent.currency,
      reviewReason: bankIntent.reviewReason,
      confirmedAt: bankIntent.confirmedAt,
      expiresAt: bankIntent.expiresAt,
    });
  } catch (e) {
    return fail(e);
  }
}
