import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireUid, HttpError } from "@/lib/data/server-store";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import type { EventAlbumPhoto } from "@/lib/types";
import {
  createDownloadToken,
  deleteAlbumFiles,
  getAlbumConfig,
  getAlbumPhoto,
  normalizePhase,
  requireAlbumEvent,
  requireEventOrganizer,
  sanitizeCaption,
  saveAlbumConfig,
  storageDownloadUrl,
} from "@/lib/albums/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string; photoId: string }> };

export async function PATCH(req: Request, ctx: Context) {
  try {
    const uid = await requireUid(req);
    const { slug, photoId } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    requireEventOrganizer(event, uid);
    const photo = await getAlbumPhoto(photoId);
    if (photo.eventId !== event.id) throw new HttpError(404, "Photo not found in this Gift Party");
    const body = (await req.json()) as {
      action?: unknown;
      phase?: unknown;
      caption?: unknown;
      sortOrder?: unknown;
    };
    let promotedPaths: { imagePath: string; thumbnailPath: string } | undefined;

    if (body.action === "reject") {
      await deleteAlbumFiles(photo);
      await adminDb().collection<EventAlbumPhoto>("event_album_photos").doc(photo.id).delete();
      return NextResponse.json({ deleted: true });
    }

    const updates: Partial<EventAlbumPhoto> = {};
    if (body.action === "approve" && photo.status === "pending") {
      const bucket = adminBucket();
      const imagePath = `event-albums/approved/${event.id}/${photo.id}.webp`;
      const thumbnailPath = `event-albums/approved/${event.id}/${photo.id}-thumb.webp`;
      const imageToken = createDownloadToken();
      const thumbnailToken = createDownloadToken();
      await bucket.file(photo.imagePath).copy(bucket.file(imagePath));
      await bucket.file(photo.thumbnailPath).copy(bucket.file(thumbnailPath));
      await Promise.all([
        bucket.file(imagePath).setMetadata({ metadata: { firebaseStorageDownloadTokens: imageToken } }),
        bucket.file(thumbnailPath).setMetadata({ metadata: { firebaseStorageDownloadTokens: thumbnailToken } }),
      ]);
      promotedPaths = { imagePath, thumbnailPath };
      const approvedAt = new Date().toISOString();
      Object.assign(updates, {
        status: "approved",
        imagePath,
        thumbnailPath,
        imageUrl: storageDownloadUrl(imagePath, imageToken),
        thumbnailUrl: storageDownloadUrl(thumbnailPath, thumbnailToken),
        approvedAt,
        approvedBy: uid,
      });
    }
    if (body.action === "cover") {
      if (photo.status !== "approved") throw new HttpError(409, "Approve this photo before making it the cover");
      await saveAlbumConfig(event, { coverPhotoId: photo.id });
    }
    if (body.phase !== undefined) updates.phase = normalizePhase(body.phase, photo.phase);
    if (body.caption !== undefined) updates.caption = sanitizeCaption(body.caption);
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sortOrder = Math.max(0, Math.min(100_000, Math.round(body.sortOrder)));
    }
    if (Object.keys(updates).length) {
      try {
        await adminDb().collection<EventAlbumPhoto>("event_album_photos").doc(photo.id).update(updates);
      } catch (error) {
        if (promotedPaths) await deleteAlbumFiles(promotedPaths);
        throw error;
      }
    }
    if (promotedPaths) await deleteAlbumFiles(photo);
    const refreshed = await getAlbumPhoto(photo.id);
    return NextResponse.json({ photo: refreshed, config: await getAlbumConfig(event) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, ctx: Context) {
  try {
    const uid = await requireUid(req);
    const { slug, photoId } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    const photo = await getAlbumPhoto(photoId);
    if (photo.eventId !== event.id) throw new HttpError(404, "Photo not found in this Gift Party");
    const canDelete = event.organizerId === uid || (photo.uploaderId === uid && photo.status === "pending");
    if (!canDelete) throw new HttpError(403, "You cannot remove this photo");
    await deleteAlbumFiles(photo);
    await adminDb().collection<EventAlbumPhoto>("event_album_photos").doc(photo.id).delete();
    const config = await getAlbumConfig(event);
    if (config.coverPhotoId === photo.id) await saveAlbumConfig(event, { coverPhotoId: undefined });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
