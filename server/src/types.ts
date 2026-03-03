// SPDX-License-Identifier: MIT
// TypeScript port of py/util.py TypedDicts — shared types for all services and routes.

export interface UserCard {
  name: string;
  type: number; // 0-5: Speed=0, Stamina=1, Power=2, Guts=3, Wit=4, Friend=5
  rarity: number; // 1-3: R=1, SR=2, SSR=3
  lb: number; // 0-4 (4 = max limit break / MLB)
}

export interface TierlistCard {
  id: number;
  name: string;
  type: number;
  rarity: number;
  scores: number[]; // one score per LB level [0..4]
  tiers: string[]; // one tier per LB level [0..4]
}

export interface TierlistData {
  metadata?: Record<string, unknown>;
  cards: Record<string, TierlistCard>;
  typeData?: Record<string, unknown>;
}

export interface EnrichedCard extends UserCard {
  id: number;
  score: number | null; // null for Friend cards not in tierlist
  tier: string | null; // null for Friend cards not in tierlist
}

export interface EnrichedData {
  metadata: {
    input_hash: string;
    tierlist_hash: string;
  };
  cards: EnrichedCard[];
}

export const TYPE_NAMES: Record<number, string> = {
  0: 'Speed',
  1: 'Stamina',
  2: 'Power',
  3: 'Guts',
  4: 'Wit',
  5: 'Friend',
};

// 13 tiers, ordered best to worst — must match py/recommend.py exactly
export const TIER_ORDER = [
  'S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E+', 'E', 'F',
];

export const TIER_VALUE: Record<string, number> = Object.fromEntries(
  TIER_ORDER.map((t, i) => [t, TIER_ORDER.length - i]),
);
