import { nanoid } from "nanoid";
import { serviceFee, toMinor } from "../money";
import type {
  GiftEvent,
  GroupGift,
  Gift,
  LedgerEntry,
  UserProfile,
  Withdrawal,
} from "../types";

export const DEMO_USER_ID = "demo-sender";

const now = Date.now();
const days = (n: number) => new Date(now + n * 86_400_000).toISOString();
const ago = (n: number) => new Date(now - n * 86_400_000).toISOString();

export interface Store {
  users: Record<string, UserProfile>;
  gifts: Record<string, Gift>; // keyed by slug
  ledger: LedgerEntry[];
  withdrawals: import("../types").Withdrawal[];
  groupGifts: Record<string, GroupGift>; // keyed by slug
  events: Record<string, GiftEvent>; // keyed by slug
}

export function buildSeed(): Store {
  const me: UserProfile = {
    id: DEMO_USER_ID,
    fullName: "Demo Sender",
    email: "demo@giftcash.app",
    country: "NG",
    currency: "NGN",
    kycStatus: "verified",
    role: "user",
    createdAt: ago(40),
  };

  // The flagship sample journey: a birthday gift for Tolu (spec section V).
  const toluAmount = toMinor(25_000);
  const toluGift: Gift = {
    id: nanoid(),
    slug: "tolu-birthday",
    senderId: DEMO_USER_ID,
    senderName: "Demo Sender",
    anonymous: false,
    occasion: "birthday",
    theme: "birthday_cake",
    recipientName: "Tolu",
    amount: toluAmount,
    currency: "NGN",
    serviceFee: serviceFee(toluAmount),
    addOns: {
      premiumAnimation: true,
      printedCard: false,
      scheduledSurprise: false,
      videoMessage: false,
    },
    message:
      "Happy Birthday Tolu. You are deeply loved and celebrated. May this year bring you everything your heart has been quietly hoping for. Enjoy your day to the fullest! 🎂",
    media: [],
    delivery: "whatsapp",
    revealGate: "tap",
    mystery: true,
    privateGift: false,
    status: "delivered",
    paymentStatus: "successful",
    claimStatus: "pending",
    createdAt: ago(1),
    expiresAt: days(29),
  };

  // A second, already-claimed gift so dashboards/walls aren't empty.
  const amaAmount = toMinor(15_000);
  const amaGift: Gift = {
    id: nanoid(),
    slug: "ama-graduation",
    senderId: DEMO_USER_ID,
    senderName: "Demo Sender",
    anonymous: false,
    occasion: "graduation",
    theme: "graduation_cap",
    recipientName: "Ama",
    amount: amaAmount,
    currency: "NGN",
    serviceFee: serviceFee(amaAmount),
    addOns: { premiumAnimation: false, printedCard: false, scheduledSurprise: false, videoMessage: false },
    message: "Congratulations on your graduation, Ama! So proud of everything you've accomplished. 🎓",
    media: [],
    delivery: "link",
    revealGate: "tap",
    mystery: true,
    privateGift: false,
    status: "claimed",
    paymentStatus: "successful",
    claimStatus: "claimed",
    createdAt: ago(6),
    expiresAt: days(24),
    openedAt: ago(5),
    claimedAt: ago(5),
    claimedByUserId: "recipient-ama",
    thankYou: { message: "Thank you so much!! This means the world 🥹", emoji: "🥹", createdAt: ago(5) },
  };

  const wallet = `wallet-${DEMO_USER_ID}`;
  const ledger: LedgerEntry[] = [
    {
      id: nanoid(),
      userId: DEMO_USER_ID,
      walletId: wallet,
      transactionType: "wallet_credit",
      amount: toMinor(50_000),
      currency: "NGN",
      direction: "credit",
      reference: "topup-001",
      status: "settled",
      createdAt: ago(30),
    },
    {
      id: nanoid(),
      userId: DEMO_USER_ID,
      walletId: wallet,
      transactionType: "gift_funded",
      amount: toluGift.amount + toluGift.serviceFee,
      currency: "NGN",
      direction: "debit",
      reference: toluGift.slug,
      status: "settled",
      metadata: { recipient: "Tolu" },
      createdAt: ago(1),
    },
    {
      id: nanoid(),
      userId: DEMO_USER_ID,
      walletId: wallet,
      transactionType: "gift_funded",
      amount: amaGift.amount + amaGift.serviceFee,
      currency: "NGN",
      direction: "debit",
      reference: amaGift.slug,
      status: "settled",
      metadata: { recipient: "Ama" },
      createdAt: ago(6),
    },
  ];

  // A second user (the recipient of the Ama gift) with a pending withdrawal,
  // so the admin dashboard has cross-user data and an approval to action.
  const ama: UserProfile = {
    id: "recipient-ama",
    fullName: "Ama Mensah",
    email: "ama@example.com",
    country: "GH",
    currency: "NGN",
    kycStatus: "pending",
    role: "user",
    createdAt: ago(6),
  };
  const amaWallet = `wallet-${ama.id}`;
  ledger.push(
    {
      id: nanoid(),
      userId: ama.id,
      walletId: amaWallet,
      transactionType: "gift_claimed",
      amount: amaGift.amount,
      currency: "NGN",
      direction: "credit",
      reference: amaGift.slug,
      status: "settled",
      metadata: { from: "Demo Sender" },
      createdAt: ago(5),
    },
    {
      id: nanoid(),
      userId: ama.id,
      walletId: amaWallet,
      transactionType: "withdrawal_requested",
      amount: toMinor(10_000),
      currency: "NGN",
      direction: "debit",
      reference: "wd-seed-ama",
      status: "settled",
      metadata: { bank: "GTBank" },
      createdAt: ago(1),
    },
  );
  const amaWithdrawal: Withdrawal = {
    id: nanoid(),
    userId: ama.id,
    amount: toMinor(10_000),
    currency: "NGN",
    bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ama Mensah" },
    status: "pending",
    createdAt: ago(1),
    reference: "wd-seed-ama",
  };

  // Sample group gift pot: colleagues chipping in for Chidi's birthday.
  const groupGift: GroupGift = {
    id: nanoid(),
    slug: "chidi-birthday-pool",
    organizerId: DEMO_USER_ID,
    organizerName: "Demo Sender",
    occasion: "birthday",
    theme: "luxury_box",
    recipientName: "Chidi",
    title: "Chidi's surprise birthday gift 🎉",
    story:
      "Let's all chip in to spoil Chidi for the big 3-0! Any amount counts — drop a sweet message with your contribution.",
    targetAmount: toMinor(150_000),
    currency: "NGN",
    deadline: days(9),
    status: "open",
    createdAt: ago(3),
    contributions: [
      { id: nanoid(), name: "Bisi", anonymous: false, amount: toMinor(20_000), message: "Happy birthday Chidi! 🥳", createdAt: ago(3) },
      { id: nanoid(), name: "Anonymous", anonymous: true, amount: toMinor(15_000), message: "Enjoy your day!", createdAt: ago(2) },
      { id: nanoid(), name: "Emeka", anonymous: false, amount: toMinor(30_000), message: "Big 3-0! Let's gooo 🚀", createdAt: ago(1) },
    ],
  };

  // Sample wedding event page with a venue QR.
  const weddingEvent: GiftEvent = {
    id: nanoid(),
    slug: "tunde-and-zainab",
    organizerId: DEMO_USER_ID,
    organizerName: "Demo Sender",
    type: "wedding",
    title: "The wedding of Tunde & Zainab",
    celebrants: "Tunde & Zainab",
    date: days(14),
    story:
      "We're so glad you can celebrate with us! If you'd like to bless us with a cash gift, simply tap below or scan the QR at the venue. Thank you for your love. 💛",
    gradient: ["#2e1065", "#e6b143"],
    currency: "NGN",
    showTotal: false,
    goalAmount: toMinor(500_000),
    isPublic: true,
    createdAt: ago(10),
    contributions: [
      { id: nanoid(), name: "Aunty Ngozi", anonymous: false, amount: toMinor(50_000), message: "Congratulations my dears! Wishing you a blessed union. 🙏", createdAt: ago(2) },
      { id: nanoid(), name: "The Okafors", anonymous: false, amount: toMinor(100_000), message: "So happy for you both! ❤️", createdAt: ago(1) },
    ],
  };

  return {
    users: { [me.id]: me, [ama.id]: ama },
    gifts: { [toluGift.slug]: toluGift, [amaGift.slug]: amaGift },
    ledger,
    withdrawals: [amaWithdrawal],
    groupGifts: { [groupGift.slug]: groupGift },
    events: { [weddingEvent.slug]: weddingEvent },
  };
}
