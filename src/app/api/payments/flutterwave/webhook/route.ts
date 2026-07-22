import { NextResponse } from "next/server";
import { confirmFlutterwaveEventPayment } from "@/lib/payments/flutterwave-event-payments";
import { verifyFlutterwaveSignature } from "@/lib/payments/flutterwave";

interface FlutterwaveWebhookPayload {
  event?: string;
  type?: string;
  data?: {
    id?: string | number;
    status?: string;
    tx_ref?: string;
    reference?: string;
    amount?: string | number;
    currency?: string;
    created_at?: string;
    created_datetime?: string | number;
    payment_type?: string;
    processor_response?: string;
    customer?: { email?: string; name?: string; phone_number?: string };
    meta?: Record<string, unknown>;
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "flutterwave",
    endpoint: "/api/payments/flutterwave/webhook",
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyFlutterwaveSignature(raw, req.headers.get("flutterwave-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as FlutterwaveWebhookPayload;
  const eventName = payload.event || payload.type || "";
  const reference = String(payload.data?.tx_ref || payload.data?.reference || "").toUpperCase();
  const transactionId = payload.data?.id;

  if ((eventName === "charge.completed" || eventName === "charge.successful" || eventName === "charge.success") && reference) {
    await confirmFlutterwaveEventPayment(reference, { transactionId });
  }

  return NextResponse.json({ received: true });
}
