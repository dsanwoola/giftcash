import { NextResponse } from "next/server";
import { getFirebaseEvent } from "@/lib/data/firebase-events";
import { fail } from "@/lib/api/handle";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const event = await getFirebaseEvent(slug);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(event);
  } catch (e) {
    return fail(e);
  }
}
