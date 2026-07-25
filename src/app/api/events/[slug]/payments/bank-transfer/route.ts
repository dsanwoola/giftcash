import { NextResponse } from "next/server";

/** Legacy temporary bank-transfer setup is not available in production. */
export async function POST() {
  return NextResponse.json(
    { error: "Bank-transfer checkout is unavailable. Use the verified payment checkout." },
    { status: 410 },
  );
}