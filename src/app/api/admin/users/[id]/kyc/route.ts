import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireAdmin, updateUserKycStatus } from "@/lib/data/server-store";
import type { UserProfile } from "@/lib/types";

// POST /api/admin/users/[id]/kyc — admin approves/rejects/updates KYC status.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUid = await requireAdmin(req);
    const { id } = await ctx.params;
    const { status } = (await req.json()) as { status: UserProfile["kycStatus"] };
    const profile = await updateUserKycStatus(id, status, adminUid);
    return NextResponse.json(profile);
  } catch (e) {
    return fail(e);
  }
}
