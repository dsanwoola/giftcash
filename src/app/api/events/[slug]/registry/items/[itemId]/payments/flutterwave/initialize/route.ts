import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { publicOrigin } from "@/lib/api/origin";
import { HttpError } from "@/lib/data/server-store";
import { isFlutterwaveConfigured } from "@/lib/payments/flutterwave";
import { createRegistryCheckout } from "@/lib/payments/flutterwave-registry-payments";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    if (!isFlutterwaveConfigured()) throw new HttpError(503, "Flutterwave is not configured yet.");
    const { slug, itemId } = await ctx.params;
    const input = await req.json();
    return NextResponse.json(await createRegistryCheckout(slug, itemId, input, publicOrigin(req)));
  } catch (error) {
    return fail(error);
  }
}
