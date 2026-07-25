import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("raw Firestore event, group and personal gift records are never public", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /match \/events\/\{slug\}[\s\S]*?allow read: if isOwner\(resource\.data\.organizerId\)/);
  assert.match(rules, /match \/groupGifts\/\{slug\}[\s\S]*?allow read: if isOwner\(resource\.data\.organizerId\)/);
  assert.match(rules, /match \/gifts\/\{slug\}[\s\S]*?resource\.data\.senderId == request\.auth\.uid/);
  assert.doesNotMatch(rules, /match \/(?:events|groupGifts|gifts)\/\{slug\}[\s\S]{0,300}?allow (?:get|read): if true/);
  assert.match(rules, /match \/events\/\{slug\}[\s\S]*?allow create, update, delete: if false/);
  assert.match(rules, /match \/groupGifts\/\{slug\}[\s\S]*?allow create, update, delete: if false/);
});

test("public serializers are explicit allowlists without ownership or payment metadata", () => {
  const eventAccess = read("src/lib/events/access.ts");
  const giftAccess = read("src/lib/gifts/access.ts");
  const groupAccess = read("src/lib/groups/access.ts");
  const publicEvent = eventAccess.slice(eventAccess.indexOf("export function publicGiftParty"), eventAccess.indexOf("export async function eventViewForRequest"));
  const publicGift = giftAccess.slice(giftAccess.indexOf("export function publicGift"), giftAccess.indexOf("async function recipientIdentityMatches"));
  const publicGroup = groupAccess.slice(groupAccess.indexOf("function publicContribution"), groupAccess.indexOf("export async function groupGiftViewForRequest"));
  for (const source of [publicEvent, publicGift, publicGroup]) {
    assert.doesNotMatch(source, /paymentReference|providerTransactionId|settlementAccount|claimedByUserId/);
  }
  assert.doesNotMatch(publicEvent, /organizerId|organizerName|story:/);
  assert.doesNotMatch(publicGift, /recipientPhone|recipientEmail|revealAnswer|senderId/);
  assert.doesNotMatch(publicGroup, /organizerId|contributorKey|platformFee|netAmount/);
  assert.match(publicGift, /gift\.anonymous \? "Anonymous" : gift\.senderName/);
  assert.match(publicGift, /gift\.mystery && !gift\.openedAt \? 0 : gift\.amount/);
  assert.match(publicGroup, /contribution\.anonymous \? "Anonymous" : contribution\.name/);
});

test("organizer pages load through verified owner APIs", () => {
  for (const file of [
    "src/components/party/host-console.tsx",
    "src/components/party/party-screen.tsx",
    "src/components/event/event-report-page.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /fetchOrganizerGiftParty/);
    assert.doesNotMatch(source, /subscribeEvent|repo\.getEvent/);
  }
  assert.match(read("src/app/api/events/[slug]/route.ts"), /requireEventOrganizer\(req, slug\)/);
  assert.match(read("src/app/api/events/route.ts"), /requireUid\(req\)/);
});

test("production-only event controls and configuration are not public", () => {
  assert.match(read("src/app/api/events/[slug]/contribute/route.ts"), /status: 410/);
  assert.match(read("src/app/api/events/[slug]/payments/bank-transfer/route.ts"), /status: 410/);
  assert.match(read("src/app/api/events/[slug]/payments/[reference]/route.ts"), /"totalTransferAmount" in intent/);
  assert.doesNotMatch(read("src/components/party/party-screen.tsx"), /Simulate gift|addTestGift/);
  assert.match(read("src/app/api/launch/route.ts"), /requireAdmin\(req\)/);
  assert.equal(read("src/app/api/health/route.ts").includes("isFirestoreConfigured"), false);
});

test("reveal answers and claims are server verified", () => {
  const reveal = read("src/components/reveal/reveal-experience.tsx");
  const store = read("src/lib/data/server-store.ts");
  assert.doesNotMatch(reveal, /gift\.revealAnswer|any digits in demo|Demo mode/);
  assert.match(reveal, /JSON\.stringify\(\{ answer \}\)/);
  assert.match(store, /revealAnswerHash/);
  assert.match(store, /createHash\("sha256"\)/);
  assert.match(store, /intended recipient's email or phone number/);
  assert.match(store, /gift\.claimedByUserId !== recipientUid/);
});

test("private gifts require and verify recipient identity before read or open", () => {
  const access = read("src/lib/gifts/access.ts");
  const openRoute = read("src/app/api/gifts/[slug]/open/route.ts");
  const store = read("src/lib/data/server-store.ts");
  const wizard = read("src/components/wizard/create-gift-wizard.tsx");
  assert.match(access, /Recipient sign-in is required for this private gift/);
  assert.match(access, /recipientIdentityMatches/);
  assert.match(openRoute, /requirePrivateGiftRecipient\(req, slug\)/);
  assert.match(store, /A private gift needs the recipient's email or phone number/);
  assert.match(wizard, /GiftCash can verify who opens it/);
});

test("legacy email or phone cannot create an authenticated server session", () => {
  const route = read("src/app/api/auth/session/route.ts");
  const session = read("src/lib/data/firebase-session.ts");
  assert.match(route, /Firebase authentication is required/);
  assert.doesNotMatch(route, /email \|\| phone/);
  assert.match(session, /input: \{ uid: string;/);
  assert.doesNotMatch(session, /guest-|userIdFor/);
});