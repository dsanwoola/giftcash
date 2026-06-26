import { NextResponse } from "next/server";
import { confirmPaystackEventPayment } from "@/lib/payments/event-payments";
import { verifyPaystackSignature } from "@/lib/payments/paystack";

interface PaystackWebhookPayload {
  event?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    channel?: string;
    gateway_response?: string;
    customer?: { email?: string };
    metadata?: Record<string, unknown>;
  };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as PaystackWebhookPayload;
  if (payload.event === "charge.success" && payload.data?.reference) {
    await confirmPaystackEventPayment(payload.data.reference.toUpperCase(), {
      status: payload.data.status ?? "success",
      reference: payload.data.reference.toUpperCase(),
      amount: payload.data.amount ?? 0,
      currency: payload.data.currency ?? "NGN",
      paidAt: payload.data.paid_at,
      channel: payload.data.channel,
      gatewayResponse: payload.data.gateway_response,
      customer: payload.data.customer,
      metadata: payload.data.metadata,
    });
  }

  return NextResponse.json({ received: true });
}
