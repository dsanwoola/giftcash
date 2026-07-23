export interface LeaderboardContribution {
  id: string;
  name: string;
  amount: number;
  anonymous: boolean;
  contributorKey?: string;
}

export interface ContributorRank {
  key: string;
  name: string;
  amount: number;
  count: number;
  anonymous: boolean;
}

/**
 * Aggregate repeat gifts only when they carry the same opaque contributor key.
 * Names are display labels, never identities: two people may legitimately share
 * the same name. Legacy contributions without a key therefore remain separate.
 */
export function rankContributors(contributions: LeaderboardContribution[]): ContributorRank[] {
  const ranked = new Map<string, ContributorRank>();

  for (const contribution of contributions) {
    const key = contribution.anonymous || !contribution.contributorKey
      ? `gift-${contribution.id}`
      : `contributor-${contribution.contributorKey}`;
    const current = ranked.get(key) ?? {
      key,
      name: contribution.name,
      amount: 0,
      count: 0,
      anonymous: contribution.anonymous,
    };
    current.amount += contribution.amount;
    current.count += 1;
    ranked.set(key, current);
  }

  return [...ranked.values()].sort((a, b) => b.amount - a.amount);
}