import assert from "node:assert/strict";
import test from "node:test";
import { rankContributors } from "../src/lib/contributions/leaderboard.ts";

test("adds repeat gifts from the same contributor", () => {
  const ranks = rankContributors([
    { id: "gift-1", name: "Ada Okafor", amount: 5_000_00, anonymous: false, contributorKey: "person-a" },
    { id: "gift-2", name: "Ada Okafor", amount: 3_000_00, anonymous: false, contributorKey: "person-a" },
  ]);

  assert.equal(ranks.length, 1);
  assert.equal(ranks[0].amount, 8_000_00);
  assert.equal(ranks[0].count, 2);
});

test("does not merge different contributors who share a display name", () => {
  const ranks = rankContributors([
    { id: "gift-1", name: "John Smith", amount: 5_000_00, anonymous: false, contributorKey: "person-a" },
    { id: "gift-2", name: "John Smith", amount: 3_000_00, anonymous: false, contributorKey: "person-b" },
  ]);

  assert.equal(ranks.length, 2);
  assert.deepEqual(ranks.map((rank) => rank.amount), [5_000_00, 3_000_00]);
  assert.ok(ranks.every((rank) => rank.count === 1));
});

test("keeps anonymous and legacy contributions separate", () => {
  const ranks = rankContributors([
    { id: "anon-1", name: "Anonymous", amount: 2_000_00, anonymous: true, contributorKey: "ignored" },
    { id: "anon-2", name: "Anonymous", amount: 1_000_00, anonymous: true, contributorKey: "ignored" },
    { id: "legacy-1", name: "Same Name", amount: 700_00, anonymous: false },
    { id: "legacy-2", name: "Same Name", amount: 600_00, anonymous: false },
  ]);

  assert.equal(ranks.length, 4);
  assert.ok(ranks.every((rank) => rank.count === 1));
});