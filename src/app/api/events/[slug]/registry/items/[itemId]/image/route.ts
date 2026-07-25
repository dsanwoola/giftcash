import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { uploadRegistryItemImage } from "@/lib/registry/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    const { slug, itemId } = await ctx.params;
    return NextResponse.json(await uploadRegistryItemImage(req, slug, itemId));
  } catch (error) {
    return fail(error);
  }
}
