import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requestKycReview, requireUid } from "@/lib/data/server-store";

// POST /api/profile/kyc/request — signed-in user requests KYC review.
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const profile = await requestKycReview(uid);
    return NextResponse.json(profile);
  } catch (e) {
    return fail(e);
  }
}
