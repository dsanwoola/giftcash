import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { createServerGroupGift, requireUid } from "@/lib/data/server-store";
import type { CreateGroupGiftInput } from "@/lib/data/repo-types";

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const input = await req.json() as CreateGroupGiftInput;
    return NextResponse.json(await createServerGroupGift(uid, input), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}