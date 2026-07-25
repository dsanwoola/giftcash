import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { fail } from "@/lib/api/handle";
import { requireUid } from "@/lib/data/server-store";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import type { EventAlbumPhoto, UserProfile } from "@/lib/types";
import {
  ACCEPTED_IMAGE_TYPES,
  createDownloadToken,
  getAlbumConfig,
  listAlbumPhotos,
  MAX_ALBUM_PHOTOS,
  MAX_GUEST_PENDING_PHOTOS,
  MAX_IMAGE_BYTES,
  normalizePhase,
  requireAlbumEvent,
  sanitizeCaption,
  saveAlbumConfig,
  storageDownloadUrl,
} from "@/lib/albums/server";
import { HttpError } from "@/lib/data/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await requireUid(req);
    const { slug } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    if (event.organizerId !== uid) throw new HttpError(403, "Gift Party organizers only");
    const [config, photos] = await Promise.all([
      getAlbumConfig(event),
      listAlbumPhotos(event.id),
    ]);
    return NextResponse.json({ config, photos });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  let storedPaths: string[] = [];
  try {
    const uid = await requireUid(req);
    const { slug } = await ctx.params;
    const event = await requireAlbumEvent(slug);
    const config = await getAlbumConfig(event);
    const isOrganizer = event.organizerId === uid;
    if (!isOrganizer && (!config.enabled || !config.guestUploadsEnabled)) {
      throw new HttpError(403, "Photo contributions are not enabled for this Gift Party");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose a photo to upload");
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Use a JPEG, PNG, WebP, AVIF, HEIC, or HEIF photo");
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Photos must be 10 MB or smaller");

    const photos = await listAlbumPhotos(event.id);
    const activePhotos = photos.filter((photo) => photo.status !== "rejected");
    if (activePhotos.length >= MAX_ALBUM_PHOTOS) throw new HttpError(409, "This album has reached its 60-photo limit");
    if (!isOrganizer) {
      const pendingByUser = photos.filter((photo) => photo.uploaderId === uid && photo.status === "pending").length;
      if (pendingByUser >= MAX_GUEST_PENDING_PHOTOS) throw new HttpError(409, "You already have five photos awaiting approval");
    }

    const input = Buffer.from(await file.arrayBuffer());
    let full: { data: Buffer; info: OutputInfo };
    let thumbnail: Buffer;
    try {
      const source = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 }).rotate();
      full = await source
        .clone()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      thumbnail = await source
        .clone()
        .resize({ width: 480, height: 480, fit: "cover", position: "attention" })
        .webp({ quality: 76 })
        .toBuffer();
    } catch {
      throw new HttpError(415, "This file could not be processed as a safe photo");
    }

    const photoId = randomUUID();
    const status = isOrganizer ? "approved" : "pending";
    const folder = status === "approved" ? "approved" : "pending";
    const imagePath = `event-albums/${folder}/${event.id}/${photoId}.webp`;
    const thumbnailPath = `event-albums/${folder}/${event.id}/${photoId}-thumb.webp`;
    const imageToken = createDownloadToken();
    const thumbnailToken = createDownloadToken();
    const bucket = adminBucket();
    const cacheControl = "public,max-age=31536000,immutable";
    await bucket.file(imagePath).save(full.data, {
      resumable: false,
      validation: "crc32c",
      metadata: { contentType: "image/webp", cacheControl, metadata: { firebaseStorageDownloadTokens: imageToken } },
    });
    storedPaths.push(imagePath);
    await bucket.file(thumbnailPath).save(thumbnail, {
      resumable: false,
      validation: "crc32c",
      metadata: { contentType: "image/webp", cacheControl, metadata: { firebaseStorageDownloadTokens: thumbnailToken } },
    });
    storedPaths.push(thumbnailPath);

    const profile = await adminDb().collection<UserProfile>("profiles").doc(uid).get();
    const createdAt = new Date().toISOString();
    const defaultPhase = new Date(event.date).getTime() <= Date.now() ? "post" : "pre";
    const photo: EventAlbumPhoto = {
      id: photoId,
      eventId: event.id,
      eventSlug: event.slug,
      uploaderId: uid,
      uploaderName: isOrganizer ? event.organizerName : profile.data()?.fullName || "Guest contributor",
      phase: normalizePhase(form.get("phase"), defaultPhase),
      status,
      caption: sanitizeCaption(form.get("caption")),
      imagePath,
      thumbnailPath,
      imageUrl: storageDownloadUrl(imagePath, imageToken),
      thumbnailUrl: storageDownloadUrl(thumbnailPath, thumbnailToken),
      width: full.info.width,
      height: full.info.height,
      sortOrder: activePhotos.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10,
      createdAt,
      ...(isOrganizer ? { approvedAt: createdAt, approvedBy: uid } : {}),
    };
    await adminDb().collection<EventAlbumPhoto>("event_album_photos").doc(photoId).set(photo);
    storedPaths = [];
    await saveAlbumConfig(event, { enabled: true });
    return NextResponse.json({ photo, pendingApproval: !isOrganizer }, { status: 201 });
  } catch (error) {
    if (storedPaths.length) {
      const bucket = adminBucket();
      await Promise.all(storedPaths.map((path) => bucket.file(path).delete({ ignoreNotFound: true }).catch(() => undefined)));
    }
    return fail(error);
  }
}
