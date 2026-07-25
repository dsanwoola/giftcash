import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireRegistryEvent, registryViewForRequest, updateRegistry } from "@/lib/registry/server";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const event = await requireRegistryEvent(slug);
    const response = NextResponse.json(await registryViewForRequest(req, event));
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "Authorization, Cookie");
    return response;
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const input = await req.json();
    return NextResponse.json(await updateRegistry(req, slug, input));
  } catch (error) {
    return fail(error);
  }
}
