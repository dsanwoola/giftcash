"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "../firebase/client";
import type {
  BankAccount,
  Gift,
  GiftView,
  GiftEvent,
  GroupGift,
  GroupGiftView,
  LedgerEntry,
  ThankYou,
  UserProfile,
  Wallet,
  Withdrawal,
} from "../types";
import type {
  AdminStats,
  ContributionData,
  CreateEventInput,
  CreateGiftInput,
  CreateGroupGiftInput,
  GiftRepo,
} from "./repo-types";

/**
 * FIRESTORE repo.
 *
 * Split of responsibility (matches firestore.rules):
 *  - Owner-scoped reads use the client SDK directly.
 *  - Creation, payments, claims, settings and ledger mutations use authenticated
 *    Admin-SDK API routes so canonical records stay server-authoritative.
 *
 * Dates are stored as ISO strings to keep documents identical to the domain
 * types (no Timestamp conversion needed).
 */

const COL = {
  gifts: "gifts",
  groupGifts: "groupGifts",
  events: "events",
  withdrawals: "withdrawals",
  ledger: "ledger_entries",
  profiles: "profiles",
} as const;


const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  +new Date(b.createdAt) - +new Date(a.createdAt);

async function snap<T>(q: Query<DocumentData>): Promise<T[]> {
  const res = await getDocs(q);
  return res.docs.map((d) => d.data() as T);
}

function uid(): string {
  return getFirebaseAuth().currentUser?.uid ?? "";
}

