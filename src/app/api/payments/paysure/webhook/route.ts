import { NextResponse } from "next/server";
import { confirmPaysureEventPayment } from "@/lib/payments/paysure-event-payments";
import { verifyPaysureCheckoutTransaction } from "@/lib/payments/paysure";

interface PaysureCheckoutWebhookPayload {
  amount?: string | number;
  narrations?: string;
  payingBank?: string;
  senderName?: string;
  sessionId?: string;
  channel?: string;
  transactionDate?: string;
  ref?: string;
  transactionType?: string;
}

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) as PaysureCheckoutWebhookPayload;
  const reference = String(payload.ref || payload.sessionId || "").toUpperCase();
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  // Paysure checkout webhook docs do not specify a signature header. We treat the
  // webhook as a signal only, then verify server-to-server before crediting an event.
  const verified = await verifyPaysureCheckoutTransaction(reference);
  await confirmPaysureEventPayment(reference, verified);
  return NextResponse.json({ received: true });
}
