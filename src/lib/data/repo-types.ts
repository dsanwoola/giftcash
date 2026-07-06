import type {
  BankAccount,
  CurrencyCode,
  EventType,
  Gift,
  GiftEvent,
  GroupGift,
  LedgerEntry,
  OccasionId,
  EventTicketType,
  EventTable,
  EventGuest,
  EventTicket,
  ThankYou,
  ThemeId,
  UserProfile,
  Wallet,
  Withdrawal,
} from "../types";

/* ------------------------------------------------------------------ *
 * GiftRepo — the data-access contract.
 * Implemented by `demoRepo` (localStorage) and `firestoreRepo` (Firebase).
 * `repo` (see ./repo) selects one at runtime based on Firebase config.
 * ------------------------------------------------------------------ */

export interface CreateGiftInput {
  occasion: OccasionId;
  theme: ThemeId;
  recipientName: string;
  recipientNickname?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  amount: number; // minor units
  currency: CurrencyCode;
  message: string;
  delivery: Gift["delivery"];
  scheduledAt?: string;
  revealGate: Gift["revealGate"];
  revealQuestion?: string;
  revealAnswer?: string;
  mystery: boolean;
  privateGift: boolean;
  anonymous: boolean;
  addOns: Gift["addOns"];
  senderName: string;
}

export interface CreateGroupGiftInput {
  recipientName: string;
  title: string;
  story?: string;
  occasion: OccasionId;
  theme: ThemeId;
  targetAmount: number;
  currency: CurrencyCode;
  deadline: string;
  organizerName: string;
}

export interface CreateEventInput {
  type: EventType;
  title: string;
  celebrants: string;
  date: string;
  startsAt?: string;
  endsAt?: string;
  story?: string;
  gradient: [string, string];
  currency: CurrencyCode;
  showTotal: boolean;
  goalAmount?: number;
  campaignMode?: boolean;
  maxContribution?: number;
  settlementAccount?: BankAccount;
  payoutProvider?: "paystack" | "manual";
  revenuePlan?: "starter" | "pro" | "enterprise";
  isPublic: boolean;
  ticketingEnabled?: boolean;
  rsvpEnabled?: boolean;
  seatingEnabled?: boolean;
  checkInEnabled?: boolean;
  ticketTypes?: EventTicketType[];
  tables?: EventTable[];
  guests?: EventGuest[];
  tickets?: EventTicket[];
  organizerName: string;
}

/** Live, host-controllable display settings (driven by the phone host console). */
export type EventSettings = Partial<
  Pick<GiftEvent, "showTotal" | "soundTheme" | "goalAmount">
>;

export interface ContributionData {
  name: string;
  anonymous: boolean;
  amount: number; // minor units
  message?: string;
  table?: string;
}

export interface AdminStats {
  totalGifts: number;
  totalGiftValue: number;
  claimedGifts: number;
  unclaimedGifts: number;
  totalUsers: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  failedPayments: number;
  groupGifts: number;
  events: number;
  contributionsValue: number;
  pendingKyc: number;
}

export interface GiftRepo {
  /** The signed-in user's id (demo: a fixed id; Firebase: auth uid). */
  currentUserId(): string;

  // Gifts
  getGift(slug: string): Promise<Gift | null>;
  listSentGifts(userId?: string): Promise<Gift[]>;
  listReceivedGifts(userId?: string): Promise<Gift[]>;
  createGift(input: CreateGiftInput): Promise<Gift>;
  markOpened(slug: string): Promise<void>;
  claimGift(slug: string, claimerUserId: string): Promise<Gift>;
  saveThankYou(slug: string, thankYou: ThankYou): Promise<void>;

  // Wallet & withdrawals
  getWallet(userId?: string): Promise<Wallet>;
  getLedger(userId?: string): Promise<LedgerEntry[]>;
  requestWithdrawal(userId: string, amount: number, bank: BankAccount): Promise<Withdrawal>;
  listWithdrawals(userId: string): Promise<Withdrawal[]>;

  // Group gifting
  getGroupGift(slug: string): Promise<GroupGift | null>;
  listGroupGifts(userId?: string): Promise<GroupGift[]>;
  createGroupGift(input: CreateGroupGiftInput): Promise<GroupGift>;
  contributeToGroup(slug: string, contribution: ContributionData): Promise<GroupGift>;

  // Event gifting
  getEvent(slug: string): Promise<GiftEvent | null>;
  listEvents(userId?: string): Promise<GiftEvent[]>;
  createEvent(input: CreateEventInput): Promise<GiftEvent>;
  contributeToEvent(slug: string, contribution: ContributionData): Promise<GiftEvent>;
  /** Host console: change live display settings (shown on the big screen). */
  updateEventSettings(slug: string, settings: EventSettings): Promise<GiftEvent>;
  /** Live updates for the party screen. Returns an unsubscribe function. */
  subscribeEvent(slug: string, cb: (event: GiftEvent | null) => void): () => void;

  // Admin
  listAllGifts(): Promise<Gift[]>;
  listAllWithdrawals(): Promise<Withdrawal[]>;
  listUsers(): Promise<UserProfile[]>;
  getProfile(userId?: string): Promise<UserProfile | null>;
  requestKycReview(userId?: string): Promise<UserProfile>;
  updateUserKyc(userId: string, status: UserProfile["kycStatus"]): Promise<UserProfile>;
  processWithdrawal(id: string, action: "complete" | "fail"): Promise<Withdrawal>;
  adminStats(): Promise<AdminStats>;

  /** Demo-only: reset to seed data. No-op on Firebase. */
  reset(): Promise<void>;
}
