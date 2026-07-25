import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/data/server-store";
import { eventViewForRequest, organizerGiftParty, requireEventOrganizer } from "@/lib/events/access";
import type { EventSettings } from "@/lib/data/repo-types";
import type { SoundTheme } from "@/lib/types";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(await eventViewForRequest(req, slug));
  } catch (e) {
    return fail(e);
  }
}

const SOUND_THEMES = new Set<SoundTheme>(["fanfare", "chime", "arcade", "boom"]);

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const event = await requireEventOrganizer(req, slug);
    const body = (await req.json()) as EventSettings;
    const patch: EventSettings = {};
    if (body.showTotal !== undefined) {
      if (typeof body.showTotal !== "boolean") throw new HttpError(400, "showTotal must be a boolean.");
      patch.showTotal = body.showTotal;
    }
    if (body.soundTheme !== undefined) {
      if (!SOUND_THEMES.has(body.soundTheme)) throw new HttpError(400, "Unknown sound theme.");
      patch.soundTheme = body.soundTheme;
    }
    if (body.goalAmount !== undefined) {
      if (!Number.isInteger(body.goalAmount) || body.goalAmount < 0 || body.goalAmount > 1_000_000_000_00) {
        throw new HttpError(400, "Enter a valid goal amount.");
      }
      patch.goalAmount = body.goalAmount;
    }
    if (Object.keys(patch).length === 0) throw new HttpError(400, "No supported settings were provided.");
    await adminDb().collection("events").doc(slug).update(patch);
    return NextResponse.json(organizerGiftParty({ ...event, ...patch }));
  } catch (e) {
    return fail(e);
  }
}
