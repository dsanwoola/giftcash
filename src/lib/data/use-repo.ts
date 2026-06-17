"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a repo read. Re-runs whenever the demo store emits a change
 * (createGift / claimGift / withdrawal / reset all dispatch "giftcash:change").
 */
export function useRepoData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = () => {
      loader().then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      });
    };
    run();
    window.addEventListener("giftcash:change", run); // same-tab
    window.addEventListener("storage", run); // other tabs (demo cross-tab sync)
    return () => {
      alive = false;
      window.removeEventListener("giftcash:change", run);
      window.removeEventListener("storage", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
