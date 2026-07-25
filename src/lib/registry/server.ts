import "server-only";
import { randomUUID } from "node:crypto";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { HttpError, optionalUid, requireUid } from "@/lib/data/server-store";
import { createDownloadToken, storageDownloadUrl } from "@/lib/albums/server";
import type {
  GiftEvent,
  GiftRegistry,
  PrivateRegistryItem,
  RegistryContribution,
  RegistryFundingMode,
  RegistryItem,
  RegistryPayload,
  UserProfile,
} from "@/lib/types";

export interface RegistryReservation {
  id: string;
  reference: string;
  eventSlug: string;
  itemId: string;
  amount: number;
  quantity: number;
  clientKey?: string;
  status: "pending" | "confirmed" | "failed";
  expiresAt: string;
  createdAt: string;
}

export interface RegistryItemInput {
  name: string;
  description?: string;
  retailerReferenceUrl?: string;
  privateNotes?: string;
  targetAmount: number;
  fundingMode: RegistryFundingMode;
  quantity?: number;
  priority?: RegistryItem["priority"];
}

const MAX_ITEMS = 60;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

function cleanText(value: unknown, label: string, min: number, max: number) {
  const cleaned = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (cleaned.length < min) throw new HttpError(400, `${label} is required.`);
  if (cleaned.length > max) throw new HttpError(400, `${label} is too long.`);
  return cleaned;
}

function optionalText(value: unknown, max: number) {
  const cleaned = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (cleaned.length > max) throw new HttpError(400, "Text is too long.");
  return cleaned || undefined;
}

