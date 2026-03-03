// SPDX-License-Identifier: MIT
// Abstract interface for tier list data sources.
// Implement this to add new sources (uma.moe, Euophrys game DB, etc.)
// without changing any enrichment or recommendation logic.

export interface NormalizedTierlistCard {
  id: number;
  name: string;
  type: number; // 0-5
  rarity: number; // 1-3
  scores: number[]; // one per LB level [0..4]; empty array if source has no pre-computed scores
  tiers: string[]; // one per LB level [0..4]; empty array if source has no pre-computed tiers
}

export interface TierlistDataSource {
  /**
   * Returns a lookup map keyed by "name|type|rarity".
   * Used by enrichment to match user cards against the tier list.
   */
  getIndex(): Promise<Map<string, NormalizedTierlistCard>>;

  /**
   * Returns all cards as a flat list.
   * Used by recommendation engine to find borrow candidates.
   */
  getAllCards(): Promise<NormalizedTierlistCard[]>;

  /**
   * Fetch and persist the latest data from the remote source.
   * Called by POST /api/v1/enrich/update (or equivalent).
   */
  update(): Promise<void>;
}
