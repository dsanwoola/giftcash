import "server-only";

import { randomUUID } from "node:crypto";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { getFirebaseEvent } from "@/lib/data/firebase-events";
import { HttpError } from "@/lib/data/server-store";
import type {
  AlbumPhase,
  EventAlbumConfig,
  EventAlbumPhoto,
  GiftEvent,
  PublicAlbumPayload,
} from "@/lib/types";

export const MAX_ALBUM_PHOTOS = 60;
export const MAX_GUEST_PENDING_PHOTOS = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_CAPTION_LENGTH = 160;
export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);


export function normalizePhase(value: unknown, fallback: AlbumPhase = "pre"): AlbumPhase {
  return value === "post" ? "post" : value === "pre" ? "pre" : fallback;
}

export function sanitizeCaption(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const caption = value.replace(/\s+/g, " ").trim();
  return caption ? caption.slice(0, MAX_CAPTION_LENGTH) : undefined;
}

export async function requireAlbumEvent(slug: string): Promise<GiftEvent> {
  const event = await getFirebaseEvent(slug);
  if (!event) throw new HttpError(404, "Gift Party not found");
  return event;
}

export function requireEventOrganizer(event: GiftEvent, uid: string) {
  if (event.organizerId !== uid) throw new HttpError(403, "Gift Party organizers only");
}

export function defaultAlbumConfig(event: GiftEvent): EventAlbumConfig {
  const now = new Date().toISOString();
  return {
    eventId: event.id,
    eventSlug: event.slug,
    enabled: true,
    guestUploadsEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAlbumConfig(event: GiftEvent): Promise<EventAlbumConfig> {
  const snap = await adminDb().collection<EventAlbumConfig>("event_albums").doc(event.id).get();
  return snap.data() ?? defaultAlbumConfig(event);
}

export async function saveAlbumConfig(event: GiftEvent, updates: Partial<EventAlbumConfig>) {
  const current = await getAlbumConfig(event);
  const config: EventAlbumConfig = {
    ...current,
    ...updates,
    eventId: event.id,
    eventSlug: event.slug,
    updatedAt: new Date().toISOString(),
  };
  await adminDb().collection<EventAlbumConfig>("event_albums").doc(event.id).set(config);
  return config;
}

export async function listAlbumPhotos(eventId: string): Promise<EventAlbumPhoto[]> {
  const snap = await adminDb()
    .collection<EventAlbumPhoto>("event_album_photos")
    .where("eventId", "==", eventId)
    .get();
  return snap.docs
    .map((doc) => doc.data())
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function getAlbumPhoto(photoId: string): Promise<EventAlbumPhoto> {
  const snap = await adminDb().collection<EventAlbumPhoto>("event_album_photos").doc(photoId).get();
  const photo = snap.data();
  if (!photo) throw new HttpError(404, "Photo not found");
  return photo;
}

export function publicAlbumPayload(config: EventAlbumConfig, photos: EventAlbumPhoto[]): PublicAlbumPayload {
  const approved = config.enabled
    ? photos.filter((photo) => photo.status === "approved").map((photo) => ({
        id: photo.id,
        phase: photo.phase,
        caption: photo.caption,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        width: photo.width,
        height: photo.height,
        sortOrder: photo.sortOrder,
        createdAt: photo.createdAt,
      }))
    : [];
  return {
    enabled: config.enabled,
    guestUploadsEnabled: config.enabled && config.guestUploadsEnabled,
    coverPhotoId: config.coverPhotoId,
    photos: approved,
  };
}

export function createDownloadToken() {
  return randomUUID();
}

export function storageDownloadUrl(path: string, token: string) {
  const bucket = adminBucket();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export async function deleteAlbumFiles(photo: Pick<EventAlbumPhoto, "imagePath" | "thumbnailPath">) {
  const bucket = adminBucket();
  await Promise.all([
    bucket.file(photo.imagePath).delete({ ignoreNotFound: true }),
    bucket.file(photo.thumbnailPath).delete({ ignoreNotFound: true }),
  ]);
}
