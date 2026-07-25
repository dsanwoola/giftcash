import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { publicOrigin } from "@/lib/api/origin";
import { requireUid } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import { isFlutterwaveConfigured } from "@/lib/payments/flutterwave";
import {
  buildPersonalGiftIntent,
  createUniqueProductReference,
  initializePersonalGiftCheckout,
} from "@/lib/payments/flutterwave-product-payments";
import { HttpError } from "@/lib/data/server-store";
import type { CreateGiftInput } from "@/lib/data/repo-types";

export async function POST(req: Request) {
  try {
    if (!isFlutterwaveConfigured()) throw new HttpError(503, "Flutterwave is not configured yet.");
    const senderUid = await requireUid(req);
    const data = (await req.json()) as { gift: CreateGiftInput; email?: string; phone?: string };
    if (!data.gift) throw new HttpError(400, "Gift details are required.");
    const reference = await createUniqueProductReference();
    const intent = buildPersonalGiftIntent(senderUid, reference, data.gift);
    const intentRef = adminDb().collection("payment_intents").doc(reference);
    await intentRef.set(intent);
    const authorizationUrl = await initializePersonalGiftCheckout(intent, {
      email: data.email ?? "",
      phone: data.phone,
      origin: publicOrigin(req),
    });
    await intentRef.update({
      status: "pending",
      authorizationUrl,
    });
    return NextResponse.json({
      provider: "flutterwave",
      reference,
      authorizationUrl,
      amount: intent.totalChargeAmount,
      currency: intent.currency,
    });
  } catch (error) {
    return fail(error);
  }
}
