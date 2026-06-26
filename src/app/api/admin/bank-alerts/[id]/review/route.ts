import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError, requireAdmin } from "@/lib/data/server-store";
import { manuallyApproveBankAlert, rejectBankAlert } from "@/lib/payments/reconciliation";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUid = await requireAdmin(req);
    const { id } = await ctx.params;
    const { action, note } = (await req.json()) as { action: "approve" | "reject"; note?: string };
    if (action === "approve") return NextResponse.json(await manuallyApproveBankAlert(id, adminUid));
    if (action === "reject") return NextResponse.json(await rejectBankAlert(id, adminUid, note));
    throw new HttpError(400, "Invalid review action.");
  } catch (e) {
    return fail(e);
  }
}
