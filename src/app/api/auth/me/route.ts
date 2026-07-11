import { NextResponse } from "next/server";
import { clearSessionCookie, sessionFromCookies } from "@/lib/data/firebase-session";
import { fail } from "@/lib/api/handle";

export async function GET() {
  try {
    const user = await sessionFromCookies();
    return NextResponse.json({ user });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
