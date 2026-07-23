import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createSession, setSessionCookie } from "@/lib/data/firebase-session";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : undefined;

    if (idToken) {
      const decoded = await adminAuth().verifyIdToken(idToken).catch(() => {
        throw new HttpError(401, "Invalid auth token");
      });
      const email = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : undefined;
      const phone = typeof decoded.phone_number === "string" ? decoded.phone_number.trim() : undefined;
      const name = typeof decoded.name === "string" ? decoded.name.trim() : undefined;
      const { user, session } = await createSession({ uid: decoded.uid, email, phone, name });
      await setSessionCookie(session);
      return NextResponse.json({ user });
    }

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
