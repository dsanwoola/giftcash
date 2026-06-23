"use client";

import { nanoid } from "nanoid";
import { limitForKyc } from "../compliance/limits";
import { serviceFee, toMinor } from "../money";
import type {
  BankAccount,
  Contribution,
  Gift,
  GiftEvent,
  GroupGift,
  LedgerEntry,
  LedgerType,
  ThankYou,
  UserProfile,
  Wallet,
  Withdrawal,
} from "../types";
import { buildSeed, DEMO_USER_ID, type Store } from "./seed";
import type {
  AdminStats,
  ContributionData,
  CreateEventInput,
  CreateGiftInput,
  CreateGroupGiftInput,
  GiftRepo,
} from "./repo-types";

/**
 * DEMO repo — persists to localStorage so the full sender → reveal → claim →
 * withdraw journey works with no backend. Mirrors the GiftRepo contract so the
 * Firestore implementation is a drop-in replacement.
 */

const KEY = "giftcash:v3";

function load(): Store {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return buildSeed();
  }
}

function save(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("giftcash:change"));
}

const slugify = (name: string) =>
  `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gift"}-${nanoid(6)}`;

const formatNaira = (minor: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(minor / 100);

function entry(
  userId: string,
  type: LedgerType,
  amount: number,
  direction: "credit" | "debit",
  reference: string,
  currency: Gift["currency"] = "NGN",
  status: LedgerEntry["status"] = "settled",
  metadata?: Record<string, unknown>,
): LedgerEntry {
  return {
    id: nanoid(),
    userId,
    walletId: `wallet-${userId}`,
    transactionType: type,
    amount,
    currency,
    direction,
    reference,
    status,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export const demoRepo: GiftRepo = {
  currentUserId: () => DEMO_USER_ID,

  async getGift(slug) {
    return load().gifts[slug] ?? null;
  },

  async listSentGifts(userId = DEMO_USER_ID) {
    return Object.values(load().gifts)
      .filter((g) => g.senderId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async listReceivedGifts(userId = DEMO_USER_ID) {
    return Object.values(load().gifts)
      .filter((g) => g.claimedByUserId === userId)
      .sort((a, b) => +new Date(b.claimedAt ?? 0) - +new Date(a.claimedAt ?? 0));
  },

  async createGift(input: CreateGiftInput) {
    const store = load();
    const fee = serviceFee(input.amount);
    const gift: Gift = {
      id: nanoid(),
      slug: slugify(input.recipientName),
      senderId: DEMO_USER_ID,
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
      // Payment is simulated as successful immediately in the demo.
      status: "delivered",
      paymentStatus: "successful",
      claimStatus: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    };
    store.gifts[gift.slug] = gift;
    store.ledger.push(
      entry(DEMO_USER_ID, "gift_funded", gift.amount + fee, "debit", gift.slug, gift.currency, "settled", {
        recipient: gift.recipientName,
      }),
    );
    save(store);
    return gift;
  },

  async markOpened(slug) {
    const store = load();
    const gift = store.gifts[slug];
    if (!gift || gift.openedAt) return;
    gift.openedAt = new Date().toISOString();
    if (gift.status === "delivered" || gift.status === "funded") gift.status = "opened";
    save(store);
  },

  async claimGift(slug, claimerUserId) {
    const store = load();
    const gift = store.gifts[slug];
    if (!gift) throw new Error("Gift not found");
    if (gift.claimStatus === "claimed") throw new Error("This gift has already been claimed.");
    if (gift.status === "expired") throw new Error("This gift has expired.");

    gift.claimStatus = "claimed";
    gift.status = "claimed";
    gift.claimedAt = new Date().toISOString();
    gift.claimedByUserId = claimerUserId;

    store.ledger.push(
      entry(claimerUserId, "gift_claimed", gift.amount, "credit", gift.slug, gift.currency, "settled", {
        from: gift.anonymous ? "Someone" : gift.senderName,
        occasion: gift.occasion,
      }),
    );
    save(store);
    return gift;
  },

  async saveThankYou(slug, thankYou: ThankYou) {
    const store = load();
    const gift = store.gifts[slug];
    if (!gift) return;
    gift.thankYou = thankYou;
    save(store);
  },

  async getWallet(userId = DEMO_USER_ID): Promise<Wallet> {
    const ledger = load().ledger.filter((e) => e.userId === userId);
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

  async getLedger(userId = DEMO_USER_ID) {
    return load()
      .ledger.filter((e) => e.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async requestWithdrawal(userId, amount, bank: BankAccount) {
    const store = load();
    if (!Number.isInteger(amount) || amount < toMinor(1_000)) throw new Error("Withdrawal amount must be at least ₦1,000.");
    const cleanBank: BankAccount = {
      bankName: bank.bankName.trim().replace(/\s+/g, " "),
      accountName: bank.accountName.trim().replace(/\s+/g, " "),
      accountNumber: bank.accountNumber.replace(/\D/g, ""),
    };
    if (!cleanBank.bankName || !cleanBank.accountName) throw new Error("Fill in all bank details.");
    if (!/^\d{10}$/.test(cleanBank.accountNumber)) throw new Error("Enter a valid 10-digit Nigerian account number.");
    const profile = store.users[userId];
    const limit = limitForKyc(profile?.kycStatus ?? "none");
    if (amount > limit.perWithdrawal) throw new Error(`Your ${limit.label} limit allows ${formatNaira(limit.perWithdrawal)} per withdrawal.`);
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const usedToday = store.withdrawals
      .filter((w) => w.userId === userId && ["pending", "processing", "completed"].includes(w.status) && +new Date(w.createdAt) >= since)
      .reduce((sum, w) => sum + w.amount, 0);
    if (usedToday + amount > limit.daily) throw new Error(`This request exceeds your daily withdrawal limit. ${limit.note}`);
    const wallet = await this.getWallet(userId);
    if (amount > wallet.available) throw new Error("Amount exceeds your available balance.");
    const withdrawal: Withdrawal = {
      id: nanoid(),
      userId,
      amount,
      currency: "NGN",
      bank: cleanBank,
      status: "pending",
      createdAt: new Date().toISOString(),
      reference: `wd-${nanoid(8)}`,
    };
    store.withdrawals.push(withdrawal);
    store.ledger.push(
      entry(userId, "withdrawal_requested", amount, "debit", withdrawal.reference, "NGN", "pending", {
        withdrawalId: withdrawal.id,
        bank: cleanBank.bankName,
        accountLast4: cleanBank.accountNumber.slice(-4),
      }),
    );
    save(store);
    return withdrawal;
  },

  async listWithdrawals(userId) {
    return load()
      .withdrawals.filter((w) => w.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  /* ----------------- Group gifting ----------------- */

  async getGroupGift(slug) {
    return load().groupGifts[slug] ?? null;
  },

  async listGroupGifts(userId = DEMO_USER_ID) {
    return Object.values(load().groupGifts)
      .filter((g) => g.organizerId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async createGroupGift(input: CreateGroupGiftInput) {
    const store = load();
    const group: GroupGift = {
      id: nanoid(),
      slug: slugify(input.title || input.recipientName),
      organizerId: DEMO_USER_ID,
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
    store.groupGifts[group.slug] = group;
    save(store);
    return group;
  },

  async contributeToGroup(slug, contribution: ContributionData) {
    const store = load();
    const group = store.groupGifts[slug];
    if (!group) throw new Error("Group gift not found");
    const c: Contribution = {
      id: nanoid(),
      name: contribution.anonymous ? "Anonymous" : contribution.name || "A friend",
      anonymous: contribution.anonymous,
      amount: contribution.amount,
      message: contribution.message,
      createdAt: new Date().toISOString(),
    };
    group.contributions.unshift(c);
    save(store);
    return group;
  },

  /* ----------------- Event gifting ----------------- */

  async getEvent(slug) {
    return load().events[slug] ?? null;
  },

  async listEvents(userId = DEMO_USER_ID) {
    return Object.values(load().events)
      .filter((e) => e.organizerId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async createEvent(input: CreateEventInput) {
    const store = load();
    const event: GiftEvent = {
      id: nanoid(),
      slug: slugify(input.celebrants || input.title),
      organizerId: DEMO_USER_ID,
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
    store.events[event.slug] = event;
    save(store);
    return event;
  },

  async updateEventSettings(slug, settings) {
    const store = load();
    const event = store.events[slug];
    if (!event) throw new Error("Event not found");
    if (settings.showTotal !== undefined) event.showTotal = settings.showTotal;
    if (settings.soundTheme !== undefined) event.soundTheme = settings.soundTheme;
    if (settings.goalAmount !== undefined) event.goalAmount = settings.goalAmount;
    save(store);
    return event;
  },

  async contributeToEvent(slug, contribution: ContributionData) {
    const store = load();
    const event = store.events[slug];
    if (!event) throw new Error("Event not found");
    // Campaign rules enforced in the data layer (not just the UI).
    if (event.campaignMode) {
      if (contribution.anonymous || !contribution.name.trim()) {
        throw new Error("Donor name is required for this campaign.");
      }
      if (event.maxContribution && contribution.amount > event.maxContribution) {
        throw new Error("This contribution exceeds the campaign limit.");
      }
    }
    const c: Contribution = {
      id: nanoid(),
      name: contribution.anonymous ? "Anonymous" : contribution.name || "A guest",
      anonymous: contribution.anonymous,
      amount: contribution.amount,
      message: contribution.message,
      table: contribution.table,
      createdAt: new Date().toISOString(),
    };
    event.contributions.unshift(c);
    save(store);
    return event;
  },

  subscribeEvent(slug, cb) {
    if (typeof window === "undefined") return () => {};
    const emit = () => cb(load().events[slug] ?? null);
    emit();
    // 'storage' fires in OTHER tabs (phone-vs-screen demo on one machine);
    // 'giftcash:change' fires in the same tab.
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === KEY) emit(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("giftcash:change", emit);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("giftcash:change", emit);
    };
  },

  /* ----------------- Admin ----------------- */

  async listAllGifts() {
    return Object.values(load().gifts).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async listAllWithdrawals() {
    return load().withdrawals.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async listUsers(): Promise<UserProfile[]> {
    return Object.values(load().users).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getProfile(userId = DEMO_USER_ID) {
    return load().users[userId] ?? null;
  },

  async requestKycReview(userId = DEMO_USER_ID) {
    const store = load();
    const user = store.users[userId];
    if (!user) throw new Error("User profile not found");
    if (user.kycStatus === "verified") return user;
    user.kycStatus = "pending";
    save(store);
    return user;
  },

  async updateUserKyc(userId, status) {
    const store = load();
    const user = store.users[userId];
    if (!user) throw new Error("User profile not found");
    user.kycStatus = status;
    save(store);
    return user;
  },

  async processWithdrawal(id, action) {
    const store = load();
    const w = store.withdrawals.find((x) => x.id === id);
    if (!w) throw new Error("Withdrawal not found");
    if (w.status !== "pending" && w.status !== "processing") {
      throw new Error("This withdrawal has already been processed.");
    }
    const now = new Date().toISOString();
    w.processedAt = now;
    const reservations = store.ledger.filter(
      (e) => e.userId === w.userId && e.reference === w.reference && e.transactionType === "withdrawal_requested",
    );
    if (action === "complete") {
      w.status = "completed";
      for (const reservation of reservations) {
        if (reservation.status === "pending") reservation.status = "settled";
      }
      store.ledger.push(
        entry(w.userId, "withdrawal_completed", 0, "debit", w.reference, w.currency, "settled", {
          withdrawalId: w.id,
          note: "payout settled",
        }),
      );
    } else {
      w.status = "failed";
      let restoredLegacyDebit = false;
      for (const reservation of reservations) {
        if (reservation.status === "pending") reservation.status = "reversed";
        else if (reservation.status === "settled") restoredLegacyDebit = true;
      }
      if (restoredLegacyDebit || reservations.length === 0) {
        store.ledger.push(
          entry(w.userId, "withdrawal_failed", w.amount, "credit", w.reference, w.currency, "settled", {
            withdrawalId: w.id,
            note: "reversed",
          }),
        );
      }
    }
    save(store);
    return w;
  },

  async adminStats(): Promise<AdminStats> {
    const store = load();
    const gifts = Object.values(store.gifts);
    const groups = Object.values(store.groupGifts);
    const events = Object.values(store.events);
    const unclaimedStatuses = new Set(["funded", "delivered", "opened"]);
    const contributionsValue =
      groups.reduce((s, g) => s + g.contributions.reduce((t, c) => t + c.amount, 0), 0) +
      events.reduce((s, e) => s + e.contributions.reduce((t, c) => t + c.amount, 0), 0);
    return {
      totalGifts: gifts.length,
      totalGiftValue: gifts.reduce((s, g) => s + g.amount, 0),
      claimedGifts: gifts.filter((g) => g.status === "claimed").length,
      unclaimedGifts: gifts.filter((g) => unclaimedStatuses.has(g.status)).length,
      totalUsers: Object.keys(store.users).length,
      totalWithdrawals: store.withdrawals.length,
      pendingWithdrawals: store.withdrawals.filter((w) => w.status === "pending" || w.status === "processing").length,
      failedPayments: gifts.filter((g) => g.paymentStatus === "failed").length,
      groupGifts: groups.length,
      events: events.length,
      contributionsValue,
      pendingKyc: Object.values(store.users).filter((u) => u.kycStatus === "pending").length,
    };
  },

  async reset() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
    load();
    window.dispatchEvent(new Event("giftcash:change"));
  },
};
