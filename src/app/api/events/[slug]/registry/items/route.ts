import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { createRegistryItem, type RegistryItemInput } from "@/lib/registry/server";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const input = (await req.json()) as RegistryItemInput;
    return NextResponse.json(await createRegistryItem(req, slug, input), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
