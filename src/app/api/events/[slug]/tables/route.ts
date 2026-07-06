import { NextResponse } from "next/server";
import { assignGuestToTable } from "@/lib/data/d1-events";
import { fail } from "@/lib/api/handle";

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const result = await assignGuestToTable(slug, await req.json());
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
