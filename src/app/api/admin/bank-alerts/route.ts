import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireAdmin } from "@/lib/data/server-store";
import { adminDb, type AdminQuery } from "@/lib/firebase/admin";
import type { BankAlertRecord, BankTransferPaymentIntent } from "@/lib/payments/bank-transfer";

export interface AdminBankAlertQueueItem extends BankAlertRecord {
  intent?: BankTransferPaymentIntent;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "needs_review";
    const db = adminDb();
    let query: AdminQuery<BankAlertRecord> = db.collection<BankAlertRecord>("bank_alerts").orderBy("createdAt", "desc").limit(100);
    if (status !== "all") query = db.collection<BankAlertRecord>("bank_alerts").where("status", "==", status).limit(100);
    const snap = await query.get();
    const alerts = snap.docs.map((d) => d.data() as BankAlertRecord);
    const refs = [...new Set(alerts.map((a) => a.matchedReference).filter(Boolean))] as string[];
    const intents = new Map<string, BankTransferPaymentIntent>();
    await Promise.all(refs.map(async (ref) => {
      const intentSnap = await db.collection<BankTransferPaymentIntent>("payment_intents").doc(ref).get();
      if (intentSnap.exists) intents.set(ref, intentSnap.data() as BankTransferPaymentIntent);
    }));
    const items: AdminBankAlertQueueItem[] = alerts.map((a) => ({ ...a, intent: a.matchedReference ? intents.get(a.matchedReference) : undefined }));
    return NextResponse.json({ items });
  } catch (e) {
    return fail(e);
  }
}
