#!/usr/bin/env node
/**
 * GiftCash payment simulator.
 *
 * Seeds deterministic Firestore documents that exercise the full money journey
 * without charging a real card or sending a live bank transfer:
 *  - successful and failed gift payments
 *  - gift claim wallet credit
 *  - group/event/campaign contributions
 *  - withdrawal requested, completed, and failed/reversed states
 *
 * Auth: uses FIREBASE_TOKEN if present, otherwise the Firebase CLI refresh token
 * from `firebase login`. Does not print secrets.
 */
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import querystring from "node:querystring";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "giftcash-d0f57";
const ADMIN_UID = process.env.ADMIN_UID || "JQBQlqeKTidmw0gkVQY9szaM5dk1";
const BASE_URL = process.env.GIFTCASH_BASE_URL || "https://giftcash--giftcash-d0f57.us-central1.hosted.app";
const NOW = new Date().toISOString();
const day = 86_400_000;
const daysFromNow = (n) => new Date(Date.now() + n * day).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString();
const toMinor = (n) => Math.round(n * 100);
const serviceFee = (amount) => Math.round(amount * 0.015);

const FIREBASE_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

function req({ host, path, method = "GET", token, body, contentType = "application/json" }) {
  const payload = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (payload !== undefined) {
      headers["content-type"] = contentType;
      headers["content-length"] = Buffer.byteLength(payload);
    }
    const r = https.request({ host, path, method, headers }, (res) => {
      let text = "";
      res.on("data", (d) => (text += d));
      res.on("end", () => {
        let parsed = text;
        try { parsed = text ? JSON.parse(text) : {}; } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on("error", reject);
    if (payload !== undefined) r.write(payload);
    r.end();
  });
}

function firebaseCliRefreshToken() {
  const cfgPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  if (!fs.existsSync(cfgPath)) return undefined;
  const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  return parsed.tokens?.refresh_token;
}

async function accessToken() {
  if (process.env.FIREBASE_TOKEN) return process.env.FIREBASE_TOKEN;
  const refreshToken = firebaseCliRefreshToken();
  if (!refreshToken) throw new Error("No FIREBASE_TOKEN or Firebase CLI login found.");
  const form = querystring.stringify({
    refresh_token: refreshToken,
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await req({
    host: "accounts.google.com",
    path: "/o/oauth2/token",
    method: "POST",
    body: form,
    contentType: "application/x-www-form-urlencoded",
  });
  if (res.status !== 200) throw new Error(`Could not refresh Firebase CLI token (${res.status}).`);
  return res.body.access_token;
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean).filter((v) => v !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)]),
    );
  }
  return value === undefined ? undefined : value;
}

function fieldValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fieldValue) } };
  if (value && typeof value === "object") return { mapValue: { fields: fields(value) } };
  throw new Error(`Unsupported Firestore value: ${value}`);
}
function fields(obj) {
  return Object.fromEntries(Object.entries(clean(obj)).map(([k, v]) => [k, fieldValue(v)]));
}

