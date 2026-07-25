import { NextResponse } from "next/server";

/** Public liveness only. Configuration and readiness details stay private. */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
