import { NextResponse } from "next/server";
import { adminDb, isFirestoreConfigured } from "@/lib/firebase/admin";

/**
 * GET /api/health — Firebase production readiness self-check (no secrets returned).
 */
export async function GET() {
  const firestoreConfigured = isFirestoreConfigured();
  let firestoreOk = false;
  let error: string | undefined;

  if (firestoreConfigured) {
    try {
      await adminDb().collection("_healthcheck").limit(1).get();
      firestoreOk = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Firestore read failed";
    }
  }

  return NextResponse.json({
    adminConfigured: firestoreConfigured,
    datastore: firestoreConfigured ? "firestore" : "unconfigured",
    firestoreConfigured,
    firestoreOk,
    datastoreOk: firestoreOk,
    error,
  });
}
