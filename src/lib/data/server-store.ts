import "server-only";
import { nanoid } from "nanoid";
import { adminAuth, adminDb } from "../firebase/admin";
import { serviceFee } from "../money";
import type {
  BankAccount,
  Contribution,
  GiftEvent,
  Gift,
  LedgerDirection,
  LedgerEntry,
  LedgerType,
  ThankYou,
  Wallet,
  Withdrawal,
} from "../types";
import type { ContributionData, CreateGiftInput } from "./repo-types";

/**
 * Server-authoritative operations (Admin SDK). These are the only writers to the
 * append-only ledger and to gift claim/status transitions. Invoked from API
 * route handlers after verifying the caller's Firebase ID token.
 */

const slugify = (name: string) =>
  `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gift"}-${nanoid(6)}`;

/* ---------- Auth guards ---------- */

export async function requireUid(req: Request): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Missing auth token");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new HttpError(401, "Invalid auth token");
  }
}

export async function requireAdmin(req: Request): Promise<string> {
  const uid = await requireUid(req);
  const profile = await adminDb().collection("profiles").doc(uid).get();
  if (profile.data()?.role !== "admin") throw new HttpError(403, "Admins only");
  return uid;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------- Ledger helpers ---------- */

function ledgerEntry(
  userId: string,
  transactionType: LedgerType,
  amount: number,
  direction: LedgerDirection,
  reference: string,
  currency: Gift["currency"] = "NGN",
  metadata?: Record<string, unknown>,
): LedgerEntry {
  return {
    id: nanoid(),
    userId,
    walletId: `wallet-${userId}`,
    transactionType,
    amount,
    currency,
    direction,
    reference,
    status: "settled",
    metadata,
    createdAt: new Date().toISOString(),
  };
}

async function writeLedger(e: LedgerEntry) {
  await adminDb().collection("ledger_entries").doc(e.id).set(e);
}

export async function serverWallet(userId: string): Promise<Wallet> {
  const res = await adminDb().collection("ledger_entries").where("userId", "==", userId).get();
  let available = 0;
  let pending = 0;
  res.forEach((d) => {
    const e = d.data() as LedgerEntry;
    const sign = e.direction === "credit" ? 1 : -1;
    if (e.status === "settled") available += sign * e.amount;
    else if (e.status === "pending") pending += sign * e.amount;
  });
  return { id: `wallet-${userId}`, userId, currency: "NGN", available, pending };
}

/* ---------- Gift operations ---------- */

export async function fundGift(senderUid: string, input: CreateGiftInput): Promise<Gift> {
  const fee = serviceFee(input.amount);
  const gift: Gift = {
    id: nanoid(),
    slug: slugify(input.recipientName),
    senderId: senderUid,
    senderName: input.senderName,
    anonymous: input.anonymous,
    occasion: input.occasion,
    theme: input.theme,
    recipientName: input.recipientName,
    recipientNickname: input.recipientNickname,
    recipientPhone: input.recipientPhone,
    recipientEmail: input.recipientEmail,
    amount: input.amount,
    currency: input.currency,
    serviceFee: fee,
    addOns: input.addOns,
    message: input.message,
    media: [],
    delivery: input.delivery,
    scheduledAt: input.scheduledAt,
    revealGate: input.revealGate,
    revealQuestion: input.revealQuestion,
    revealAnswer: input.revealAnswer,
    mystery: input.mystery,
    privateGift: input.privateGift,
    // TODO: gate on a verified payment (provider webhook) before funding.
    status: "delivered",
    paymentStatus: "successful",
    claimStatus: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  };
  const db = adminDb();
  const batch = db.batch();
  batch.set(db.collection("gifts").doc(gift.slug), gift);
  const fund = ledgerEntry(senderUid, "gift_funded", gift.amount + fee, "debit", gift.slug, gift.currency, {
    recipient: gift.recipientName,
  });
  batch.set(db.collection("ledger_entries").doc(fund.id), fund);
  await batch.commit();
  return gift;
}

export async function openGift(slug: string): Promise<void> {
  const ref = adminDb().collection("gifts").doc(slug);
  const snap = await ref.get();
  const gift = snap.data() as Gift | undefined;
  if (!gift || gift.openedAt) return;
  const status = gift.status === "delivered" || gift.status === "funded" ? "opened" : gift.status;
  await ref.update({ openedAt: new Date().toISOString(), status });
}

/** One-time claim, enforced inside a transaction. */
export async function claimGift(slug: string, claimerUid: string): Promise<Gift> {
  const db = adminDb();
  const giftRef = db.collection("gifts").doc(slug);
  const gift = await db.runTransaction(async (tx) => {
    const snap = await tx.get(giftRef);
    const g = snap.data() as Gift | undefined;
    if (!g) throw new HttpError(404, "Gift not found");
    if (g.claimStatus === "claimed") throw new HttpError(409, "This gift has already been claimed.");
    if (g.status === "expired") throw new HttpError(410, "This gift has expired.");

    const claimedAt = new Date().toISOString();
    tx.update(giftRef, { claimStatus: "claimed", status: "claimed", claimedAt, claimedByUserId: claimerUid });

    const credit = ledgerEntry(claimerUid, "gift_claimed", g.amount, "credit", g.slug, g.currency, {
      from: g.anonymous ? "Someone" : g.senderName,
      occasion: g.occasion,
    });
    tx.set(db.collection("ledger_entries").doc(credit.id), credit);
    return { ...g, claimStatus: "claimed", status: "claimed", claimedAt, claimedByUserId: claimerUid } as Gift;
  });
  return gift;
}

export async function saveThankYou(slug: string, thankYou: ThankYou): Promise<void> {
  await adminDb().collection("gifts").doc(slug).update({ thankYou });
}

/* ---------- Event contributions (server-validated) ---------- */

/**
 * Append a guest contribution to an event. For campaign events this is where the
 * cap and donor-name rules are *enforced* — clients cannot bypass it. Runs in a
 * transaction so concurrent gifts can't race the contributions array.
 */
export async function contributeToEvent(slug: string, data: ContributionData): Promise<GiftEvent> {
  const db = adminDb();
  const ref = db.collection("events").doc(slug);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const event = snap.data() as GiftEvent | undefined;
    if (!event) throw new HttpError(404, "Event not found");
    if (!Number.isFinite(data.amount) || data.amount < 100) throw new HttpError(400, "Invalid amount.");
    if (event.campaignMode) {
      if (data.anonymous || !data.name?.trim()) throw new HttpError(400, "Donor name is required for this campaign.");
      if (event.maxContribution && data.amount > event.maxContribution) {
        throw new HttpError(400, "This contribution exceeds the campaign limit.");
      }
    }
    const c: Contribution = {
      id: nanoid(),
      name: data.anonymous ? "Anonymous" : data.name?.trim() || "A guest",
      anonymous: !!data.anonymous,
      amount: data.amount,
      createdAt: new Date().toISOString(),
    };
    if (data.message) c.message = data.message; // omit undefined (Firestore rejects)
    if (data.table) c.table = data.table;
    const contributions = [c, ...(event.contributions ?? [])];
    tx.update(ref, { contributions });
    return { ...event, contributions };
  });
}

