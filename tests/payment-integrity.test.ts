import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("personal gifts initialize verified Flutterwave checkout", () => {
  const wizard = read("src/components/wizard/create-gift-wizard.tsx");
  assert.match(wizard, /api\/gifts\/payments\/flutterwave\/initialize/);
  assert.match(wizard, /getIdToken/);
  assert.doesNotMatch(wizard, /Simulated payment success|Demo payment/);
  assert.equal(existsSync(path.join(root, "src/app/api/gifts/payments/flutterwave/callback/route.ts")), true);
  assert.equal(existsSync(path.join(root, "src/app/gift/complete/page.tsx")), true);
});

test("group gifts use verified checkout instead of direct contribution writes", () => {
  const page = read("src/components/group/group-gift-page.tsx");
  assert.match(page, /api\/groups\/\$\{slug\}\/payments\/flutterwave\/initialize/);
  assert.match(page, /onStartCheckout=\{startFlutterwaveCheckout\}/);
  assert.doesNotMatch(page, /repo\.contributeToGroup/);
  const rules = read("firestore.rules");
  assert.doesNotMatch(rules, /hasOnly\(\['contributions'\]\)/);
  assert.match(rules, /match \/gifts\/\{slug\}[\s\S]*?allow write: if false/);
  assert.doesNotMatch(rules, /match \/gifts\/\{slug\}[\s\S]*?allow get: if true/);
  assert.match(rules, /resource\.data\.claimedByUserId == request\.auth\.uid/);
});

test("legacy direct monetary writes are blocked", () => {
  assert.doesNotMatch(read("src/app/api/gifts/route.ts"), /fundGift\(/);
  const store = read("src/lib/data/server-store.ts");
  assert.match(store, /Direct gift funding is disabled/);
  assert.match(store, /Direct contributions are disabled/);
  assert.doesNotMatch(read("src/components/party/host-console.tsx"), /Send a test gift/);
});

test("one Flutterwave webhook dispatcher confirms every GiftCash product", () => {
  const webhook = read("src/app/api/payments/flutterwave/webhook/route.ts");
  assert.match(webhook, /confirmFlutterwavePayment/);
  assert.doesNotMatch(webhook, /confirmFlutterwaveEventPayment/);
  const payments = read("src/lib/payments/flutterwave-product-payments.ts");
  assert.match(payments, /productKind: "personal_gift"/);
  assert.match(payments, /productKind: "group_gift"/);
  assert.match(payments, /appendVerifiedGroupContribution/);
  assert.match(payments, /createVerifiedGift/);
  assert.match(payments, /confirmFlutterwaveEventPayment/);
  const store = read("src/lib/data/server-store.ts");
  assert.match(store, /provider_transactions/);
  assert.match(store, /This Flutterwave transaction has already funded another payment/);
  assert.match(payments, /status === 425/);
  const eventStatus = read("src/app/api/events/[slug]/payments/[reference]/route.ts");
  assert.match(eventStatus, /status: intent\.status/);
  assert.doesNotMatch(eventStatus, /providerStatus|totalChargeAmount|settlementAccount/);
  assert.match(read("src/app/api/events/[slug]/payments/flutterwave/callback/route.ts"), /expectedEventSlug: slug/);
  assert.doesNotMatch(read("src/components/social/contribute-sheet.tsx"), /demo-only fallback|onContribute/);
});
