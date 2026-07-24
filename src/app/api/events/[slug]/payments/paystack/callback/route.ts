import { NextResponse } from "next/server";
import { confirmPaystackEventPayment } from "@/lib/payments/event-payments";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const reference = (url.searchParams.get("reference") || url.searchParams.get("trxref") || "").toUpperCase();
  const destination = new URL(`/party/${slug}`, url.origin);

  if (!reference) {
    destination.searchParams.set("payment", "missing-reference");
    return NextResponse.redirect(destination);
  }

  try {
    await confirmPaystackEventPayment(reference);
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("reference", reference);
  } catch (error) {
    destination.searchParams.set("payment", "failed");
    destination.searchParams.set("reference", reference);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    destination.searchParams.set("reason", message.slice(0, 120));
  }
  return NextResponse.redirect(destination);
}
