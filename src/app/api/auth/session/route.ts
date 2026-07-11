import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/data/firebase-session";
import { fail } from "@/lib/api/handle";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    if (!email && !phone) return NextResponse.json({ error: "Email or phone is required." }, { status: 400 });
    const { user, session } = await createSession({ email, phone, name });
    await setSessionCookie(session);
    return NextResponse.json({ user });
  } catch (e) {
    return fail(e);
  }
}
