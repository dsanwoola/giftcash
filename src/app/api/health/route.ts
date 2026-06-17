import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";

/**
 * GET /api/health — config/connectivity self-check (no secrets returned).
 * Reports whether the server Admin SDK is configured and whether a trivial
 * Firestore read succeeds. Used by the settings status card.
 */
export async function GET() {
  const adminConfigured = isAdminConfigured;
  let firestoreOk = false;
  let error: string | undefined;

  if (adminConfigured) {
    try {
      await adminDb().collection("_healthcheck").limit(1).get();
      firestoreOk = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Firestore read failed";
    }
  }

  return NextResponse.json({ adminConfigured, firestoreOk, error });
}
