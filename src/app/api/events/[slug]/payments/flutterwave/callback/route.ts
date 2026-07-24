import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/api/origin";
import { confirmFlutterwaveEventPayment } from "@/lib/payments/flutterwave-event-payments";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const reference = (url.searchParams.get("tx_ref") || url.searchParams.get("reference") || "").toUpperCase();
  const transactionId = url.searchParams.get("transaction_id") || undefined;
  const status = url.searchParams.get("status") || "";
  const destination = new URL(`/party/${slug}`, publicOrigin(req));

  if (!reference) {
    destination.searchParams.set("payment", "missing-reference");
    return NextResponse.redirect(destination);
  }

  try {
    if (status && status !== "successful" && status !== "completed") {
      throw new Error(`Flutterwave returned ${status}.`);
    }
    await confirmFlutterwaveEventPayment(reference, { transactionId });
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("provider", "flutterwave");
    destination.searchParams.set("reference", reference);
  } catch (error) {
    destination.searchParams.set("payment", "failed");
    destination.searchParams.set("provider", "flutterwave");
    destination.searchParams.set("reference", reference);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    destination.searchParams.set("reason", message.slice(0, 120));
  }
  return NextResponse.redirect(destination);
}
