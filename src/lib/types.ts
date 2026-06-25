/* ------------------------------------------------------------------ *
 * Gift Cash — Domain types & canonical statuses
 * Shared by the data layer, UI and (later) Firebase repositories.
 * ------------------------------------------------------------------ */

export type CurrencyCode = "NGN" | "USD" | "GBP" | "GHS" | "KES" | "ZAR";

export type OccasionId =
  | "birthday"
  | "wedding"
  | "valentine"
  | "graduation"
  | "anniversary"
  | "baby_shower"
  | "naming"
  | "housewarming"
  | "religious"
  | "congratulations"
  | "thank_you"
  | "custom";

export type ThemeId =
  | "luxury_box"
  | "digital_envelope"
  | "birthday_cake"
  | "ring_box"
  | "heart_burst"
  | "graduation_cap"
  | "bouquet"
  | "confetti"
  | "fireworks"
  | "minimal_card"
  | "african"
  | "corporate";

/* ----- Canonical statuses (spec section R) ----- */
export type GiftStatus =
  | "draft"
  | "pending_payment"
  | "funded"
  | "delivered"
  | "opened"
  | "claimed"
  | "expired"
  | "refunded"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "successful"
  | "failed"
  | "abandoned"
  | "refunded";

export type ClaimStatus = "pending" | "verified" | "claimed" | "rejected";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "reversed";

export type DeliveryMethod =
  | "whatsapp"
  | "sms"
  | "email"
  | "qr"
  | "link"
  | "schedule";

export type RevealGate = "tap" | "hold" | "swipe" | "question";

/* ----- Ledger (spec section E) — append-only, never a bare balance ----- */
export type LedgerType =
  | "gift_funded"
  | "gift_claimed"
  | "gift_expired"
  | "gift_refunded"
  | "wallet_credit"
  | "wallet_debit"
  | "withdrawal_requested"
  | "withdrawal_completed"
  | "withdrawal_failed"
  | "merchant_spend"
  | "admin_adjustment";

export type LedgerDirection = "credit" | "debit";

export interface LedgerEntry {
  id: string;
  userId: string;
  walletId: string;
  transactionType: LedgerType;
  amount: number; // minor units (kobo/cents)
  currency: CurrencyCode;
  direction: LedgerDirection;
  reference: string;
  status: "pending" | "settled" | "reversed";
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO
}

export interface Wallet {
  id: string;
  userId: string;
  currency: CurrencyCode;
  /** Derived from the ledger — never authoritative on its own. */
  available: number;
  pending: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  country: string;
  currency: CurrencyCode;
  kycStatus: "none" | "pending" | "verified" | "rejected";
  role: "user" | "admin";
  createdAt: string;
}

export interface GiftMedia {
  type: "image" | "video" | "audio";
  url: string;
  caption?: string;
}

export interface Gift {
  id: string;
  slug: string;
  senderId: string;
  senderName: string;
  anonymous: boolean;

  occasion: OccasionId;
  theme: ThemeId;

  recipientName: string;
  recipientNickname?: string;
  recipientPhone?: string;
  recipientEmail?: string;

  amount: number; // minor units
  currency: CurrencyCode;
  serviceFee: number; // minor units
  addOns: GiftAddOns;

  message: string;
  media: GiftMedia[];

  delivery: DeliveryMethod;
  scheduledAt?: string; // ISO — unlock time
  revealGate: RevealGate;
  revealQuestion?: string;
  revealAnswer?: string;
  mystery: boolean; // hide amount until opened
  privateGift: boolean;

  status: GiftStatus;
  paymentStatus: PaymentStatus;
  claimStatus: ClaimStatus;

  createdAt: string;
  expiresAt: string; // default +30 days
  openedAt?: string;
  claimedAt?: string;
  claimedByUserId?: string;

  thankYou?: ThankYou;
}

export interface GiftAddOns {
  premiumAnimation: boolean;
  printedCard: boolean;
  scheduledSurprise: boolean;
  videoMessage: boolean;
}

export interface ThankYou {
  message?: string;
  emoji?: string;
  createdAt: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  currency: CurrencyCode;
  bank: BankAccount;
  status: WithdrawalStatus;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  reference: string;
}

/* ----- Payment provider abstraction (spec section C, step 7) ----- */
export interface ChargeRequest {
  amount: number;
  currency: CurrencyCode;
  reference: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  reference: string;
  status: PaymentStatus;
  provider: string;
  raw?: unknown;
}

export interface PaymentProvider {
  name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/* ----- Group gifting (spec section G) ----- */
export interface Contribution {
  id: string;
  name: string; // display name, or "Anonymous"
  anonymous: boolean;
  amount: number; // minor units
  message?: string;
  table?: string; // optional table/seat tag (from a table QR code)
  paymentReference?: string; // provider/reference shown to the host as the alert id
  settlementStatus?: "pending" | "forwarded" | "failed"; // provider payout status
  settlementAccountLast4?: string; // transparency-only; never expose full account publicly
  createdAt: string;
}

export type GroupGiftStatus = "open" | "closed" | "delivered";

export interface GroupGift {
  id: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  occasion: OccasionId;
  theme: ThemeId;
  recipientName: string;
  title: string;
  story?: string;
  targetAmount: number; // minor units
  currency: CurrencyCode;
  deadline: string; // ISO
  contributions: Contribution[];
  status: GroupGiftStatus;
  createdAt: string;
}

/* ----- Event gifting (spec section H) ----- */
export type EventType = OccasionId;

/** Party-screen gift sound, shared so a phone "host console" can change it live. */
export type SoundTheme = "fanfare" | "chime" | "arcade" | "boom";

export interface GiftEvent {
  id: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  type: EventType;
  title: string;
  celebrants: string;
  date: string; // ISO event date
  story?: string;
  gradient: [string, string];
  currency: CurrencyCode;
  showTotal: boolean; // total received visible to guests
  goalAmount?: number; // optional fundraising goal (minor units) → thermometer
  soundTheme?: SoundTheme; // big-screen gift sound (host-controllable, live)
  campaignMode?: boolean; // donor-info capture + caps (e.g. political fundraising)
  maxContribution?: number; // cap per contribution in campaign mode (minor units)
  settlementAccount?: BankAccount; // account where event gifts are routed/settled
  payoutProvider?: "paystack" | "manual";
  isPublic: boolean;
  contributions: Contribution[];
  createdAt: string;
}
