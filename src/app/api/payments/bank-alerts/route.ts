import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { Contribution, GiftEvent } from "@/lib/types";
import {
  bankAlertId,
  parseGtbankCreditAlert,
  scoreAlertMatch,
  type BankAlertRecord,
  type BankTransferPaymentIntent,
} from "@/lib/payments/bank-transfer";

interface BankAlertWebhookBody {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
}

export async function POST(req: Request) {
  try {
    const configuredSecret = process.env.BANK_ALERT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const supplied = req.headers.get("x-giftcash-bank-alert-secret");
      if (supplied !== configuredSecret) throw new HttpError(401, "Invalid bank alert webhook secret.");
    }

    const body = (await req.json()) as BankAlertWebhookBody;
    const alert = parseGtbankCreditAlert(body);
    if (!alert.rawText) throw new HttpError(400, "Bank alert text is required.");

    const db = adminDb();
    const alertId = bankAlertId(alert);
    const alertRef = db.collection("bank_alerts").doc(alertId);
    const existing = await alertRef.get();
    if (existing.exists) {
      return NextResponse.json({ ok: true, status: "duplicate", alertId });
    }

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
      await db.runTransaction(async (tx) => {
        const intentRef = db.collection("payment_intents").doc(matchedIntent!.reference);
        const eventRef = db.collection("events").doc(matchedIntent!.eventSlug);
        const [intentTxnSnap, eventTxnSnap] = await Promise.all([tx.get(intentRef), tx.get(eventRef)]);
        const liveIntent = intentTxnSnap.data() as BankTransferPaymentIntent | undefined;
        const event = eventTxnSnap.data() as GiftEvent | undefined;
        if (!liveIntent || !event) throw new HttpError(404, "Payment intent or event not found.");
        if (liveIntent.status !== "pending") {
          tx.set(alertRef, { ...record, status: "duplicate", reviewReason: "Payment intent was already processed." });
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
          bankDocumentNumber: alert.documentNumber,
        });
        tx.set(alertRef, record);
        tx.set(db.collection("payment_reconciliation_logs").doc(), {
          action: "bank_alert_auto_confirmed",
          reference: liveIntent.reference,
          eventSlug: liveIntent.eventSlug,
          alertId,
          amount: liveIntent.totalTransferAmount,
          contributionAmount: liveIntent.expectedAmount,
          serviceFee: liveIntent.serviceFee,
          createdAt: now,
        });
      });
    } else {
      await alertRef.set(record);
      if (matchedIntent) {
        await db.collection("payment_intents").doc(matchedIntent.reference).update({ status: "review", alertId, reviewReason });
      }
    }

    return NextResponse.json({ ok: true, status, alertId, matchScore, reference: matchedIntent?.reference ?? alert.paymentReference ?? null, reviewReason });
  } catch (e) {
    return fail(e);
  }
}