export function privateRetailerUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  let url: URL;
  try { url = new URL(raw); } catch { throw new HttpError(400, "Enter a valid retailer reference link."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new HttpError(400, "Retailer links must use a secure HTTPS address.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "::1" || host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.startsWith("169.254.")) {
    throw new HttpError(400, "Private or local retailer links are not allowed.");
  }
  url.hash = "";
  return url.toString();
}

function validateItemInput(input: RegistryItemInput, currency: GiftEvent["currency"]) {
  void currency;
  const targetAmount = Number(input.targetAmount);
  if (!Number.isInteger(targetAmount) || targetAmount < 10_000 || targetAmount > 500_000_000) {
    throw new HttpError(400, "Gift value must be between 100 and 5,000,000 in the event currency.");
  }
  const fundingMode: RegistryFundingMode = input.fundingMode === "group" ? "group" : "full";
  const quantity = fundingMode === "group" ? 1 : Math.max(1, Math.min(20, Math.floor(Number(input.quantity) || 1)));
  const priorities = new Set<RegistryItem["priority"]>(["most_wanted", "would_love", "nice_to_have"]);
  return {
    name: cleanText(input.name, "Gift name", 2, 100),
    description: optionalText(input.description, 500),
    retailerReferenceUrl: privateRetailerUrl(input.retailerReferenceUrl),
    privateNotes: optionalText(input.privateNotes, 500),
    targetAmount,
    fundingMode,
    quantity,
    priority: priorities.has(input.priority as RegistryItem["priority"]) ? input.priority! : "would_love" as const,
  };
}

export async function requireRegistryEvent(slug: string) {
  const snap = await adminDb().collection<GiftEvent>("events").doc(slug).get();
  const event = snap.data();
  if (!event) throw new HttpError(404, "Gift Party not found");
  return event;
}

async function registryRole(req: Request, event: GiftEvent): Promise<"public" | "organizer" | "admin"> {
  const uid = await optionalUid(req);
  if (!uid) return "public";
  if (uid === event.organizerId) return "organizer";
  const profile = await adminDb().collection<UserProfile>("profiles").doc(uid).get();
  return profile.data()?.role === "admin" ? "admin" : "public";
}

export async function requireRegistryOrganizer(req: Request, slug: string) {
  const [uid, event] = await Promise.all([requireUid(req), requireRegistryEvent(slug)]);
  if (event.organizerId !== uid) throw new HttpError(403, "Gift Party organizers only");
  return { uid, event };
}

export async function getOrCreateRegistry(event: GiftEvent): Promise<GiftRegistry> {
  const ref = adminDb().collection<GiftRegistry>("event_registries").doc(event.id);
  const snap = await ref.get();
  if (snap.data()) return snap.data()!;
  const now = new Date().toISOString();
  const registry: GiftRegistry = { id: event.id, eventId: event.id, eventSlug: event.slug, organizerId: event.organizerId, enabled: false, createdAt: now, updatedAt: now };
  await ref.set(registry);
  return registry;
}

async function registryData(event: GiftEvent, includeContributions: boolean) {
  const db = adminDb();
  const contributionsPromise = includeContributions
    ? db.collection<RegistryContribution>("registry_contributions").where("eventSlug", "==", event.slug).get()
    : Promise.resolve(undefined);
  const [itemsSnap, contributionsSnap, reservationsSnap] = await Promise.all([
    db.collection<RegistryItem>("event_registry_items").where("eventSlug", "==", event.slug).get(),
    contributionsPromise,
    db.collection<RegistryReservation>("registry_reservations").where("eventSlug", "==", event.slug).get(),
  ]);
  const now = Date.now();
  const reservations = reservationsSnap.docs.map((doc) => doc.data()).filter((reservation) => reservation.status === "pending" && new Date(reservation.expiresAt).getTime() > now);
  const contributions = contributionsSnap?.docs.map((doc) => doc.data()) ?? [];
  const items = itemsSnap.docs.map((doc) => doc.data()).sort((a, b) => a.sortOrder - b.sortOrder || +new Date(a.createdAt) - +new Date(b.createdAt));
  return { items, contributions, reservations };
}

export async function registryViewForRequest(req: Request, event: GiftEvent): Promise<RegistryPayload> {
  const role = await registryRole(req, event);
  const registry = (await adminDb().collection<GiftRegistry>("event_registries").doc(event.id).get()).data();
  if (!registry) {
    return role === "public"
      ? { viewerRole: "public", enabled: false, items: [] }
      : { viewerRole: role, enabled: false, items: [], contributionTotal: 0 };
  }
  const enabled = registry.enabled;
  if (role === "public") {
    if (!event.isPublic || !enabled) return { viewerRole: "public", enabled: false, items: [] };
    const { items, reservations } = await registryData(event, false);
    return {
      viewerRole: "public",
      enabled: true,
      introduction: registry?.introduction,
      items: items.filter((item) => item.status === "active").map((item) => {
        const itemReservations = reservations.filter((reservation) => reservation.itemId === item.id);
        const targetTotal = item.targetAmount * item.quantity;
        const gifted = item.fundedAmount >= targetTotal;
        const availableQuantity = Math.max(0, item.quantity - item.fundedQuantity - itemReservations.reduce((sum, reservation) => sum + reservation.quantity, 0));
        const reserved = !gifted && item.fundingMode === "full" && availableQuantity === 0;
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          currency: item.currency,
          fundingMode: item.fundingMode,
          priority: item.priority,
          publicStatus: gifted ? "gifted" as const : reserved ? "reserved" as const : "available" as const,
          ...(gifted ? {} : { targetAmount: item.targetAmount, availableQuantity }),
        };
      }),
    };
  }
  const { items, contributions, reservations } = await registryData(event, true);
  const privateItems: PrivateRegistryItem[] = items.map((item) => {
    const itemReservations = reservations.filter((reservation) => reservation.itemId === item.id);
    return {
      ...item,
      contributions: contributions.filter((contribution) => contribution.itemId === item.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      activeReservationCount: itemReservations.length,
      reservedAmount: itemReservations.reduce((sum, reservation) => sum + reservation.amount, 0),
    };
  });
  return {
    viewerRole: role,
    enabled,
    introduction: registry?.introduction,
    items: privateItems,
    contributionTotal: contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  };
}

export async function updateRegistry(req: Request, slug: string, input: { enabled?: boolean; introduction?: string }) {
  const { event } = await requireRegistryOrganizer(req, slug);
  const registry = await getOrCreateRegistry(event);
  const updated: GiftRegistry = {
    ...registry,
    enabled: typeof input.enabled === "boolean" ? input.enabled : registry.enabled,
    introduction: optionalText(input.introduction, 500),
    updatedAt: new Date().toISOString(),
  };
  await adminDb().collection<GiftRegistry>("event_registries").doc(event.id).set(updated);
  return updated;
}

export async function createRegistryItem(req: Request, slug: string, input: RegistryItemInput & { initialStatus?: "active" | "hidden" }) {
  const { event } = await requireRegistryOrganizer(req, slug);
  const db = adminDb();
  const existing = await db.collection<RegistryItem>("event_registry_items").where("eventSlug", "==", slug).get();
  if (existing.docs.length >= MAX_ITEMS) throw new HttpError(409, "This registry has reached its 60-item limit.");
  const registry = await getOrCreateRegistry(event);
  const clean = validateItemInput(input, event.currency);
  const now = new Date().toISOString();
  const itemRef = db.collection<RegistryItem>("event_registry_items").doc();
  const item: RegistryItem = {
    id: itemRef.id,
    registryId: registry.id,
    eventId: event.id,
    eventSlug: event.slug,
    organizerId: event.organizerId,
    ...clean,
    currency: event.currency,
    fundedQuantity: 0,
    fundedAmount: 0,
    status: input.initialStatus === "hidden" ? "hidden" : "active",
    sortOrder: existing.docs.length * 10 + 10,
    createdAt: now,
    updatedAt: now,
  };
  await itemRef.set(item);
  return item;
}

export async function updateRegistryItem(req: Request, slug: string, itemId: string, input: Partial<RegistryItemInput> & { status?: RegistryItem["status"] }) {
  const { event } = await requireRegistryOrganizer(req, slug);
  const db = adminDb();
  const ref = db.collection<RegistryItem>("event_registry_items").doc(itemId);
  return db.runTransaction(async (tx) => {
    const [snap, reservationsSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection<RegistryReservation>("registry_reservations").where("itemId", "==", itemId)),
    ]);
    const current = snap.data();
    if (!current || current.eventSlug !== slug) throw new HttpError(404, "Registry item not found");
    const clean = validateItemInput({
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      retailerReferenceUrl: input.retailerReferenceUrl ?? current.retailerReferenceUrl,
      privateNotes: input.privateNotes ?? current.privateNotes,
      targetAmount: input.targetAmount ?? current.targetAmount,
      fundingMode: input.fundingMode ?? current.fundingMode,
      quantity: input.quantity ?? current.quantity,
      priority: input.priority ?? current.priority,
    }, event.currency);
    const financialChange = clean.targetAmount !== current.targetAmount || clean.quantity !== current.quantity || clean.fundingMode !== current.fundingMode;
    const hasActiveReservation = reservationsSnap.docs.some((doc) => {
      const reservation = doc.data();
      return reservation.status === "pending" && new Date(reservation.expiresAt).getTime() > Date.now();
    });
    if (financialChange && (current.fundedAmount > 0 || hasActiveReservation)) {
      throw new HttpError(409, "Funding details cannot change after money is received or while checkout is active.");
    }
    const status = input.status && ["active", "hidden"].includes(input.status) ? input.status : current.status;
    const updated: RegistryItem = { ...current, ...clean, status, updatedAt: new Date().toISOString() };
    tx.set(ref, updated);
    return updated;
  });
}