/** Send JSON to an API route with the caller's Firebase ID token attached. */
async function authedRequest<T>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  let token: string | undefined;
  try {
    token = await getFirebaseAuth().currentUser?.getIdToken();
  } catch {
    // The verified same-site server session remains a secure fallback when the
    // Firebase token endpoint is temporarily unreachable from the browser.
  }

  const request = () => fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer ".concat(token) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let res: Response;
  try {
    res = await request();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      res = await request();
    } catch {
      throw new Error("Could not reach GiftCash. Check your internet connection and try again.");
    }
  }
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401) throw new Error("Your sign-in session has expired. Please sign in again.");
    throw new Error(msg.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

const authedPost = <T>(path: string, body?: unknown) => authedRequest<T>(path, "POST", body);

export const firestoreRepo: GiftRepo = {
  currentUserId: () => uid(),

  /* ---------- Gifts ---------- */

  async getGift(slug) {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    const response = await fetch(`/api/gifts/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Could not load this gift.");
    return (await response.json()) as GiftView;
  },

  async listSentGifts(userId = uid()) {
    const gifts = await snap<Gift>(query(collection(getDb(), COL.gifts), where("senderId", "==", userId)));
    return gifts.sort(byCreatedDesc);
  },

  async listReceivedGifts(userId = uid()) {
    const gifts = await snap<Gift>(query(collection(getDb(), COL.gifts), where("claimedByUserId", "==", userId)));
    return gifts.sort((a, b) => +new Date(b.claimedAt ?? 0) - +new Date(a.claimedAt ?? 0));
  },

  // Server creates the gift doc + funding ledger entry atomically.
  async createGift(input: CreateGiftInput) {
    return authedPost<Gift>("/api/gifts", input);
  },

  async markOpened(slug) {
    await authedPost<void>(`/api/gifts/${slug}/open`);
  },

  async claimGift(slug, claimerUserId) {
    return authedPost<Gift>(`/api/gifts/${slug}/claim`, { claimerUserId });
  },

  async saveThankYou(slug, thankYou: ThankYou) {
    await authedPost<void>(`/api/gifts/${slug}/thankyou`, thankYou);
  },

  /* ---------- Wallet & withdrawals ---------- */

  async getWallet(userId = uid()): Promise<Wallet> {
    const ledger = await snap<LedgerEntry>(query(collection(getDb(), COL.ledger), where("userId", "==", userId)));
    let available = 0;
    let pending = 0;
    for (const e of ledger) {
      if (e.status === "reversed") continue;
      // External processor-funded gifts are audit entries, not wallet debits.
      if (e.transactionType === "gift_funded" && e.metadata?.source === "external_checkout") continue;
      if (e.status === "settled") {
        available += e.direction === "credit" ? e.amount : -e.amount;
      } else if (e.status === "pending") {
        if (e.direction === "debit") {
          available -= e.amount;
          pending += e.amount;
        } else {
          pending += e.amount;
        }
      }
    }
    return { id: `wallet-${userId}`, userId, currency: "NGN", available, pending };
  },

  async getLedger(userId = uid()) {
    const ledger = await snap<LedgerEntry>(query(collection(getDb(), COL.ledger), where("userId", "==", userId)));
    return ledger.sort(byCreatedDesc);
  },

  async requestWithdrawal(userId, amount, bank: BankAccount) {
    return authedPost<Withdrawal>("/api/withdrawals", { userId, amount, bank });
  },

  async listWithdrawals(userId) {
    const w = await snap<Withdrawal>(query(collection(getDb(), COL.withdrawals), where("userId", "==", userId)));
    return w.sort(byCreatedDesc);
  },

  /* ---------- Group gifting ---------- */

  async getGroupGift(slug) {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    const response = await fetch(`/api/groups/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Could not load this group gift.");
    return (await response.json()) as GroupGiftView;
  },

  async listGroupGifts(userId = uid()) {
    const g = await snap<GroupGift>(query(collection(getDb(), COL.groupGifts), where("organizerId", "==", userId)));
    return g.sort(byCreatedDesc);
  },

  async createGroupGift(input: CreateGroupGiftInput) {
    return authedPost<GroupGift>("/api/groups", input);
  },

  async contributeToGroup() {
    throw new Error("Direct group contributions are disabled. Start a verified payment checkout.");
  },

  /* ---------- Gift Party gifting ---------- */

  async getEvent(slug) {
    const d = await getDoc(doc(getDb(), COL.events, slug));
    return d.exists() ? (d.data() as GiftEvent) : null;
  },

  async listEvents(userId = uid()) {
    const e = await snap<GiftEvent>(query(collection(getDb(), COL.events), where("organizerId", "==", userId)));
    return e.sort(byCreatedDesc);
  },

  async createEvent(input: CreateEventInput) {
    return authedPost<GiftEvent>("/api/events", input);
  },

  async updateEventSettings(slug, settings) {
    return authedRequest<GiftEvent>(`/api/events/${slug}`, "PATCH", settings);
  },

  // Server-validated (campaign caps/donor rules enforced in the API route).
  async contributeToEvent(slug, contribution: ContributionData) {
    return authedPost<GiftEvent>(`/api/events/${slug}/contribute`, contribution);
  },

  subscribeEvent(slug, cb) {
    // Real-time party screen updates straight from Firestore.
    return onSnapshot(doc(getDb(), COL.events, slug), (d) => {
      cb(d.exists() ? (d.data() as GiftEvent) : null);
    });
  },

  /* ---------- Admin ---------- */

  async listAllGifts() {
    const g = await snap<Gift>(query(collection(getDb(), COL.gifts), orderBy("createdAt", "desc")));
    return g;
  },

  async listAllWithdrawals() {
    const w = await snap<Withdrawal>(query(collection(getDb(), COL.withdrawals), orderBy("createdAt", "desc")));
    return w;
  },

  async listUsers(): Promise<UserProfile[]> {
    const u = await snap<UserProfile>(query(collection(getDb(), COL.profiles)));
    return u.sort(byCreatedDesc);
  },

  async getProfile(userId = uid()) {
    if (!userId) return null;
    const d = await getDoc(doc(getDb(), COL.profiles, userId));
    return d.exists() ? (d.data() as UserProfile) : null;
  },

  async requestKycReview() {
    return authedPost<UserProfile>("/api/profile/kyc/request");
  },

  async updateUserKyc(userId, status) {
    return authedPost<UserProfile>(`/api/admin/users/${userId}/kyc`, { status });
  },

  async processWithdrawal(id, action) {
    return authedPost<Withdrawal>(`/api/withdrawals/${id}/process`, { action });
  },

  async adminStats(): Promise<AdminStats> {
    const [gifts, groups, events, withdrawals, users] = await Promise.all([
      snap<Gift>(query(collection(getDb(), COL.gifts))),
      snap<GroupGift>(query(collection(getDb(), COL.groupGifts))),
      snap<GiftEvent>(query(collection(getDb(), COL.events))),
      snap<Withdrawal>(query(collection(getDb(), COL.withdrawals))),
      snap<UserProfile>(query(collection(getDb(), COL.profiles))),
    ]);
    const unclaimed = new Set(["funded", "delivered", "opened"]);
    const contributionsValue =
      groups.reduce((s, g) => s + g.contributions.reduce((t, c) => t + c.amount, 0), 0) +
      events.reduce((s, e) => s + e.contributions.reduce((t, c) => t + c.amount, 0), 0);
    return {
      totalGifts: gifts.length,
      totalGiftValue: gifts.reduce((s, g) => s + g.amount, 0),
      claimedGifts: gifts.filter((g) => g.status === "claimed").length,
      unclaimedGifts: gifts.filter((g) => unclaimed.has(g.status)).length,
      totalUsers: users.length,
      totalWithdrawals: withdrawals.length,
      pendingWithdrawals: withdrawals.filter((w) => w.status === "pending" || w.status === "processing").length,
      failedPayments: gifts.filter((g) => g.paymentStatus === "failed").length,
      groupGifts: groups.length,
      events: events.length,
      contributionsValue,
      pendingKyc: users.filter((u) => u.kycStatus === "pending").length,
    };
  },

  // No-op: Firestore has no local seed to reset.
  async reset() {},
};
