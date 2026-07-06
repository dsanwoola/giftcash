import { NextResponse } from "next/server";
import { MONETIZATION_CHANNELS, REVENUE_PLANS } from "@/lib/monetization";

export async function GET() {
  return NextResponse.json({ plans: REVENUE_PLANS, channels: MONETIZATION_CHANNELS });
}
