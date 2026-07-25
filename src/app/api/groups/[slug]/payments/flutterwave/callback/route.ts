import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/api/origin";
import { confirmFlutterwavePayment } from "@/lib/payments/flutterwave-product-payments";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const reference = (url.searchParams.get("tx_ref") || url.searchParams.get("reference") || "").toUpperCase();
  const transactionId = url.searchParams.get("transaction_id") || undefined;
  const status = url.searchParams.get("status") || "";
  const destination = new URL(`/group/${slug}`, publicOrigin(req));

  try {
    if (!reference) throw new Error("Missing payment reference.");
    if (status && status !== "successful" && status !== "completed") throw new Error(`Flutterwave returned ${status}.`);
    await confirmFlutterwavePayment(reference, { transactionId });
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("reference", reference);
  } catch (error) {
    destination.searchParams.set("payment", "failed");
    destination.searchParams.set("reference", reference);
    destination.searchParams.set("reason", (error instanceof Error ? error.message : "Payment verification failed").slice(0, 120));
  }
  return NextResponse.redirect(destination);
}
