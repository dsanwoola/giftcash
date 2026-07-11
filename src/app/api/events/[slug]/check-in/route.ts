import { NextResponse } from "next/server";
import { checkInPass } from "@/lib/data/firebase-events";
import { fail } from "@/lib/api/handle";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const result = await checkInPass(slug, await req.json());
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
