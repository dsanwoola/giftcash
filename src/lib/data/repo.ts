"use client";

import { demoRepo } from "./demo-repo";
import type { GiftRepo } from "./repo-types";

/**
 * Occasion Cloudflare frontend currently uses the local demo repository.
 *
 * Firebase client imports are intentionally not loaded from the Cloudflare Worker
 * bundle because Firestore's protobuf runtime uses dynamic code generation, which
 * Cloudflare Workers disallow. Live persistence is being moved to the Worker/D1
 * API layer instead.
 */
export const repo: GiftRepo = demoRepo;

export type Repo = GiftRepo;
export type {
  CreateGiftInput,
  CreateGroupGiftInput,
  CreateEventInput,
  ContributionData,
  AdminStats,
  GiftRepo,
} from "./repo-types";
