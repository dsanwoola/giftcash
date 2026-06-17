import { NextResponse } from "next/server";
import { requireUid, saveThankYou } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import type { ThankYou } from "@/lib/types";

// POST /api/gifts/[slug]/thankyou — recipient sends a thank-you note.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await requireUid(req);
    const { slug } = await ctx.params;
    const thankYou = (await req.json()) as ThankYou;
    await saveThankYou(slug, thankYou);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
