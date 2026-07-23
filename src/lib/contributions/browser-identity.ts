const STORAGE_PREFIX = "occasion:contributor-id:v2";

function newContributorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function identityScope(identityHint: string) {
  const normalized = identityHint.trim().toLowerCase();
  if (!normalized || typeof crypto === "undefined" || !crypto.subtle) return "browser";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Stable for this browser + contact; the server converts it into an event-scoped hash. */
export async function browserContributorId(identityHint = "") {
  if (typeof window === "undefined") return undefined;
  try {
    const storageKey = `${STORAGE_PREFIX}:${await identityScope(identityHint)}`;
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = newContributorId();
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    // Storage can be disabled in private/restricted browser contexts.
    return newContributorId();
  }
}