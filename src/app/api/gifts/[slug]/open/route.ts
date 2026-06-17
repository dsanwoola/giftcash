import { NextResponse } from "next/server";
import { openGift, requireUid } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";

// POST /api/gifts/[slug]/open — mark a gift as opened.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await requireUid(req);
    const { slug } = await ctx.params;
    await openGift(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
