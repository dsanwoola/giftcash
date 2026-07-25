import { NextResponse } from "next/server";
// Contributions are appended only after a payment-provider callback has been
// verified server-side. This legacy direct-write route is permanently closed.
export async function POST() {
  return NextResponse.json(
    { error: "Direct contributions are disabled. Start a verified payment checkout." },
    { status: 410 },
  );
}
