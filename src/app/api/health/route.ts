import { NextResponse } from "next/server";
import { adminDb, isD1Configured } from "@/lib/firebase/admin";

/**
 * GET /api/health — Cloudflare/D1 connectivity self-check (no secrets returned).
 */
export async function GET() {
  const d1Configured = isD1Configured();
  let d1Ok = false;
  let error: string | undefined;

  if (d1Configured) {
    try {
      await adminDb().collection("_healthcheck").limit(1).get();
      d1Ok = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "D1 read failed";
    }
  }

  return NextResponse.json({ adminConfigured: d1Configured, d1Configured, firestoreOk: false, d1Ok, error });
}
