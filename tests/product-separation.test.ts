import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

const removedAccessRoutes = [
  "src/app/api/events/[slug]/tickets/route.ts",
  "src/app/api/events/[slug]/rsvp/route.ts",
  "src/app/api/events/[slug]/tables/route.ts",
  "src/app/api/events/[slug]/check-in/route.ts",
  "src/app/event/[slug]/tables/page.tsx",
  "src/components/party/table-tents.tsx",
];

test("Occasion access modules are absent from GiftCash", () => {
  for (const route of removedAccessRoutes) {
    assert.equal(existsSync(path.join(root, route)), false, `${route} must remain outside GiftCash`);
  }
});

test("Gift Party creation disables legacy access features", () => {
  const creator = read("src/app/event/create/page.tsx");
  for (const setting of ["ticketingEnabled: false", "rsvpEnabled: false", "seatingEnabled: false", "checkInEnabled: false"]) {
    assert.match(creator, new RegExp(setting));
  }
  assert.match(creator, /Create Gift Party/);
});

test("Gift Party is canonical for public and payment-return routes", () => {
  assert.equal(existsSync(path.join(root, "src/app/party/[slug]/page.tsx")), true);
  assert.equal(existsSync(path.join(root, "src/app/party/[slug]/live/page.tsx")), true);
  assert.match(read("src/app/api/events/[slug]/payments/flutterwave/callback/route.ts"), /`\/party\/\$\{slug\}`/);
  assert.match(read("src/app/api/events/[slug]/payments/paystack/callback/route.ts"), /`\/party\/\$\{slug\}`/);
  assert.match(read("src/app/api/events/[slug]/payments/paysure/callback/route.ts"), /`\/party\/\$\{slug\}`/);
});

test("public GiftCash surfaces use GiftCash branding", () => {
  assert.doesNotMatch(read("src/app/page.tsx"), /Occasion\.ng/);
  assert.doesNotMatch(read("src/app/layout.tsx"), /Occasion\.ng/);
  assert.match(read("src/components/ui/logo.tsx"), /Gift/);
  assert.match(read("src/components/ui/logo.tsx"), /Cash/);
});
