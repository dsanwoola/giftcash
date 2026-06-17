import { NextResponse } from "next/server";
import { contributeToEvent } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import type { ContributionData } from "@/lib/data/repo-types";

// POST /api/events/[slug]/contribute — public (guests aren't signed in).
// Server-validates campaign rules + contribution caps before appending.
// TODO: gate on a verified payment + add rate limiting before production.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const data = (await req.json()) as ContributionData;
    const event = await contributeToEvent(slug, data);
    return NextResponse.json(event);
  } catch (e) {
    return fail(e);
  }
}
