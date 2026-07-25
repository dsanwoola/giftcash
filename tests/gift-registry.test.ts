import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("public registry projection never exposes retailer links or received money", () => {
  const server = read("src/lib/registry/server.ts");
  const publicBranch = server.slice(server.indexOf('if (role === "public")'), server.indexOf("const privateItems"));
  assert.match(publicBranch, /targetAmount: item\.targetAmount/);
  assert.match(publicBranch, /gifted \? \{\} : \{ targetAmount/);
  assert.doesNotMatch(publicBranch, /retailerReferenceUrl:/);
  assert.doesNotMatch(publicBranch, /privateNotes:/);
  assert.doesNotMatch(publicBranch, /fundedAmount:/);
  assert.doesNotMatch(publicBranch, /contributionTotal:/);
  const types = read("src/lib/types.ts");
  const publicType = types.slice(types.indexOf("export interface PublicRegistryItem"), types.indexOf("export interface PublicRegistryPayload"));
  assert.doesNotMatch(publicType, /retailerReferenceUrl|privateNotes|fundedAmount|contributions|organizerId|paymentReference/);
  const route = read("src/app/api/events/[slug]/registry/route.ts");
  assert.match(route, /private, no-store/);
  assert.match(route, /Vary[\s\S]*Authorization, Cookie/);
  assert.match(server, /if \(!registry\)[\s\S]*enabled: false/);
});

test("registry mutations verify event ownership and images are re-encoded", () => {
  const server = read("src/lib/registry/server.ts");
  assert.match(server, /event\.organizerId !== uid/);
  assert.match(server, /Retailer links must use a secure HTTPS address/);
  assert.match(server, /\.webp\(\{ quality: 82 \}\)/);
  assert.match(server, /event-registries\/\$\{item\.eventId\}/);
  assert.equal(existsSync(path.join(root, "src/app/api/events/[slug]/registry/items/[itemId]/image/route.ts")), true);
});

test("registry payments use verified Flutterwave intents and shared webhook dispatch", () => {
  const payments = read("src/lib/payments/flutterwave-registry-payments.ts");
  assert.match(payments, /productKind: "registry_gift"/);
  assert.match(payments, /result\.amount !== intent\.totalChargeAmount/);
  assert.match(payments, /result\.currency !== intent\.currency/);
  assert.match(payments, /provider_transactions/);
  assert.match(payments, /registry_contributions/);
  assert.match(payments, /paymentReference === ref/);
  assert.match(payments, /35 \* 60 \* 1000/);
  assert.match(payments, /reservationUpdatedAt: createdAt/);
  assert.match(read("src/lib/payments/flutterwave.ts"), /session_duration: 30/);
  const dispatcher = read("src/lib/payments/flutterwave-product-payments.ts");
  assert.match(dispatcher, /raw\.productKind === "registry_gift"/);
  assert.match(dispatcher, /confirmFlutterwaveRegistryPayment/);
  const registryServer = read("src/lib/registry/server.ts");
  assert.match(registryServer, /Funding details cannot change[\s\S]*checkout is active/);
  assert.match(registryServer, /Funded or reserved gifts cannot be deleted/);
  assert.match(registryServer, /tx\.delete\(ref\)/);
});

test("Gift Party integrates full and group registry funding without replacing cash gifts", () => {
  const eventPage = read("src/components/event/event-page.tsx");
  const registry = read("src/components/registry/gift-registry-section.tsx");
  assert.match(eventPage, /<GiftRegistrySection/);
  assert.match(eventPage, /<ContributeSheet/);
  assert.match(registry, /Fund this gift/);
  assert.match(registry, /Contribute towards it/);
  assert.match(registry, /Gifted with love/);
  assert.match(registry, /does not sell, stock, purchase, or deliver/);
});
