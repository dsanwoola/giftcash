import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, optionalUid, requireUid } from "@/lib/data/server-store";
import type {
  AdminGiftParty,
  GiftEvent,
  GiftPartyView,
  OrganizerGiftParty,
  PublicGiftParty,
  UserProfile,
} from "@/lib/types";

export async function eventBySlug(slug: string): Promise<GiftEvent> {
  const snap = await adminDb().collection<GiftEvent>("events").doc(slug).get();
  const event = snap.data();
  if (!event) throw new HttpError(404, "Gift Party not found");
  return event;
}

export async function requireEventOrganizer(req: Request, slug: string): Promise<GiftEvent> {
  const uid = await requireUid(req);
  const event = await eventBySlug(slug);
  if (event.organizerId !== uid) throw new HttpError(403, "Only the Gift Party organizer can access this resource.");
  return event;
}

export function publicGiftParty(event: GiftEvent): PublicGiftParty {
  return {
    viewerRole: "public",
    slug: event.slug,
    type: event.type,
    title: event.title,
    celebrants: event.celebrants,
    date: event.date,
    gradient: event.gradient,
    currency: event.currency,
    campaignMode: event.campaignMode,
    maxContribution: event.maxContribution,
    isPublic: true,
    contributionCount: event.contributions.length,
  };
}

export function organizerGiftParty(event: GiftEvent): OrganizerGiftParty {
  return {
    ...event,
    viewerRole: "organizer",
    contributionCount: event.contributions.length,
    contributionTotal: event.contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  };
}

export function adminGiftParty(event: GiftEvent): AdminGiftParty {
  return {
    ...event,
    viewerRole: "admin",
    contributionCount: event.contributions.length,
    contributionTotal: event.contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  };
}

export async function eventViewForRequest(req: Request, slug: string): Promise<GiftPartyView> {
  const [uid, event] = await Promise.all([optionalUid(req), eventBySlug(slug)]);
  if (uid && uid === event.organizerId) return organizerGiftParty(event);
  if (uid) {
    const profile = await adminDb().collection<UserProfile>("profiles").doc(uid).get();
    if (profile.data()?.role === "admin") return adminGiftParty(event);
  }
  if (event.isPublic === false) throw new HttpError(404, "Gift Party not found");
  return publicGiftParty(event);
}

export function requirePublicGiftParty(event: GiftEvent): GiftEvent {
  if (event.isPublic === false) throw new HttpError(404, "Gift Party not found");
  return event;
}
