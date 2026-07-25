import "server-only";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { HttpError, optionalUid } from "@/lib/data/server-store";
import type { Gift, GiftView, PublicGift } from "@/lib/types";

export function publicGift(gift: Gift): PublicGift {
  return {
    viewerRole: "public",
    id: gift.id,
    slug: gift.slug,
    senderName: gift.anonymous ? "Anonymous" : gift.senderName,
    anonymous: gift.anonymous,
    occasion: gift.occasion,
    theme: gift.theme,
    recipientName: gift.recipientName,
    recipientNickname: gift.recipientNickname,
    amount: gift.mystery && !gift.openedAt ? 0 : gift.amount,
    currency: gift.currency,
    addOns: gift.addOns,
    message: gift.message,
    media: gift.media,
    scheduledAt: gift.scheduledAt,
    revealGate: gift.revealGate,
    revealQuestion: gift.revealQuestion,
    mystery: gift.mystery,
    privateGift: gift.privateGift,
    status: gift.status,
    claimStatus: gift.claimStatus,
    createdAt: gift.createdAt,
    expiresAt: gift.expiresAt,
    openedAt: gift.openedAt,
    claimedAt: gift.claimedAt,
    thankYou: gift.thankYou,
  };
}

async function recipientIdentityMatches(gift: Gift, uid: string): Promise<boolean> {
  if (gift.claimedByUserId === uid) return true;
  const user = await adminAuth().getUser(uid);
  const email = user.email?.trim().toLowerCase();
  const phone = user.phoneNumber?.replace(/\D/g, "").slice(-10);
  const expectedEmail = gift.recipientEmail?.trim().toLowerCase();
  const expectedPhone = gift.recipientPhone?.replace(/\D/g, "").slice(-10);
  return Boolean(
    (expectedEmail && expectedEmail === email)
    || (expectedPhone && expectedPhone === phone),
  );
}

export async function requirePrivateGiftRecipient(req: Request, slug: string): Promise<Gift> {
  const snap = await adminDb().collection<Gift>("gifts").doc(slug).get();
  const gift = snap.data();
  if (!gift) throw new HttpError(404, "Gift not found");
  if (!gift.privateGift) return gift;
  const uid = await optionalUid(req);
  if (!uid) throw new HttpError(401, "Recipient sign-in is required for this private gift.");
  if (!(await recipientIdentityMatches(gift, uid))) {
    throw new HttpError(403, "Sign in with the intended recipient's email or phone number.");
  }
  return gift;
}

export async function giftViewForRequest(req: Request, slug: string): Promise<GiftView> {
  const [uid, snap] = await Promise.all([
    optionalUid(req),
    adminDb().collection<Gift>("gifts").doc(slug).get(),
  ]);
  const gift = snap.data();
  if (!gift) throw new HttpError(404, "Gift not found");
  if (uid === gift.senderId) return { ...gift, viewerRole: "sender" };
  if (gift.privateGift) {
    if (!uid) throw new HttpError(401, "Recipient sign-in is required for this private gift.");
    if (!(await recipientIdentityMatches(gift, uid))) {
      throw new HttpError(403, "Sign in with the intended recipient's email or phone number.");
    }
  }
  return publicGift(gift);
}
