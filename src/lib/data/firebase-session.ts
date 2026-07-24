import "server-only";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { adminDb } from "../firebase/admin";
import type { UserProfile } from "../types";

export interface OccasionSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

const COOKIE = "occasion_session";
const TTL_DAYS = 30;

function nowIso() {
  return new Date().toISOString();
}

function expiresIso() {
  return new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
}

function userIdFor(email?: string, phone?: string) {
  const raw = (email || phone || `guest-${nanoid(8)}`).toLowerCase();
  return `occ-${raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || nanoid(8)}`;
}

export async function createSession(input: { uid?: string; name?: string; email?: string; phone?: string }): Promise<{ user: UserProfile; session: OccasionSession }> {
  const id = input.uid || userIdFor(input.email, input.phone);
  const existing = await adminDb().collection<UserProfile>("profiles").doc(id).get();
  const existingData = existing.data();
  const user: UserProfile = {
    id,
    fullName: existingData?.fullName || input.name?.trim() || input.email?.split("@")[0] || input.phone || "GiftCash User",
    email: input.email || existingData?.email || undefined,
    phone: input.phone || existingData?.phone || undefined,
    country: existingData?.country || "NG",
    currency: existingData?.currency || "NGN",
    kycStatus: existingData?.kycStatus || "none",
    role: existingData?.role || "user",
    createdAt: existingData?.createdAt || nowIso(),
  };
  await adminDb().collection<UserProfile>("profiles").doc(id).set(user, { merge: true });
  const session: OccasionSession = {
    id: `sess_${nanoid(32)}`,
    userId: id,
    createdAt: nowIso(),
    expiresAt: expiresIso(),
  };
  await adminDb().collection<OccasionSession>("sessions").doc(session.id).set(session);
  return { user, session };
}

export async function getSessionUser(sessionId?: string): Promise<UserProfile | null> {
  if (!sessionId) return null;
  const session = (await adminDb().collection<OccasionSession>("sessions").doc(sessionId).get()).data();
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  return (await adminDb().collection<UserProfile>("profiles").doc(session.userId).get()).data() ?? null;
}

export async function sessionFromCookies(): Promise<UserProfile | null> {
  const jar = await cookies();
  return getSessionUser(jar.get(COOKIE)?.value);
}

export async function setSessionCookie(session: OccasionSession) {
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await adminDb().collection<OccasionSession>("sessions").doc(id).update({ expiresAt: nowIso() }).catch(() => undefined);
  jar.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
}
