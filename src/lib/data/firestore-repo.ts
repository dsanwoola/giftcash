"use client";

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { getDb, getFirebaseAuth } from "../firebase/client";
import type {
  BankAccount,
  Contribution,
  Gift,
  GiftEvent,
  GroupGift,
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
 *  - READS and non-ledger writes (create group/event, append contributions) use
 *    the client SDK directly.
 *  - LEDGER-affecting writes (fund gift, claim, withdrawals) go through Admin-SDK
 *    API routes under /api so the append-only ledger stays server-authoritative.
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

const slugify = (name: string) =>
  `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gift"}-${nanoid(6)}`;

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  +new Date(b.createdAt) - +new Date(a.createdAt);

async function snap<T>(q: Query<DocumentData>): Promise<T[]> {
  const res = await getDocs(q);
  return res.docs.map((d) => d.data() as T);
}

function uid(): string {
  return getFirebaseAuth().currentUser?.uid ?? "";
}

/** POST JSON to an API route with the caller's Firebase ID token attached. */
async function authedPost<T>(path: string, body?: unknown): Promise<T> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(msg.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const firestoreRepo: GiftRepo = {
  currentUserId: () => uid(),

  /* ---------- Gifts ---------- */

  async getGift(slug) {
    const d = await getDoc(doc(getDb(), COL.gifts, slug));
    return d.exists() ? (d.data() as Gift) : null;
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

  /* ---------- Group gifting (client writes; no ledger) ---------- */

  async getGroupGift(slug) {
    const d = await getDoc(doc(getDb(), COL.groupGifts, slug));
    return d.exists() ? (d.data() as GroupGift) : null;
  },

  async listGroupGifts(userId = uid()) {
    const g = await snap<GroupGift>(query(collection(getDb(), COL.groupGifts), where("organizerId", "==", userId)));
    return g.sort(byCreatedDesc);
  },

  async createGroupGift(input: CreateGroupGiftInput) {
    const group: GroupGift = {
      id: nanoid(),
      slug: slugify(input.title || input.recipientName),
      organizerId: uid(),
      organizerName: input.organizerName,
      occasion: input.occasion,
      theme: input.theme,
      recipientName: input.recipientName,
      title: input.title,
      story: input.story,
      targetAmount: input.targetAmount,
      currency: input.currency,
      deadline: input.deadline,
      status: "open",
      contributions: [],
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(getDb(), COL.groupGifts, group.slug), group);
    return group;
  },

  async contributeToGroup(slug, contribution: ContributionData) {
    const c: Contribution = {
      id: nanoid(),
      name: contribution.anonymous ? "Anonymous" : contribution.name || "A friend",
      anonymous: contribution.anonymous,
      amount: contribution.amount,
      message: contribution.message,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(getDb(), COL.groupGifts, slug), { contributions: arrayUnion(c) });
    const updated = await this.getGroupGift(slug);
    if (!updated) throw new Error("Group gift not found");
    updated.contributions = [...updated.contributions].sort(byCreatedDesc);
    return updated;
  },

  /* ---------- Event gifting (client writes; no ledger) ---------- */

  async getEvent(slug) {
    const d = await getDoc(doc(getDb(), COL.events, slug));
    return d.exists() ? (d.data() as GiftEvent) : null;
  },

  async listEvents(userId = uid()) {
    const e = await snap<GiftEvent>(query(collection(getDb(), COL.events), where("organizerId", "==", userId)));
    return e.sort(byCreatedDesc);
  },

  async createEvent(input: CreateEventInput) {
    const event: GiftEvent = {
      id: nanoid(),
      slug: slugify(input.celebrants || input.title),
      organizerId: uid(),
      organizerName: input.organizerName,
      type: input.type,
      title: input.title,
      celebrants: input.celebrants,
      date: input.date,
      story: input.story,
      gradient: input.gradient,
      currency: input.currency,
      showTotal: input.showTotal,
      goalAmount: input.goalAmount,
      campaignMode: input.campaignMode,
      maxContribution: input.maxContribution,
      isPublic: input.isPublic,
      contributions: [],
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(getDb(), COL.events, event.slug), event);
    return event;
  },

  async updateEventSettings(slug, settings) {
    // Only write defined keys (Firestore rejects undefined values).
    const patch: Record<string, unknown> = {};
    if (settings.showTotal !== undefined) patch.showTotal = settings.showTotal;
    if (settings.soundTheme !== undefined) patch.soundTheme = settings.soundTheme;
    if (settings.goalAmount !== undefined) patch.goalAmount = settings.goalAmount;
    await updateDoc(doc(getDb(), COL.events, slug), patch);
    const updated = await this.getEvent(slug);
    if (!updated) throw new Error("Event not found");
    return updated;
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
