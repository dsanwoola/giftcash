import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const access = readFileSync(new URL("../src/lib/events/access.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/lib/types.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/components/event/event-page.tsx", import.meta.url), "utf8");

function between(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Could not isolate ${start}`);
  return source.slice(from, to);
}

test("public Gift Party DTO cannot expose received-money totals", () => {
  const publicSerializer = between(access, "export function publicGiftParty", "export function organizerGiftParty");
  const publicType = between(types, "export interface PublicGiftParty", "export type OrganizerGiftParty");
  for (const source of [publicSerializer, publicType]) {
    assert.doesNotMatch(source, /contributionTotal/);
    assert.doesNotMatch(source, /showTotal/);
    assert.doesNotMatch(source, /contribution\.amount/);
  }
});

test("organizer and Super Admin views receive exact totals", () => {
  assert.match(access, /export function organizerGiftParty[\s\S]*?contributionTotal:/);
  assert.match(access, /export function adminGiftParty[\s\S]*?viewerRole: "admin"[\s\S]*?contributionTotal:/);
  assert.match(access, /profile\.data\(\)\?\.role === "admin"/);
  assert.match(page, /party\.viewerRole === "organizer" \|\| party\.viewerRole === "admin"/);
  assert.doesNotMatch(page, /party\.showTotal && <p/);
});