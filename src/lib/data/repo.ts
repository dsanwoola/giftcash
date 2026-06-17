"use client";

import { isFirebaseConfigured } from "../firebase/client";
import { demoRepo } from "./demo-repo";
import { firestoreRepo } from "./firestore-repo";
import type { GiftRepo } from "./repo-types";

/**
 * The active data layer. Uses live Firebase when the public config is present
 * (see .env.local), otherwise the localStorage demo store. All consumers import
 * `repo` from here, so switching backends touches no UI code.
 */
export const repo: GiftRepo = isFirebaseConfigured ? firestoreRepo : demoRepo;

export type Repo = GiftRepo;
export type {
  CreateGiftInput,
  CreateGroupGiftInput,
  CreateEventInput,
  ContributionData,
  AdminStats,
  GiftRepo,
} from "./repo-types";
