import { NextResponse } from "next/server";
import { REVENUE_PLANS, MONETIZATION_CHANNELS } from "@/lib/monetization";
import { isPaysureConfigured } from "@/lib/payments/paysure";

export async function GET() {
  const paystackConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
  const paysureConfigured = isPaysureConfigured();
  const agentMailConfigured = Boolean(process.env.AGENTMAIL_API_KEY?.trim());
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://giftcash.ng";

  return NextResponse.json({
    launch: {
      app: "GiftCash",
      status: paysureConfigured || paystackConfigured ? "ready_for_paid_pilot" : "ready_for_free_launch_payment_setup_required",
      publicBaseUrl,
    },
    monetization: {
      plans: REVENUE_PLANS,
      channels: MONETIZATION_CHANNELS,
      paystackConfigured,
      paysureConfigured,
      activeCheckoutProvider: paysureConfigured ? "paysure" : paystackConfigured ? "paystack" : null,
      agentMailConfigured,
      livePaymentsEnabled: paysureConfigured || paystackConfigured,
      notes: paysureConfigured
        ? ["Paysure checkout is configured. Verify callback and webhook in Paysure before announcing live GiftCash payments."]
        : paystackConfigured
          ? ["Paystack secret is configured. Verify callback and webhook in Paystack before announcing live GiftCash payments."]
          : ["No checkout provider secret is configured, so paid checkout is blocked until provider credentials are added."],
    },
    checklist: [
      { item: "Firebase App Hosting deployment", status: "done" },
      { item: "Custom domain DNS", status: "done" },
      { item: "Firestore server datastore", status: "configured" },
      { item: "Firebase Auth authorized domains", status: "done" },
      { item: "Pricing and fee model", status: "done" },
      { item: "Paysure checkout credentials", status: paysureConfigured ? "done" : "blocked" },
      { item: "Paysure callback verification", status: "implemented" },
      { item: "Paysure webhook server-side verification", status: "implemented" },
      { item: "Paystack server secret", status: paystackConfigured ? "done" : "optional" },
      { item: "Paystack webhook signature verification", status: "implemented" },
      { item: "Bank-alert reconciliation", status: agentMailConfigured ? "configured" : "optional_not_configured" },
    ],
  });
}
