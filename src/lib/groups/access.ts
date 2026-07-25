import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, optionalUid } from "@/lib/data/server-store";
import type { GroupGift, GroupGiftView, PublicContribution, PublicGroupGift } from "@/lib/types";

function publicContribution(contribution: GroupGift["contributions"][number]): PublicContribution {
  return {
    id: contribution.id,
    name: contribution.anonymous ? "Anonymous" : contribution.name,
    anonymous: contribution.anonymous,
    amount: contribution.amount,
    message: contribution.message,
    createdAt: contribution.createdAt,
  };
}

export function publicGroupGift(group: GroupGift): PublicGroupGift {
  return {
    viewerRole: "public",
    id: group.id,
    slug: group.slug,
    organizerName: group.organizerName,
    occasion: group.occasion,
    theme: group.theme,
    recipientName: group.recipientName,
    title: group.title,
    story: group.story,
    targetAmount: group.targetAmount,
    currency: group.currency,
    deadline: group.deadline,
    contributions: group.contributions.map(publicContribution),
    status: group.status,
    createdAt: group.createdAt,
  };
}

export async function groupGiftViewForRequest(req: Request, slug: string): Promise<GroupGiftView> {
  const [uid, snap] = await Promise.all([
    optionalUid(req),
    adminDb().collection<GroupGift>("groupGifts").doc(slug).get(),
  ]);
  const group = snap.data();
  if (!group) throw new HttpError(404, "Group gift not found");
  if (uid === group.organizerId) return { ...group, viewerRole: "organizer" };
  return publicGroupGift(group);
}
