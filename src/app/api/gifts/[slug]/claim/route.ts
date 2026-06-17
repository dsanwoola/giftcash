import { NextResponse } from "next/server";
import { claimGift, requireUid } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";

// POST /api/gifts/[slug]/claim — one-time claim, credits the caller's wallet.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    // The claimer is the authenticated user — never trust a client-supplied id.
    const uid = await requireUid(req);
    const { slug } = await ctx.params;
    const gift = await claimGift(slug, uid);
    return NextResponse.json(gift);
  } catch (e) {
    return fail(e);
  }
}