export async function deleteRegistryItem(req: Request, slug: string, itemId: string) {
  await requireRegistryOrganizer(req, slug);
  const db = adminDb();
  const ref = db.collection<RegistryItem>("event_registry_items").doc(itemId);
  const item = await db.runTransaction(async (tx) => {
    const [snap, reservationsSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection<RegistryReservation>("registry_reservations").where("itemId", "==", itemId)),
    ]);
    const current = snap.data();
    if (!current || current.eventSlug !== slug) throw new HttpError(404, "Registry item not found");
    const hasActiveReservation = reservationsSnap.docs.some((doc) => {
      const reservation = doc.data();
      return reservation.status === "pending" && new Date(reservation.expiresAt).getTime() > Date.now();
    });
    if (current.fundedAmount > 0 || hasActiveReservation) throw new HttpError(409, "Funded or reserved gifts cannot be deleted. Hide the item instead.");
    tx.delete(ref);
    return current;
  });
  if (item.imagePath) await adminBucket().file(item.imagePath).delete({ ignoreNotFound: true }).catch(() => undefined);
}

export async function uploadRegistryItemImage(req: Request, slug: string, itemId: string) {
  await requireRegistryOrganizer(req, slug);
  const ref = adminDb().collection<RegistryItem>("event_registry_items").doc(itemId);
  const snap = await ref.get();
  const item = snap.data();
  if (!item || item.eventSlug !== slug) throw new HttpError(404, "Registry item not found");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a gift photo.");
  if (!IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Use a JPEG, PNG, WebP, AVIF, HEIC, or HEIF photo.");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Gift photos must be 10 MB or smaller.");
  let image: Buffer;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "warning", limitInputPixels: 30_000_000 })
      .rotate().resize({ width: 1000, height: 1000, fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
  } catch { throw new HttpError(415, "This file could not be processed as a safe photo."); }
  const imagePath = `event-registries/${item.eventId}/${item.id}-${randomUUID()}.webp`;
  const token = createDownloadToken();
  await adminBucket().file(imagePath).save(image, {
    resumable: false,
    validation: "crc32c",
    metadata: { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable", metadata: { firebaseStorageDownloadTokens: token } },
  });
  const imageUrl = storageDownloadUrl(imagePath, token);
  await ref.update({ imagePath, imageUrl, updatedAt: new Date().toISOString() });
  if (item.imagePath) await adminBucket().file(item.imagePath).delete({ ignoreNotFound: true }).catch(() => undefined);
  return { imageUrl };
}

export const registryContributionId = () => `reg_${nanoid(12)}`;