async function patchDoc(token, docPath, data, mergeFields) {
  const qs = mergeFields?.length ? `?${mergeFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&")}` : "";
  const res = await req({
    host: "firestore.googleapis.com",
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}${qs}`,
    method: "PATCH",
    token,
    body: { fields: fields(data) },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed writing ${docPath}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function getDoc(token, docPath) {
  const res = await req({
    host: "firestore.googleapis.com",
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
    token,
  });
  return res.status === 200 ? res.body : null;
}

const giftBase = {
  senderId: "pay-sim-sender",
  senderName: "Payment Simulator Sender",
  anonymous: false,
  occasion: "birthday",
  theme: "digital_envelope",
  currency: "NGN",
  addOns: { premiumAnimation: false, printedCard: false, scheduledSurprise: false, videoMessage: false },
  media: [],
  delivery: "link",
  revealGate: "tap",
  mystery: true,
  privateGift: false,
};

function gift({ slug, id, recipientName, amount, paymentStatus, status, claimStatus, claimedByUserId, openedAt, claimedAt }) {
  const fee = paymentStatus === "successful" ? serviceFee(amount) : 0;
  return {
    ...giftBase,
    id,
    slug,
    recipientName,
    amount,
    serviceFee: fee,
    message: `Payment simulator gift for ${recipientName}.`,
    status,
    paymentStatus,
    claimStatus,
    createdAt: daysAgo(1),
    expiresAt: daysFromNow(29),
    openedAt,
    claimedAt,
    claimedByUserId,
  };
}

function ledger({ id, userId, transactionType, amount, direction, reference, status = "settled", metadata = {} }) {
  return {
    id,
    userId,
    walletId: `wallet-${userId}`,
    transactionType,
    amount,
    currency: "NGN",
    direction,
    reference,
    status,
    metadata,
    createdAt: NOW,
  };
}

async function run() {
  const token = await accessToken();
  const docs = [];
  const add = (docPath, data, mergeFields) => docs.push({ docPath, data, mergeFields });

  add("_app/paymentSimulator", {
    id: "paymentSimulator",
    projectId: PROJECT_ID,
    mode: "firestore-sandbox",
    warning: "Seeded test data only. No real card charge or bank transfer occurred.",
    updatedAt: NOW,
    scenarios: [
      "gift_payment_success",
      "gift_payment_failed",
      "gift_claim_wallet_credit",
      "group_contribution_success",
      "event_contribution_success",
      "campaign_contribution_success",
      "withdrawal_pending",
      "withdrawal_completed",
      "withdrawal_failed_reversed",
    ],
  });

  add("profiles/pay-sim-sender", {
    id: "pay-sim-sender",
    fullName: "Payment Simulator Sender",
    email: "sender+payments@giftcash.app",
    country: "NG",
    currency: "NGN",
    kycStatus: "verified",
    role: "user",
    createdAt: daysAgo(20),
    updatedAt: NOW,
  });
  add("profiles/pay-sim-recipient", {
    id: "pay-sim-recipient",
    fullName: "Payment Simulator Recipient",
    email: "recipient+payments@giftcash.app",
    country: "NG",
    currency: "NGN",
    kycStatus: "verified",
    role: "user",
    createdAt: daysAgo(20),
    updatedAt: NOW,
  });
  add(`profiles/${ADMIN_UID}`, {
    id: ADMIN_UID,
    role: "admin",
    kycStatus: "verified",
    updatedAt: NOW,
  }, ["id", "role", "kycStatus", "updatedAt"]);

  const successAmount = toMinor(12500);
  const claimedAmount = toMinor(18000);
  add("gifts/pay-sim-success", gift({
    id: "pay-sim-success",
    slug: "pay-sim-success",
    recipientName: "Successful Payment",
    amount: successAmount,
    paymentStatus: "successful",
    status: "delivered",
    claimStatus: "pending",
  }));
  add("gifts/pay-sim-failed", gift({
    id: "pay-sim-failed",
    slug: "pay-sim-failed",
    recipientName: "Failed Payment",
    amount: toMinor(9000),
    paymentStatus: "failed",
    status: "pending_payment",
    claimStatus: "pending",
  }));
  add("gifts/pay-sim-claimed", gift({
    id: "pay-sim-claimed",
    slug: "pay-sim-claimed",
    recipientName: "Claimed Payment",
    amount: claimedAmount,
    paymentStatus: "successful",
    status: "claimed",
    claimStatus: "claimed",
    openedAt: daysAgo(1),
    claimedAt: NOW,
    claimedByUserId: "pay-sim-recipient",
  }));

  add("ledger_entries/pay-sim-sender-topup", ledger({
    id: "pay-sim-sender-topup",
    userId: "pay-sim-sender",
    transactionType: "wallet_credit",
    amount: toMinor(200000),
    direction: "credit",
    reference: "pay-sim-topup",
    metadata: { source: "payment simulator" },
  }));
  add("ledger_entries/pay-sim-success-debit", ledger({
    id: "pay-sim-success-debit",
    userId: "pay-sim-sender",
    transactionType: "gift_funded",
    amount: successAmount + serviceFee(successAmount),
    direction: "debit",
    reference: "pay-sim-success",
    metadata: { recipient: "Successful Payment", provider: "simulator", providerReference: "SIM-SUCCESS-001" },
  }));
  add("ledger_entries/pay-sim-claimed-debit", ledger({
    id: "pay-sim-claimed-debit",
    userId: "pay-sim-sender",
    transactionType: "gift_funded",
    amount: claimedAmount + serviceFee(claimedAmount),
    direction: "debit",
    reference: "pay-sim-claimed",
    metadata: { recipient: "Claimed Payment", provider: "simulator", providerReference: "SIM-CLAIMED-001" },
  }));
  add("ledger_entries/pay-sim-claimed-credit", ledger({
    id: "pay-sim-claimed-credit",
    userId: "pay-sim-recipient",
    transactionType: "gift_claimed",
    amount: claimedAmount,
    direction: "credit",
    reference: "pay-sim-claimed",
    metadata: { from: "Payment Simulator Sender" },
  }));

  add("groupGifts/pay-sim-group", {
    id: "pay-sim-group",
    slug: "pay-sim-group",
    organizerId: "pay-sim-sender",
    organizerName: "Payment Simulator Sender",
    occasion: "birthday",
    theme: "luxury_box",
    recipientName: "Group Recipient",
    title: "Payment simulator group gift",
    story: "Use this page to test a group gift contribution without a real charge.",
    targetAmount: toMinor(250000),
    currency: "NGN",
    deadline: daysFromNow(14),
    status: "open",
    createdAt: daysAgo(1),
    contributions: [
      { id: "pay-sim-group-contrib-success", name: "Simulated Contributor", anonymous: false, amount: toMinor(25000), message: "Group payment simulation successful.", createdAt: NOW },
    ],
  });

  add("events/pay-sim-event", {
    id: "pay-sim-event",
    slug: "pay-sim-event",
    organizerId: "pay-sim-sender",
    organizerName: "Payment Simulator Sender",
    type: "wedding",
    title: "Payment Simulator Event",
    celebrants: "Payment & Simulator",
    date: daysFromNow(30),
    story: "Use this page to test event gifting and party-mode contribution updates.",
    gradient: ["#2e1065", "#e6b143"],
    currency: "NGN",
    showTotal: true,
    goalAmount: toMinor(1000000),
    soundTheme: "fanfare",
    isPublic: true,
    createdAt: daysAgo(1),
    contributions: [
      { id: "pay-sim-event-contrib-success", name: "Table 4 Guest", anonymous: false, amount: toMinor(40000), message: "Event payment simulation successful.", table: "4", createdAt: NOW },
    ],
  });

  add("events/pay-sim-campaign", {
    id: "pay-sim-campaign",
    slug: "pay-sim-campaign",
    organizerId: "pay-sim-sender",
    organizerName: "Payment Simulator Sender",
    type: "anniversary",
    title: "Payment Simulator Campaign",
    celebrants: "Campaign Compliance Test",
    date: daysFromNow(45),
    story: "Use this page to test campaign-mode donor name and contribution cap enforcement.",
    gradient: ["#022c22", "#e6b143"],
    currency: "NGN",
    showTotal: true,
    goalAmount: toMinor(2000000),
    campaignMode: true,
    maxContribution: toMinor(50000),
    soundTheme: "chime",
    isPublic: true,
    createdAt: daysAgo(1),
    contributions: [
      { id: "pay-sim-campaign-contrib-success", name: "Named Donor", anonymous: false, amount: toMinor(50000), message: "Campaign payment simulation at cap.", createdAt: NOW },
    ],
  });

  const pendingWd = toMinor(10000);
  const completedWd = toMinor(12000);
  const failedWd = toMinor(8000);
  add("withdrawals/pay-sim-withdrawal-pending", {
    id: "pay-sim-withdrawal-pending",
    userId: "pay-sim-recipient",
    amount: pendingWd,
    currency: "NGN",
    bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Payment Simulator Recipient" },
    status: "pending",
    createdAt: NOW,
    reference: "pay-sim-wd-pending",
  });
  add("ledger_entries/pay-sim-wd-pending-reservation", ledger({
    id: "pay-sim-wd-pending-reservation",
    userId: "pay-sim-recipient",
    transactionType: "withdrawal_requested",
    amount: pendingWd,
    direction: "debit",
    reference: "pay-sim-wd-pending",
    status: "pending",
    metadata: { withdrawalId: "pay-sim-withdrawal-pending", bank: "GTBank", accountLast4: "6789" },
  }));
  add("withdrawals/pay-sim-withdrawal-completed", {
    id: "pay-sim-withdrawal-completed",
    userId: "pay-sim-recipient",
    amount: completedWd,
    currency: "NGN",
    bank: { bankName: "Access Bank", accountNumber: "9876543210", accountName: "Payment Simulator Recipient" },
    status: "completed",
    createdAt: daysAgo(2),
    processedAt: NOW,
    processedBy: ADMIN_UID,
    reference: "pay-sim-wd-completed",
  });
  add("ledger_entries/pay-sim-wd-completed-reservation", ledger({
    id: "pay-sim-wd-completed-reservation",
    userId: "pay-sim-recipient",
    transactionType: "withdrawal_requested",
    amount: completedWd,
    direction: "debit",
    reference: "pay-sim-wd-completed",
    status: "settled",
    metadata: { withdrawalId: "pay-sim-withdrawal-completed", bank: "Access Bank", accountLast4: "3210" },
  }));
  add("ledger_entries/pay-sim-wd-completed-audit", ledger({
    id: "pay-sim-wd-completed-audit",
    userId: "pay-sim-recipient",
    transactionType: "withdrawal_completed",
    amount: 0,
    direction: "debit",
    reference: "pay-sim-wd-completed",
    metadata: { withdrawalId: "pay-sim-withdrawal-completed", processedBy: ADMIN_UID, note: "payout settled by simulator" },
  }));
  add("withdrawals/pay-sim-withdrawal-failed", {
    id: "pay-sim-withdrawal-failed",
    userId: "pay-sim-recipient",
    amount: failedWd,
    currency: "NGN",
    bank: { bankName: "UBA", accountNumber: "1111222233", accountName: "Payment Simulator Recipient" },
    status: "failed",
    createdAt: daysAgo(3),
    processedAt: NOW,
    processedBy: ADMIN_UID,
    reference: "pay-sim-wd-failed",
  });
  add("ledger_entries/pay-sim-wd-failed-reservation", ledger({
    id: "pay-sim-wd-failed-reservation",
    userId: "pay-sim-recipient",
    transactionType: "withdrawal_requested",
    amount: failedWd,
    direction: "debit",
    reference: "pay-sim-wd-failed",
    status: "reversed",
    metadata: { withdrawalId: "pay-sim-withdrawal-failed", bank: "UBA", accountLast4: "2233" },
  }));

  add("wallets/pay-sim-sender", { id: "wallet-pay-sim-sender", userId: "pay-sim-sender", currency: "NGN", note: "Balance is derived from ledger_entries.", updatedAt: NOW });
  add("wallets/pay-sim-recipient", { id: "wallet-pay-sim-recipient", userId: "pay-sim-recipient", currency: "NGN", note: "Balance is derived from ledger_entries.", updatedAt: NOW });
  add("admin_audit_logs/pay-sim-seeded", {
    id: "pay-sim-seeded",
    action: "payment_simulator_seeded",
    targetType: "project",
    targetId: PROJECT_ID,
    reviewedBy: ADMIN_UID,
    createdAt: NOW,
  });

  let wrote = 0;
  for (const doc of docs) {
    await patchDoc(token, doc.docPath, doc.data, doc.mergeFields);
    wrote += 1;
  }

  const verificationPaths = [
    "_app/paymentSimulator",
    "profiles/pay-sim-sender",
    "profiles/pay-sim-recipient",
    "gifts/pay-sim-success",
    "gifts/pay-sim-failed",
    "gifts/pay-sim-claimed",
    "groupGifts/pay-sim-group",
    "events/pay-sim-event",
    "events/pay-sim-campaign",
    "withdrawals/pay-sim-withdrawal-pending",
    "withdrawals/pay-sim-withdrawal-completed",
    "withdrawals/pay-sim-withdrawal-failed",
  ];
  const verified = [];
  for (const p of verificationPaths) {
    const doc = await getDoc(token, p);
    verified.push({ path: p, exists: Boolean(doc?.name) });
  }

  console.log(JSON.stringify({
    projectId: PROJECT_ID,
    mode: "firestore-sandbox-no-real-money",
    wrote,
    verified,
    testUrls: {
      successfulGift: `${BASE_URL}/gift/pay-sim-success`,
      failedGift: `${BASE_URL}/gift/pay-sim-failed`,
      claimedGift: `${BASE_URL}/gift/pay-sim-claimed`,
      groupGift: `${BASE_URL}/group/pay-sim-group`,
      eventGift: `${BASE_URL}/event/pay-sim-event`,
      eventLiveScreen: `${BASE_URL}/event/pay-sim-event/live`,
      campaignGift: `${BASE_URL}/event/pay-sim-campaign`,
      adminWithdrawals: `${BASE_URL}/admin/withdrawals`,
      dashboardWithdraw: `${BASE_URL}/dashboard/withdraw`,
    },
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
