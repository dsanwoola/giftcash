import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/app/api/events/route.ts", import.meta.url), "utf8");
const firebaseEvents = readFileSync(new URL("../src/lib/data/firebase-events.ts", import.meta.url), "utf8");
const repo = readFileSync(new URL("../src/lib/data/firestore-repo.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/admin/events/page.tsx", import.meta.url), "utf8");

test("event collection API lists every event only for server-verified admins", () => {
  assert.match(route, /const uid = await requireUid\(req\)/);
  assert.match(route, /profile\.data\(\)\?\.role === "admin"/);
  assert.match(route, /isAdmin \? await listAllFirebaseEvents\(\) : await listFirebaseEvents\(uid\)/);
  assert.match(route, /adminGiftParty\(event\)/);
  assert.match(firebaseEvents, /export async function listAllFirebaseEvents/);
});

test("client event lists use the authorized API rather than broad Firestore reads", () => {
  const listMethod = repo.slice(repo.indexOf("async listEvents"), repo.indexOf("async createEvent"));
  assert.match(listMethod, /authedGet<\{ events: GiftEvent\[\] \}>\("\/api\/events"\)/);
  assert.doesNotMatch(listMethod, /collection\(getDb\(\), COL\.events\)/);
});

test("Admin backend separates ongoing and scheduled events", () => {
  assert.match(page, /statusOf\(event, now\) === "ongoing"/);
  assert.match(page, /statusOf\(event, now\) === "scheduled"/);
  assert.match(page, /All ongoing and scheduled events across every organizer/);
});
