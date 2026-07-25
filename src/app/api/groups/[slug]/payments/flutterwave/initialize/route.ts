import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { publicOrigin } from "@/lib/api/origin";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import { isFlutterwaveConfigured } from "@/lib/payments/flutterwave";
import {
  buildGroupGiftIntent,
  createUniqueProductReference,
  initializeGroupGiftCheckout,
} from "@/lib/payments/flutterwave-product-payments";
import type { ContributionData } from "@/lib/data/repo-types";
import type { GroupGift } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!isFlutterwaveConfigured()) throw new HttpError(503, "Flutterwave is not configured yet.");
    const { slug } = await ctx.params;
    const data = (await req.json()) as ContributionData & { email?: string; phone?: string };
    const groupSnap = await adminDb().collection("groupGifts").doc(slug).get();
    const group = groupSnap.data() as GroupGift | undefined;
    if (!group) throw new HttpError(404, "Group gift not found");
    const reference = await createUniqueProductReference();
    const intent = buildGroupGiftIntent(group, reference, data);
    const intentRef = adminDb().collection("payment_intents").doc(reference);
    await intentRef.set(intent);
    const authorizationUrl = await initializeGroupGiftCheckout(intent, {
      email: data.email ?? "",
      phone: data.phone,
      origin: publicOrigin(req),
      groupTitle: group.title,
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
