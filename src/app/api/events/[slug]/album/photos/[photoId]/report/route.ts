import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import { getAlbumPhoto, requireAlbumEvent } from "@/lib/albums/server";

export const dynamic = "force-dynamic";

const REASONS = new Set(["inappropriate", "privacy", "copyright", "other"]);

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; photoId: string }> }) {
  try {
    const { slug, photoId } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    const photo = await getAlbumPhoto(photoId);
    if (photo.eventId !== event.id || photo.status !== "approved") {
      throw new HttpError(404, "Photo not found in this Gift Party");
    }
    const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
    const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : "other";
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const reportId = createHash("sha256").update(`${photo.id}:${forwarded}:${day}`).digest("hex");
    const ref = adminDb().collection("album_photo_reports").doc(reportId);
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({
        id: reportId,
        eventId: event.id,
        photoId: photo.id,
        reason,
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
    return NextResponse.json({ reported: true });
  } catch (error) {
    return fail(error);
  }
}
