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
  /** Legacy plaintext answer; never include in public responses. */
  revealAnswer?: string;
  /** Server-only digest used for new question-gated gifts. */
  revealAnswerHash?: string;
  mystery: boolean; // hide amount until opened
  privateGift: boolean;

  status: GiftStatus;
  paymentStatus: PaymentStatus;
  claimStatus: ClaimStatus;
  /** Provider reference that funded the gift; present only after server verification. */
  paymentReference?: string;
  paymentProvider?: "flutterwave";
  providerTransactionId?: string | number;
  fundedAt?: string;

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

export type PublicGift = Omit<Gift,
  | "senderId"
  | "recipientPhone"
  | "recipientEmail"
  | "serviceFee"
  | "delivery"
  | "paymentStatus"
  | "revealAnswer"
  | "revealAnswerHash"
  | "paymentReference"
  | "paymentProvider"
  | "providerTransactionId"
  | "claimedByUserId"
  | "fundedAt"
> & { viewerRole: "public" };

export type GiftView = PublicGift | (Gift & { viewerRole: "sender" });

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
  /** Event-scoped opaque identity used for aggregation; never an email/phone. */
  contributorKey?: string;
  amount: number; // minor units
  platformFee?: number; // GiftCash revenue share in minor units
  netAmount?: number; // amount due to organizer/recipient after platform fee
  message?: string;
  table?: string; // optional table/seat tag (from a table QR code)
  paymentReference?: string; // provider/reference shown to the host as the alert id
  paymentProvider?: "flutterwave";
  providerTransactionId?: string | number;
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

export type PublicContribution = Pick<Contribution,
  "id" | "name" | "anonymous" | "amount" | "message" | "createdAt"
>;

export interface PublicGroupGift {
  viewerRole: "public";
  id: string;
  slug: string;
  organizerName: string;
  occasion: OccasionId;
  theme: ThemeId;
  recipientName: string;
  title: string;
  story?: string;
  targetAmount: number;
  currency: CurrencyCode;
  deadline: string;
  contributions: PublicContribution[];
  status: GroupGiftStatus;
  createdAt: string;
}

export type GroupGiftView = PublicGroupGift | (GroupGift & { viewerRole: "organizer" });

/* ----- Occasion event commerce (tickets, RSVP, seating, check-in) ----- */
export type EventType = OccasionId | "concert" | "dinner" | "conference" | "fundraiser" | "party";
export type TicketStatus = "reserved" | "pending_payment" | "paid" | "cancelled" | "checked_in" | "refunded";
export type RsvpStatus = "invited" | "opened" | "yes" | "no" | "maybe" | "approved" | "checked_in" | "no_show";

/** Party-screen gift sound, shared so a phone "host console" can change it live. */
export type SoundTheme = "fanfare" | "chime" | "arcade" | "boom";

export interface EventTicketType {
  id: string;
  name: string;
  description?: string;
  price: number; // minor units; 0 = free RSVP pass
  currency: CurrencyCode;
  quantity: number;
  sold: number;
  benefits?: string[];
  saleStartsAt?: string;
  saleEndsAt?: string;
  active: boolean;
}

export interface EventTable {
  id: string;
  name: string;
  section?: string;
  capacity: number;
  price?: number; // minor units for whole-table sale/reservation
  currency: CurrencyCode;
  buyerName?: string;
  buyerEmail?: string;
  paymentStatus?: PaymentStatus | "reserved";
  assignedGuestIds: string[];
}

export interface EventGuest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: "family" | "friend" | "colleague" | "vip" | "vendor" | "media" | "protocol" | "sponsor" | "other";
  rsvpStatus: RsvpStatus;
  plusOnes: number;
  tableId?: string;
  seatLabel?: string;
  inviteCode: string;
  ticketId?: string;
  checkedInAt?: string;
  notes?: string;
  createdAt: string;
}

export interface EventTicket {
  id: string;
  eventSlug: string;
  ticketTypeId: string;
  buyerName: string;
  buyerEmail?: string;
  quantity: number;
  totalAmount: number;
  platformFee?: number;
  netAmount?: number;
  currency: CurrencyCode;
  status: TicketStatus;
  qrCode: string;
  tableId?: string;
  guestIds: string[];
  paymentReference?: string;
  createdAt: string;
  checkedInAt?: string;
}

export interface GiftEvent {
  id: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  type: EventType;
  title: string;
  celebrants: string;
  date: string; // ISO event start date/time (legacy events may be date-only midnight)
  startsAt?: string; // ISO party window start — used by the bank-alert scheduler
  endsAt?: string; // ISO party window end — bank-alert polling is disabled after this
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
  contributions: Contribution[];
  createdAt: string;
}

/** Explicit, allowlisted Gift Party view safe for unauthenticated visitors. */
export interface PublicGiftParty {
  viewerRole: "public";
  slug: string;
  type: EventType;
  title: string;
  celebrants: string;
  date: string;
  gradient: [string, string];
  currency: CurrencyCode;
  campaignMode?: boolean;
  maxContribution?: number;
  isPublic: true;
  contributionCount: number;
}

export type OrganizerGiftParty = GiftEvent & {
  viewerRole: "organizer";
  contributionCount: number;
  contributionTotal: number;
};

export type AdminGiftParty = GiftEvent & {
  viewerRole: "admin";
  contributionCount: number;
  contributionTotal: number;
};

export type GiftPartyView = PublicGiftParty | OrganizerGiftParty | AdminGiftParty;

/* ----- Gift Party Moments Album ----- */
export type AlbumPhase = "pre" | "post";
export type AlbumPhotoStatus = "pending" | "approved" | "rejected";

export interface EventAlbumConfig {
  eventId: string;
  eventSlug: string;
  enabled: boolean;
  guestUploadsEnabled: boolean;
  coverPhotoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAlbumPhoto {
  id: string;
  eventId: string;
  eventSlug: string;
  uploaderId: string;
  uploaderName: string;
  phase: AlbumPhase;
  status: AlbumPhotoStatus;
  caption?: string;
  imagePath: string;
  thumbnailPath: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

export interface PublicAlbumPhoto {
  id: string;
  phase: AlbumPhase;
  caption?: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
}

export interface PublicAlbumPayload {
  enabled: boolean;
  guestUploadsEnabled: boolean;
  coverPhotoId?: string;
  photos: PublicAlbumPhoto[];
}
