import "server-only";
import { nanoid } from "nanoid";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { Contribution, GiftEvent } from "@/lib/types";
import {
  bankAlertId,
  scoreAlertMatch,
  type BankAlertRecord,
  type BankAlertStatus,
  type BankTransferPaymentIntent,
  type ParsedBankAlert,
} from "@/lib/payments/bank-transfer";

export interface BankAlertProcessResult {
  ok: true;
  status: BankAlertStatus;
  alertId: string;
  matchScore: number;
  reference: string | null;
  reviewReason?: string;
}

export async function processParsedBankAlert(alert: ParsedBankAlert): Promise<BankAlertProcessResult> {
  if (!alert.rawText) throw new HttpError(400, "Bank alert text is required.");

  const db = adminDb();
  const alertId = bankAlertId(alert);
  const alertRef = db.collection("bank_alerts").doc(alertId);
  const existing = await alertRef.get();
  if (existing.exists) return { ok: true, status: "duplicate", alertId, matchScore: 0, reference: null };

  const now = new Date().toISOString();
  let status: BankAlertRecord["status"] = "needs_review";
  let matchScore = 0;
  let reviewReason = "No GiftCash payment reference was found in the bank alert.";
  let matchedIntent: BankTransferPaymentIntent | undefined;

  if (alert.paymentReference) {
    const intentSnap = await db.collection("payment_intents").doc(alert.paymentReference).get();
    matchedIntent = intentSnap.data() as BankTransferPaymentIntent | undefined;
    if (matchedIntent) {
      const scored = scoreAlertMatch(alert, matchedIntent);
      matchScore = scored.score;
      reviewReason = scored.reasons.join(" ") || "Exact bank alert match.";
      status = matchScore >= 95 && matchedIntent.status === "pending" ? "auto_confirmed" : "needs_review";
    } else {
      reviewReason = "GiftCash reference was present but no pending payment intent matched it.";
    }
  }

  const record: BankAlertRecord = {
    ...alert,
    id: alertId,
    status,
    matchedIntentId: matchedIntent?.id,
    matchedReference: matchedIntent?.reference,
    matchScore,
    reviewReason,
    createdAt: now,
  };

  if (status === "auto_confirmed" && matchedIntent) {
    await confirmIntentWithAlert({ record, intent: matchedIntent, alertId, action: "bank_alert_auto_confirmed" });
  } else {
    await alertRef.set(record);
    if (matchedIntent) {
      await db.collection("payment_intents").doc(matchedIntent.reference).update({ status: "review", alertId, reviewReason });
    }
  }

  return { ok: true, status, alertId, matchScore, reference: matchedIntent?.reference ?? alert.paymentReference ?? null, reviewReason };
}

export async function manuallyApproveBankAlert(alertId: string, reviewedBy: string) {
  const db = adminDb();
  const alertSnap = await db.collection("bank_alerts").doc(alertId).get();
  const alert = alertSnap.data() as BankAlertRecord | undefined;
  if (!alert) throw new HttpError(404, "Bank alert not found.");
  if (!alert.matchedReference) throw new HttpError(400, "This alert has no matched payment reference to approve.");
  const intentSnap = await db.collection("payment_intents").doc(alert.matchedReference).get();
  const intent = intentSnap.data() as BankTransferPaymentIntent | undefined;
  if (!intent) throw new HttpError(404, "Payment intent not found.");
  if (!["pending", "review"].includes(intent.status)) throw new HttpError(409, "This payment has already been processed.");
  await confirmIntentWithAlert({
    record: { ...alert, status: "manual_confirmed", reviewReason: `Manually approved by ${reviewedBy}` },
    intent,
    alertId,
    action: "bank_alert_manual_confirmed",
    reviewedBy,
  });
  const updated = await db.collection("bank_alerts").doc(alertId).get();
  return updated.data() as BankAlertRecord;
}

