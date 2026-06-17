import { NextResponse } from "next/server";
import { processWithdrawal, requireAdmin } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";

// POST /api/withdrawals/[id]/process — admin marks a payout completed or failed.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const { action } = (await req.json()) as { action: "complete" | "fail" };
    const withdrawal = await processWithdrawal(id, action);
    return NextResponse.json(withdrawal);
  } catch (e) {
    return fail(e);
  }
}
