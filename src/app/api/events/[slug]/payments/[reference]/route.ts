import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { BankTransferPaymentIntent } from "@/lib/payments/bank-transfer";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; reference: string }> }) {
  try {
    const { slug, reference } = await ctx.params;
    const snap = await adminDb().collection("payment_intents").doc(reference.toUpperCase()).get();
    const intent = snap.data() as BankTransferPaymentIntent | undefined;
    if (!intent || intent.eventSlug !== slug) throw new HttpError(404, "Payment reference not found");
    return NextResponse.json({
      reference: intent.reference,
      status: intent.status,
      expectedAmount: intent.expectedAmount,
      serviceFee: intent.serviceFee,
      totalTransferAmount: intent.totalTransferAmount,
      currency: intent.currency,
      reviewReason: intent.reviewReason,
      confirmedAt: intent.confirmedAt,
      expiresAt: intent.expiresAt,
    });
  } catch (e) {
    return fail(e);
  }
}
