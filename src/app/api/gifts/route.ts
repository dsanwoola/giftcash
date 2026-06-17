import { NextResponse } from "next/server";
import { fundGift, requireUid } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import type { CreateGiftInput } from "@/lib/data/repo-types";

// POST /api/gifts — create + fund a gift (server-authoritative ledger write).
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const input = (await req.json()) as CreateGiftInput;
    const gift = await fundGift(uid, input);
    return NextResponse.json(gift);
  } catch (e) {
    return fail(e);
  }
}
