import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after, before, beforeEach } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "giftcash-rules-test";
let env;

before(async () => {
  const [host = "127.0.0.1", portText = "8080"] = (process.env.FIRESTORE_EMULATOR_HOST || "").split(":");
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: Number(portText),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "events", "owner-party"), { organizerId: "owner-a", title: "Owner A", contributions: [] }),
      setDoc(doc(db, "events", "other-party"), { organizerId: "owner-b", title: "Owner B", contributions: [] }),
      setDoc(doc(db, "groupGifts", "owner-group"), { organizerId: "owner-a", title: "Owner group", contributions: [] }),
      setDoc(doc(db, "gifts", "sender-gift"), { senderId: "sender-a", claimedByUserId: null, amount: 10000 }),
      setDoc(doc(db, "payment_intents", "SECRET"), { eventSlug: "owner-party", status: "pending" }),
      setDoc(doc(db, "event_registries", "registry-a"), { eventSlug: "owner-party", organizerId: "owner-a", enabled: true }),
      setDoc(doc(db, "event_registry_items", "registry-item-a"), { eventSlug: "owner-party", organizerId: "owner-a", retailerReferenceUrl: "https://private.example/item" }),
      setDoc(doc(db, "registry_contributions", "registry-payment-a"), { eventSlug: "owner-party", organizerId: "owner-a", amount: 50000 }),
      setDoc(doc(db, "registry_reservations", "registry-reservation-a"), { eventSlug: "owner-party", itemId: "registry-item-a", status: "pending" }),
    ]);
  });
});

after(async () => {
  await env?.cleanup();
});

test("event and group canonical records deny anonymous and cross-organizer reads", async () => {
  const anonymous = env.unauthenticatedContext().firestore();
  const owner = env.authenticatedContext("owner-a").firestore();
  const other = env.authenticatedContext("owner-b").firestore();

  await assertFails(getDoc(doc(anonymous, "events", "owner-party")));
  await assertFails(getDoc(doc(other, "events", "owner-party")));
  assert.equal((await assertSucceeds(getDoc(doc(owner, "events", "owner-party")))).data().organizerId, "owner-a");

  await assertFails(getDoc(doc(anonymous, "groupGifts", "owner-group")));
  await assertFails(getDoc(doc(other, "groupGifts", "owner-group")));
  await assertSucceeds(getDoc(doc(owner, "groupGifts", "owner-group")));
});

test("organizer queries must be owner-scoped and cannot enumerate all events", async () => {
  const owner = env.authenticatedContext("owner-a").firestore();
  const ownedQuery = query(collection(owner, "events"), where("organizerId", "==", "owner-a"));
  const result = await assertSucceeds(getDocs(ownedQuery));
  assert.equal(result.size, 1);
  await assertFails(getDocs(collection(owner, "events")));
});

test("canonical event and group writes are server-only even for the owner", async () => {
  const owner = env.authenticatedContext("owner-a").firestore();
  await assertFails(setDoc(doc(owner, "events", "new-party"), { organizerId: "owner-a" }));
  await assertFails(updateDoc(doc(owner, "events", "owner-party"), { title: "Changed" }));
  await assertFails(deleteDoc(doc(owner, "events", "owner-party")));
  await assertFails(setDoc(doc(owner, "groupGifts", "new-group"), { organizerId: "owner-a", contributions: [] }));
  await assertFails(updateDoc(doc(owner, "groupGifts", "owner-group"), { contributions: [{ amount: 999999 }] }));
  await assertFails(updateDoc(doc(owner, "groupGifts", "owner-group"), { organizerId: "owner-b" }));
});

test("raw gifts are visible only to sender or recorded recipient and never writable", async () => {
  const sender = env.authenticatedContext("sender-a").firestore();
  const outsider = env.authenticatedContext("outsider").firestore();
  await assertSucceeds(getDoc(doc(sender, "gifts", "sender-gift")));
  await assertFails(getDoc(doc(outsider, "gifts", "sender-gift")));
  await assertFails(updateDoc(doc(sender, "gifts", "sender-gift"), { amount: 1 }));
});

test("payment intents remain inaccessible to every client role", async () => {
  const anonymous = env.unauthenticatedContext().firestore();
  const owner = env.authenticatedContext("owner-a").firestore();
  await assertFails(getDoc(doc(anonymous, "payment_intents", "SECRET")));
  await assertFails(getDoc(doc(owner, "payment_intents", "SECRET")));
});

test("raw registry links, contributions and reservations are server-only", async () => {
  for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext("owner-a").firestore()]) {
    await assertFails(getDoc(doc(db, "event_registries", "registry-a")));
    await assertFails(getDoc(doc(db, "event_registry_items", "registry-item-a")));
    await assertFails(getDoc(doc(db, "registry_contributions", "registry-payment-a")));
    await assertFails(getDoc(doc(db, "registry_reservations", "registry-reservation-a")));
    await assertFails(getDoc(doc(db, "registry_checkout_limits", "client-item-window")));
    await assertFails(setDoc(doc(db, "registry_checkout_limits", "client-item-window"), { count: 0 }));
    await assertFails(setDoc(doc(db, "event_registry_items", "client-item"), { organizerId: "owner-a" }));
  }
});
