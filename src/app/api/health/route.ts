import { NextResponse } from "next/server";
import { adminDb, isD1Configured, isFirestoreConfigured } from "@/lib/firebase/admin";

/**
 * GET /api/health — production readiness self-check (no secrets returned).
 */
export async function GET() {
  const d1Configured = isD1Configured();
  const firestoreConfigured = isFirestoreConfigured();
  const adminConfigured = d1Configured || firestoreConfigured;
  let datastoreOk = false;
  let error: string | undefined;

  if (adminConfigured) {
    try {
      await adminDb().collection("_healthcheck").limit(1).get();
      datastoreOk = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Datastore read failed";
    }
  }

  return NextResponse.json({
    adminConfigured,
    datastore: d1Configured ? "cloudflare-d1" : firestoreConfigured ? "firestore" : "unconfigured",
    d1Configured,
    firestoreConfigured,
    firestoreOk: firestoreConfigured && datastoreOk,
    d1Ok: d1Configured && datastoreOk,
    datastoreOk,
    error,
  });
}
