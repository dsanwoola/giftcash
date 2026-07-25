import { NextResponse } from "next/server";
import { openGift } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import { publicGift, requirePrivateGiftRecipient } from "@/lib/gifts/access";

// POST /api/gifts/[slug]/open — mark a gift as opened.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    await requirePrivateGiftRecipient(req, slug);
    const body = await req.json().catch(() => ({})) as { answer?: unknown };
    const answer = typeof body.answer === "string" ? body.answer : undefined;
    const gift = await openGift(slug, answer);
    return NextResponse.json({ ok: true, gift: publicGift(gift) });
  } catch (e) {
    return fail(e);
  }
}