export async function rejectBankAlert(alertId: string, reviewedBy: string, note?: string) {
  const db = adminDb();
  const alertSnap = await db.collection("bank_alerts").doc(alertId).get();
  const alert = alertSnap.data() as BankAlertRecord | undefined;
  if (!alert) throw new HttpError(404, "Bank alert not found.");
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    tx.update(db.collection("bank_alerts").doc(alertId), {
      status: "rejected",
      reviewedBy,
      reviewedAt: now,
      reviewReason: note || "Rejected by admin.",
    });
    if (alert.matchedReference) {
      tx.update(db.collection("payment_intents").doc(alert.matchedReference), {
        status: "cancelled",
        reviewReason: note || "Bank alert rejected by admin.",
      });
    }
    tx.set(db.collection("admin_audit_logs").doc(), {
      action: "bank_alert_rejected",
      targetType: "bank_alert",
      targetId: alertId,
      reference: alert.matchedReference,
      reviewedBy,
      note: note || "Rejected by admin.",
      createdAt: now,
    });
  });
  const updated = await db.collection("bank_alerts").doc(alertId).get();
  return updated.data() as BankAlertRecord;
}

async function confirmIntentWithAlert({
  record,
  intent,
  alertId,
  action,
  reviewedBy,
}: {
  record: BankAlertRecord;
  intent: BankTransferPaymentIntent;
  alertId: string;
  action: "bank_alert_auto_confirmed" | "bank_alert_manual_confirmed";
  reviewedBy?: string;
}) {
  const db = adminDb();
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const intentRef = db.collection("payment_intents").doc(intent.reference);
    const eventRef = db.collection("events").doc(intent.eventSlug);
    const alertRef = db.collection("bank_alerts").doc(alertId);
    const [intentTxnSnap, eventTxnSnap] = await Promise.all([tx.get(intentRef), tx.get(eventRef)]);
    const liveIntent = intentTxnSnap.data() as BankTransferPaymentIntent | undefined;
    const event = eventTxnSnap.data() as GiftEvent | undefined;
    if (!liveIntent || !event) throw new HttpError(404, "Payment intent or event not found.");
    if (!["pending", "review"].includes(liveIntent.status)) {
      tx.set(alertRef, { ...record, status: "duplicate", reviewReason: "Payment intent was already processed." }, { merge: true });
      return;
    }
    const contribution: Contribution = {
      id: nanoid(),
      name: liveIntent.contribution.anonymous ? "Anonymous" : liveIntent.contribution.name || "A guest",
      anonymous: !!liveIntent.contribution.anonymous,
      amount: liveIntent.expectedAmount,
      ...(liveIntent.contribution.message ? { message: liveIntent.contribution.message } : {}),
      ...(liveIntent.contribution.table ? { table: liveIntent.contribution.table } : {}),
      paymentReference: liveIntent.reference,
      settlementStatus: "forwarded",
      settlementAccountLast4: liveIntent.settlementAccount.accountNumber.slice(-4),
      createdAt: now,
    };
    tx.update(eventRef, { contributions: [contribution, ...(event.contributions ?? [])] });
    tx.update(intentRef, {
      status: "confirmed",
      confirmedAt: now,
      alertId,
      bankDocumentNumber: record.documentNumber,
      reviewReason: reviewedBy ? `Manually approved by ${reviewedBy}` : "Exact bank alert match.",
    });
    tx.set(alertRef, { ...record, status: action === "bank_alert_auto_confirmed" ? "auto_confirmed" : "manual_confirmed", reviewedBy, reviewedAt: reviewedBy ? now : undefined }, { merge: true });
    tx.set(db.collection("payment_reconciliation_logs").doc(), {
      action,
      reference: liveIntent.reference,
      eventSlug: liveIntent.eventSlug,
      alertId,
      amount: liveIntent.totalTransferAmount,
      contributionAmount: liveIntent.expectedAmount,
      serviceFee: liveIntent.serviceFee,
      reviewedBy,
      createdAt: now,
    });
    if (reviewedBy) {
      tx.set(db.collection("admin_audit_logs").doc(), {
        action,
        targetType: "bank_alert",
        targetId: alertId,
        reference: liveIntent.reference,
        reviewedBy,
        createdAt: now,
      });
    }
  });
}
