import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { deleteRegistryItem, updateRegistryItem } from "@/lib/registry/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    const { slug, itemId } = await ctx.params;
    return NextResponse.json(await updateRegistryItem(req, slug, itemId, await req.json()));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    const { slug, itemId } = await ctx.params;
    await deleteRegistryItem(req, slug, itemId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
