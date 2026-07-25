import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireUid } from "@/lib/data/server-store";
import {
  getAlbumConfig,
  listAlbumPhotos,
  publicAlbumPayload,
  requireAlbumEvent,
  requireEventOrganizer,
  saveAlbumConfig,
} from "@/lib/albums/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    const [config, photos] = await Promise.all([
      getAlbumConfig(event),
      listAlbumPhotos(event.id),
    ]);
    return NextResponse.json(publicAlbumPayload(config, photos));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await requireUid(req);
    const { slug } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    requireEventOrganizer(event, uid);
    const body = (await req.json()) as { enabled?: unknown; guestUploadsEnabled?: unknown };
    const updates: { enabled?: boolean; guestUploadsEnabled?: boolean } = {};
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.guestUploadsEnabled === "boolean") {
      updates.guestUploadsEnabled = body.guestUploadsEnabled;
    }
    const config = await saveAlbumConfig(event, updates);
    return NextResponse.json(config);
  } catch (error) {
    return fail(error);
  }
}
