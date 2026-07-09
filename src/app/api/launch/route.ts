import { NextResponse } from "next/server";
import { REVENUE_PLANS, MONETIZATION_CHANNELS } from "@/lib/monetization";

export async function GET() {
  const paystackConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
  const agentMailConfigured = Boolean(process.env.AGENTMAIL_API_KEY?.trim());
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://occasion.ng";

  return NextResponse.json({
    launch: {
      app: "Occasion.ng",
      status: paystackConfigured ? "ready_for_paid_pilot" : "ready_for_free_launch_payment_setup_required",
      publicBaseUrl,
    },
    monetization: {
      plans: REVENUE_PLANS,
      channels: MONETIZATION_CHANNELS,
      paystackConfigured,
      agentMailConfigured,
      livePaymentsEnabled: paystackConfigured,
      notes: paystackConfigured
        ? ["Paystack secret is configured. Verify callback and webhook in Paystack before announcing live paid events."]
        : ["Paystack secret is not configured, so paid checkout is blocked until the server secret is added."],
    },
    checklist: [
      { item: "Firebase App Hosting deployment", status: "done" },
      { item: "Custom domain DNS", status: "pending_dns_propagation" },
      { item: "Firestore server datastore", status: "configured_in_code" },
      { item: "Firebase Auth authorized domains", status: "done" },
      { item: "Pricing and fee model", status: "done" },
      { item: "Paystack server secret", status: paystackConfigured ? "done" : "blocked" },
      { item: "Paystack webhook signature verification", status: "implemented" },
      { item: "Bank-alert reconciliation", status: agentMailConfigured ? "configured" : "optional_not_configured" },
    ],
  });
}
