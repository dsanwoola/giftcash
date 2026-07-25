import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { giftViewForRequest } from "@/lib/gifts/access";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(await giftViewForRequest(req, slug));
  } catch (error) {
    return fail(error);
  }
}
