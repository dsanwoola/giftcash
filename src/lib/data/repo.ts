"use client";

import { firestoreRepo } from "./firestore-repo";
import type { GiftRepo } from "./repo-types";

/** Occasion.ng real-testing data adapter. Client flows now use Firebase/Firestore instead of the local demo store. */
export const repo: GiftRepo = firestoreRepo;

export type Repo = GiftRepo;
export type {
  CreateGiftInput,
  CreateGroupGiftInput,
  CreateEventInput,
  ContributionData,
  AdminStats,
  GiftRepo,
} from "./repo-types";
