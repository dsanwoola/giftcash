import { NextResponse } from "next/server";
import { requestWithdrawal, requireUid } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import type { BankAccount } from "@/lib/types";

// POST /api/withdrawals — request a payout (debits the caller's wallet).
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const { amount, bank } = (await req.json()) as { amount: number; bank: BankAccount };
    const withdrawal = await requestWithdrawal(uid, amount, bank);
    return NextResponse.json(withdrawal);
  } catch (e) {
    return fail(e);
  }
}
