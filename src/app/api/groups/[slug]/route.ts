import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { groupGiftViewForRequest } from "@/lib/groups/access";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(await groupGiftViewForRequest(req, slug));
  } catch (error) {
    return fail(error);
  }
}
