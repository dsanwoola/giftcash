const STORAGE_KEY = "occasion:contributor-id:v1";

function newContributorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Stable for this browser; the server converts it into an event-scoped hash. */
export function browserContributorId() {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = newContributorId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Storage can be disabled in private/restricted browser contexts.
    return newContributorId();
  }
}