import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const repo = readFileSync(new URL("../src/lib/data/firestore-repo.ts", import.meta.url), "utf8");
const serverStore = readFileSync(new URL("../src/lib/data/server-store.ts", import.meta.url), "utf8");

test("authenticated writes survive transient client token and fetch failures", () => {
  assert.match(repo, /currentUser\?\.getIdToken\(\)[\s\S]*?catch/);
  assert.match(repo, /credentials: "same-origin"/);
  assert.match(repo, /await new Promise\(\(resolve\) => setTimeout\(resolve, 500\)\)/);
  assert.match(repo, /Could not reach GiftCash\. Check your internet connection and try again\./);
});

test("session fallback remains verified against the current Firebase Auth user", () => {
  assert.match(serverStore, /const sessionUser = await sessionFromCookies\(\)/);
  assert.match(serverStore, /adminAuth\(\)\.getUser\(sessionUser\.id\)/);
  assert.match(serverStore, /!authUser \|\| authUser\.disabled/);
  assert.match(serverStore, /return authUser\.uid/);
});