/* ---------- Withdrawal operations ---------- */

export async function requestWithdrawal(
  userId: string,
  amount: number,
  bank: BankAccount,
): Promise<Withdrawal> {
  const wallet = await serverWallet(userId);
  if (amount > wallet.available) throw new HttpError(400, "Amount exceeds your available balance.");
  const withdrawal: Withdrawal = {
    id: nanoid(),
    userId,
    amount,
    currency: "NGN",
    bank,
    status: "pending",
    createdAt: new Date().toISOString(),
    reference: `wd-${nanoid(8)}`,
  };
  const db = adminDb();
  const batch = db.batch();
  batch.set(db.collection("withdrawals").doc(withdrawal.id), withdrawal);
  const debit = ledgerEntry(userId, "withdrawal_requested", amount, "debit", withdrawal.reference, "NGN", {
    bank: bank.bankName,
  });
  batch.set(db.collection("ledger_entries").doc(debit.id), debit);
  await batch.commit();
  return withdrawal;
}

export async function processWithdrawal(id: string, action: "complete" | "fail"): Promise<Withdrawal> {
  const db = adminDb();
  const ref = db.collection("withdrawals").doc(id);
  const snap = await ref.get();
  const w = snap.data() as Withdrawal | undefined;
  if (!w) throw new HttpError(404, "Withdrawal not found");
  if (w.status !== "pending" && w.status !== "processing") {
    throw new HttpError(409, "This withdrawal has already been processed.");
  }
  if (action === "complete") {
    await ref.update({ status: "completed" });
    await writeLedger(
      ledgerEntry(w.userId, "withdrawal_completed", 0, "debit", w.reference, w.currency, { note: "payout settled" }),
    );
    return { ...w, status: "completed" };
  }
  await ref.update({ status: "failed" });
  // Reverse the debit so the user's balance is restored.
  await writeLedger(
    ledgerEntry(w.userId, "withdrawal_failed", w.amount, "credit", w.reference, w.currency, { note: "reversed" }),
  );
  return { ...w, status: "failed" };
}
