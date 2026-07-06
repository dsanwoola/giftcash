import { NextResponse } from "next/server";
import { getD1Event } from "@/lib/data/d1-events";
import { fail } from "@/lib/api/handle";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const event = await getD1Event(slug);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(event);
  } catch (e) {
    return fail(e);
  }
}
