import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/api/origin";
import { confirmFlutterwaveRegistryPayment } from "@/lib/payments/flutterwave-registry-payments";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const reference = (url.searchParams.get("tx_ref") || url.searchParams.get("reference") || "").toUpperCase();
  const transactionId = url.searchParams.get("transaction_id") || undefined;
  const status = url.searchParams.get("status") || "";
  const destination = new URL(`/party/${slug}`, publicOrigin(req));
  destination.searchParams.set("registry", "1");
  if (!reference) {
    destination.searchParams.set("registryPayment", "missing-reference");
    return NextResponse.redirect(destination);
  }
  try {
    if (status && status !== "successful" && status !== "completed") throw new Error(`Flutterwave returned ${status}.`);
    await confirmFlutterwaveRegistryPayment(reference, { transactionId, expectedEventSlug: slug });
    destination.searchParams.set("registryPayment", "success");
  } catch {
    destination.searchParams.set("registryPayment", "failed");
    destination.searchParams.set("reason", status && status !== "successful" && status !== "completed"
      ? "The payment was not completed. You can safely try again."
      : "We could not verify this payment yet. Please check again shortly or contact support.");
  }
  return NextResponse.redirect(destination);
}
