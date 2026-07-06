import { NextResponse } from "next/server";
import { rsvpToEvent } from "@/lib/data/d1-events";
import { fail } from "@/lib/api/handle";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const result = await rsvpToEvent(slug, await req.json());
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
