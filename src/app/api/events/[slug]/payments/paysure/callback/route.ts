import { NextResponse } from "next/server";
import { confirmPaysureEventPayment } from "@/lib/payments/paysure-event-payments";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const reference = (url.searchParams.get("reference") || url.searchParams.get("ref") || url.searchParams.get("trxref") || "").toUpperCase();
  const destination = new URL(`/event/${slug}`, url.origin);

  if (!reference) {
    destination.searchParams.set("payment", "missing-reference");
    return NextResponse.redirect(destination);
  }

  try {
    await confirmPaysureEventPayment(reference);
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("provider", "paysure");
    destination.searchParams.set("reference", reference);
  } catch (error) {
    destination.searchParams.set("payment", "failed");
    destination.searchParams.set("provider", "paysure");
    destination.searchParams.set("reference", reference);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    destination.searchParams.set("reason", message.slice(0, 120));
  }
  return NextResponse.redirect(destination);
}
