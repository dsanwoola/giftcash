import "server-only";
import { nanoid } from "nanoid";
import { adminAuth, adminDb } from "../firebase/admin";
import { limitForKyc } from "../compliance/limits";
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
  UserProfile,
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
  status: LedgerEntry["status"] = "settled",
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
    status,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function walletFromLedger(userId: string, entries: LedgerEntry[]): Wallet {
  let available = 0;
  let pending = 0;
  for (const e of entries) {
    if (e.status === "reversed") continue;
    if (e.status === "settled") {
      available += e.direction === "credit" ? e.amount : -e.amount;
      continue;
    }
    // Pending debits are reserved funds: they must not remain withdrawable.
    if (e.direction === "debit") {
      available -= e.amount;
      pending += e.amount;
    } else {
      pending += e.amount;
    }
  }
  return { id: `wallet-${userId}`, userId, currency: "NGN", available, pending };
}

export async function serverWallet(userId: string): Promise<Wallet> {
  const res = await adminDb().collection("ledger_entries").where("userId", "==", userId).get();
  const entries: LedgerEntry[] = [];
  res.forEach((d) => entries.push(d.data() as LedgerEntry));
  return walletFromLedger(userId, entries);
}

function validateMinorAmount(amount: number, label: string, min = 100_00, max = 5_000_000_00) {
  if (!Number.isInteger(amount) || amount < min) {
    throw new HttpError(400, `${label} must be at least ₦${Math.round(min / 100).toLocaleString("en-NG")}.`);
  }
  if (amount > max) {
    throw new HttpError(400, `${label} exceeds the ₦${Math.round(max / 100).toLocaleString("en-NG")} limit.`);
  }
}

function cleanText(value: string | undefined, label: string, min = 2, max = 80) {
  const cleaned = value?.trim().replace(/\s+/g, " ") ?? "";
  if (cleaned.length < min) throw new HttpError(400, `${label} is required.`);
  if (cleaned.length > max) throw new HttpError(400, `${label} is too long.`);
  return cleaned;
}

function validateBankAccount(bank: BankAccount): BankAccount {
  const accountNumber = (bank.accountNumber ?? "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new HttpError(400, "Enter a valid 10-digit Nigerian account number.");
  }
  return {
    bankName: cleanText(bank.bankName, "Bank name"),
    accountName: cleanText(bank.accountName, "Account name"),
    accountNumber,
  };
}

/* ---------- Gift operations ---------- */

