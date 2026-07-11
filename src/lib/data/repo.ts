"use client";

import { demoRepo } from "./demo-repo";
import type { GiftRepo } from "./repo-types";

/**
 * Occasion.ng is Firebase-first. Client-side flows use the local demo repository for optimistic/offline UI; production writes and reads that require persistence go through Firebase-backed API routes.
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
