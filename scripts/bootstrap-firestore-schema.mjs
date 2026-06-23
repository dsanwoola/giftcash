#!/usr/bin/env node
/**
 * GiftCash Firestore bootstrap.
 *
 * Creates/updates the documents that define the production schema shape, seeds
 * safe demo data for public sample routes, and promotes the owner UID supplied
 * by ADMIN_UID (or the current known GiftCash owner UID) to admin.
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
const NOW = new Date().toISOString();
const day = 86_400_000;
const daysFromNow = (n) => new Date(Date.now() + n * day).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString();
const toMinor = (n) => Math.round(n * 100);

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

async function run() {
  const token = await accessToken();
  const docs = [];
  const add = (docPath, data, mergeFields) => docs.push({ docPath, data, mergeFields });

  add("_app/schema", {
    id: "schema",
    app: "GiftCash",
    projectId: PROJECT_ID,
    version: 1,
    status: "active",
    updatedAt: NOW,
    collections: {
      profiles: "User profile, role, KYC tier, public contact fields.",
      gifts: "One-to-one cash gift/reveal records keyed by public slug.",
      ledger_entries: "Append-only wallet ledger. Server-authoritative.",
      withdrawals: "Payout requests and processing state. Server-authoritative.",
      groupGifts: "Group contribution pots keyed by public slug.",
      events: "Event/party/QR gifting pages keyed by public slug.",
      admin_audit_logs: "Privileged admin/KYC/payout audit trail.",
      fraud_flags: "Admin-only fraud/compliance review flags.",
      wallets: "Optional wallet metadata; balances are derived from ledger_entries.",
    },
    money: "All money is stored as integer minor units: NGN kobo, USD cents, etc.",
  });
  add("_app/features", {
    id: "features",
    updatedAt: NOW,
    enabled: {
      emailAuth: true,
      googleAuth: true,
      phoneAuth: true,
      oneToOneGifts: true,
      walletLedger: true,
      withdrawals: true,
      kycLimits: true,
      groupGifts: true,
      eventPages: true,
      partyMode: true,
      tableQrCodes: true,
      campaignMode: true,
      adminDashboard: true,
    },
  });
  add("_healthcheck/status", { id: "status", ok: true, updatedAt: NOW });

  add("profiles/demo-sender", {
    id: "demo-sender",
    fullName: "Demo Sender",
    email: "demo@giftcash.app",
    country: "NG",
    currency: "NGN",
    kycStatus: "verified",
    role: "user",
    createdAt: daysAgo(40),
  });
  add("profiles/recipient-ama", {
    id: "recipient-ama",
    fullName: "Ama Mensah",
    email: "ama@example.com",
    country: "GH",
    currency: "NGN",
    kycStatus: "pending",
    role: "user",
    createdAt: daysAgo(6),
  });
  add(`profiles/${ADMIN_UID}`, {
    id: ADMIN_UID,
    fullName: "Deen Sanwoola",
    country: "NG",
    currency: "NGN",
    kycStatus: "verified",
    role: "admin",
    updatedAt: NOW,
    createdAt: NOW,
  }, ["id", "fullName", "country", "currency", "kycStatus", "role", "updatedAt", "createdAt"]);

  add("gifts/tolu-birthday", {
    id: "gift-tolu-birthday",
    slug: "tolu-birthday",
    senderId: "demo-sender",
    senderName: "Demo Sender",
    anonymous: false,
    occasion: "birthday",
    theme: "birthday_cake",
    recipientName: "Tolu",
    amount: toMinor(25000),
    currency: "NGN",
    serviceFee: toMinor(375),
    addOns: { premiumAnimation: true, printedCard: false, scheduledSurprise: false, videoMessage: false },
    message: "Happy Birthday Tolu. You are deeply loved and celebrated. May this year bring you everything your heart has been quietly hoping for. Enjoy your day to the fullest! 🎂",
    media: [],
    delivery: "whatsapp",
    revealGate: "tap",
    mystery: true,
    privateGift: false,
    status: "delivered",
    paymentStatus: "successful",
    claimStatus: "pending",
    createdAt: daysAgo(1),
    expiresAt: daysFromNow(29),
  });
  add("gifts/ama-graduation", {
    id: "gift-ama-graduation",
    slug: "ama-graduation",
    senderId: "demo-sender",
    senderName: "Demo Sender",
    anonymous: false,
    occasion: "graduation",
    theme: "graduation_cap",
    recipientName: "Ama",
    amount: toMinor(15000),
    currency: "NGN",
    serviceFee: toMinor(225),
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
    createdAt: daysAgo(6),
    expiresAt: daysFromNow(24),
    openedAt: daysAgo(5),
    claimedAt: daysAgo(5),
    claimedByUserId: "recipient-ama",
    thankYou: { message: "Thank you so much!! This means the world 🥹", emoji: "🥹", createdAt: daysAgo(5) },
  });

  add("groupGifts/chidi-birthday-pool", {
    id: "group-chidi-birthday-pool",
    slug: "chidi-birthday-pool",
    organizerId: "demo-sender",
    organizerName: "Demo Sender",
    occasion: "birthday",
    theme: "luxury_box",
    recipientName: "Chidi",
    title: "Chidi's surprise birthday gift 🎉",
    story: "Let's all chip in to spoil Chidi for the big 3-0! Any amount counts — drop a sweet message with your contribution.",
    targetAmount: toMinor(150000),
    currency: "NGN",
    deadline: daysFromNow(9),
    status: "open",
    createdAt: daysAgo(3),
    contributions: [
      { id: "contrib-bisi", name: "Bisi", anonymous: false, amount: toMinor(20000), message: "Happy birthday Chidi! 🥳", createdAt: daysAgo(3) },
      { id: "contrib-anon-1", name: "Anonymous", anonymous: true, amount: toMinor(15000), message: "Enjoy your day!", createdAt: daysAgo(2) },
      { id: "contrib-emeka", name: "Emeka", anonymous: false, amount: toMinor(30000), message: "Big 3-0! Let's gooo 🚀", createdAt: daysAgo(1) },
    ],
  });

  add("events/tunde-and-zainab", {
    id: "event-tunde-and-zainab",
    slug: "tunde-and-zainab",
    organizerId: "demo-sender",
    organizerName: "Demo Sender",
    type: "wedding",
    title: "The wedding of Tunde & Zainab",
    celebrants: "Tunde & Zainab",
    date: daysFromNow(14),
    story: "We're so glad you can celebrate with us! If you'd like to bless us with a cash gift, simply tap below or scan the QR at the venue. Thank you for your love. 💛",
    gradient: ["#2e1065", "#e6b143"],
    currency: "NGN",
    showTotal: false,
    goalAmount: toMinor(500000),
    soundTheme: "fanfare",
    isPublic: true,
    createdAt: daysAgo(10),
    contributions: [
      { id: "event-contrib-ngozi", name: "Aunty Ngozi", anonymous: false, amount: toMinor(50000), message: "Congratulations my dears! Wishing you a blessed union. 🙏", table: "1", createdAt: daysAgo(2) },
      { id: "event-contrib-okafors", name: "The Okafors", anonymous: false, amount: toMinor(100000), message: "So happy for you both! ❤️", table: "4", createdAt: daysAgo(1) },
    ],
  });

  add("ledger_entries/topup-demo", {
    id: "topup-demo",
    userId: "demo-sender",
    walletId: "wallet-demo-sender",
    transactionType: "wallet_credit",
    amount: toMinor(50000),
    currency: "NGN",
    direction: "credit",
    reference: "topup-001",
    status: "settled",
    createdAt: daysAgo(30),
  });
  add("ledger_entries/fund-tolu-birthday", {
    id: "fund-tolu-birthday",
    userId: "demo-sender",
    walletId: "wallet-demo-sender",
    transactionType: "gift_funded",
    amount: toMinor(25375),
    currency: "NGN",
    direction: "debit",
    reference: "tolu-birthday",
    status: "settled",
    metadata: { recipient: "Tolu" },
    createdAt: daysAgo(1),
  });
  add("ledger_entries/claim-ama-graduation", {
    id: "claim-ama-graduation",
    userId: "recipient-ama",
    walletId: "wallet-recipient-ama",
    transactionType: "gift_claimed",
    amount: toMinor(15000),
    currency: "NGN",
    direction: "credit",
    reference: "ama-graduation",
    status: "settled",
    metadata: { from: "Demo Sender" },
    createdAt: daysAgo(5),
  });
  add("ledger_entries/wd-seed-ama-reservation", {
    id: "wd-seed-ama-reservation",
    userId: "recipient-ama",
    walletId: "wallet-recipient-ama",
    transactionType: "withdrawal_requested",
    amount: toMinor(10000),
    currency: "NGN",
    direction: "debit",
    reference: "wd-seed-ama",
    status: "pending",
    metadata: { withdrawalId: "wd-seed-ama", bank: "GTBank", accountLast4: "6789" },
    createdAt: daysAgo(1),
  });
  add("withdrawals/wd-seed-ama", {
    id: "wd-seed-ama",
    userId: "recipient-ama",
    amount: toMinor(10000),
    currency: "NGN",
    bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ama Mensah" },
    status: "pending",
    createdAt: daysAgo(1),
    reference: "wd-seed-ama",
  });
  add("wallets/demo-sender", { id: "wallet-demo-sender", userId: "demo-sender", currency: "NGN", note: "Balance is derived from ledger_entries.", updatedAt: NOW });
  add("wallets/recipient-ama", { id: "wallet-recipient-ama", userId: "recipient-ama", currency: "NGN", note: "Balance is derived from ledger_entries.", updatedAt: NOW });
  add("admin_audit_logs/bootstrap-schema-v1", {
    id: "bootstrap-schema-v1",
    action: "firestore_schema_bootstrap",
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
    "_app/schema",
    `profiles/${ADMIN_UID}`,
    "gifts/tolu-birthday",
    "groupGifts/chidi-birthday-pool",
    "events/tunde-and-zainab",
    "ledger_entries/topup-demo",
    "withdrawals/wd-seed-ama",
    "_healthcheck/status",
  ];
  const verified = [];
  for (const p of verificationPaths) {
    const doc = await getDoc(token, p);
    verified.push({ path: p, exists: Boolean(doc?.name) });
  }
  console.log(JSON.stringify({ projectId: PROJECT_ID, adminUid: ADMIN_UID, wrote, verified }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