export async function fundGift(senderUid: string, input: CreateGiftInput): Promise<Gift> {
  validateMinorAmount(input.amount, "Gift amount");
  const recipientName = cleanText(input.recipientName, "Recipient name");
  const senderName = cleanText(input.senderName, "Sender name");
  const message = cleanText(input.message, "Gift message", 1, 500);
  const fee = serviceFee(input.amount);
  const gift: Gift = {
    id: nanoid(),
    slug: slugify(recipientName),
    senderId: senderUid,
    senderName,
    anonymous: input.anonymous,
    occasion: input.occasion,
    theme: input.theme,
    recipientName,
    recipientNickname: input.recipientNickname?.trim() || undefined,
    recipientPhone: input.recipientPhone?.trim() || undefined,
    recipientEmail: input.recipientEmail?.trim() || undefined,
    amount: input.amount,
    currency: input.currency,
    serviceFee: fee,
    addOns: input.addOns,
    message,
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
  validateMinorAmount(amount, "Withdrawal amount", 1_000_00, 5_000_000_00);
  const cleanBank = validateBankAccount(bank);
  const db = adminDb();
  const withdrawalRef = db.collection("withdrawals").doc();
  const now = new Date().toISOString();
  const withdrawal: Withdrawal = {
    id: withdrawalRef.id,
    userId,
    amount,
    currency: "NGN",
    bank: cleanBank,
    status: "pending",
    createdAt: now,
    reference: `wd-${nanoid(8)}`,
  };

  await db.runTransaction(async (tx) => {
    const profileSnap = await tx.get(db.collection("profiles").doc(userId));
    const profile = profileSnap.data() as UserProfile | undefined;
    const limit = limitForKyc(profile?.kycStatus ?? "none");
    if (amount > limit.perWithdrawal) {
      throw new HttpError(400, `Your ${limit.label} limit allows ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(limit.perWithdrawal / 100)} per withdrawal.`);
    }

    const withdrawalSnap = await tx.get(db.collection("withdrawals").where("userId", "==", userId));
    const since = Date.now() - 24 * 60 * 60 * 1000;
    let usedToday = 0;
    withdrawalSnap.forEach((d) => {
      const w = d.data() as Withdrawal;
      if (["pending", "processing", "completed"].includes(w.status) && new Date(w.createdAt).getTime() >= since) {
        usedToday += w.amount;
      }
    });
    if (usedToday + amount > limit.daily) {
      throw new HttpError(400, `This request exceeds your daily withdrawal limit. ${limit.note}`);
    }

    const ledgerSnap = await tx.get(db.collection("ledger_entries").where("userId", "==", userId));
    const entries: LedgerEntry[] = [];
    ledgerSnap.forEach((d) => entries.push(d.data() as LedgerEntry));
    const wallet = walletFromLedger(userId, entries);
    if (amount > wallet.available) throw new HttpError(400, "Amount exceeds your available balance.");

    const debit = ledgerEntry(
      userId,
      "withdrawal_requested",
      amount,
      "debit",
      withdrawal.reference,
      "NGN",
      {
        withdrawalId: withdrawal.id,
        bank: cleanBank.bankName,
        accountLast4: cleanBank.accountNumber.slice(-4),
      },
      "pending",
    );
    tx.set(withdrawalRef, withdrawal);
    tx.set(db.collection("ledger_entries").doc(debit.id), debit);
  });

  return withdrawal;
}

export async function processWithdrawal(
  id: string,
  action: "complete" | "fail",
  processedBy?: string,
): Promise<Withdrawal> {
  const db = adminDb();
  const ref = db.collection("withdrawals").doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const w = snap.data() as Withdrawal | undefined;
    if (!w) throw new HttpError(404, "Withdrawal not found");
    if (w.status !== "pending" && w.status !== "processing") {
      throw new HttpError(409, "This withdrawal has already been processed.");
    }

    const now = new Date().toISOString();
    const reservationSnap = await tx.get(
      db.collection("ledger_entries")
        .where("userId", "==", w.userId)
        .where("reference", "==", w.reference)
        .where("transactionType", "==", "withdrawal_requested"),
    );
    const reservations = reservationSnap.docs.map((d) => ({ ref: d.ref, entry: d.data() as LedgerEntry }));

    if (action === "complete") {
      tx.update(ref, { status: "completed", processedAt: now, processedBy });
      for (const reservation of reservations) {
        if (reservation.entry.status === "pending") tx.update(reservation.ref, { status: "settled" });
      }
      const audit = ledgerEntry(w.userId, "withdrawal_completed", 0, "debit", w.reference, w.currency, {
        withdrawalId: w.id,
        processedBy,
        note: "payout settled",
      });
      tx.set(db.collection("ledger_entries").doc(audit.id), audit);
      return { ...w, status: "completed", processedAt: now, processedBy };
    }

    tx.update(ref, { status: "failed", processedAt: now, processedBy });
    let restoredLegacyDebit = false;
    for (const reservation of reservations) {
      if (reservation.entry.status === "pending") {
        tx.update(reservation.ref, { status: "reversed" });
      } else if (reservation.entry.status === "settled") {
        restoredLegacyDebit = true;
      }
    }
    if (restoredLegacyDebit || reservations.length === 0) {
      const reversal = ledgerEntry(w.userId, "withdrawal_failed", w.amount, "credit", w.reference, w.currency, {
        withdrawalId: w.id,
        processedBy,
        note: "reversed",
      });
      tx.set(db.collection("ledger_entries").doc(reversal.id), reversal);
    }
    return { ...w, status: "failed", processedAt: now, processedBy };
  });
}

/* ---------- Admin approval operations ---------- */

export async function requestKycReview(userId: string): Promise<UserProfile> {
  const db = adminDb();
  const ref = db.collection("profiles").doc(userId);
  const snap = await ref.get();
  const profile = snap.data() as UserProfile | undefined;
  if (!profile) throw new HttpError(404, "User profile not found");
  if (profile.kycStatus === "verified") return profile;
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    tx.update(ref, { kycStatus: "pending" });
    tx.set(db.collection("admin_audit_logs").doc(), {
      action: "kyc_review_requested",
      targetType: "profile",
      targetId: userId,
      from: profile.kycStatus,
      to: "pending",
      reviewedBy: userId,
      createdAt: now,
    });
  });
  return { ...profile, kycStatus: "pending" };
}

export async function updateUserKycStatus(
  userId: string,
  status: UserProfile["kycStatus"],
  reviewedBy: string,
): Promise<UserProfile> {
  if (!["none", "pending", "verified", "rejected"].includes(status)) {
    throw new HttpError(400, "Invalid KYC status.");
  }
  const db = adminDb();
  const ref = db.collection("profiles").doc(userId);
  const snap = await ref.get();
  const profile = snap.data() as UserProfile | undefined;
  if (!profile) throw new HttpError(404, "User profile not found");
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    tx.update(ref, { kycStatus: status });
    tx.set(db.collection("admin_audit_logs").doc(), {
      action: "kyc_status_updated",
      targetType: "profile",
      targetId: userId,
      from: profile.kycStatus,
      to: status,
      reviewedBy,
      createdAt: now,
    });
  });
  return { ...profile, kycStatus: status };
}
