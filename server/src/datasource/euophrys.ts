// SPDX-License-Identifier: MIT
// Stub adapter for the Euophrys/umamusume-tierlist data source.
// https://github.com/Euophrys/umamusume-tierlist
//
// When the game's master.db is available, this adapter will extract card data
// directly from the SQLite database (tables: support_card_data, support_card_effect_table).
// The db-convert.py script in that repo produces cards.js with 33 stat fields per card.
//
// Two implementation paths when this is built out:
//
//   Option A — Score computation:
//     Port the scoring algorithm from precomputed-tierlist.json's metadata.weights object.
//     The weights, training gains, cap, and stat bonus structure are all in that JSON.
//     Result: scores[5] and tiers[5] computed from raw stats, same shape as UmaMoeDataSource.
//
//   Option B — Raw stats passthrough:
//     Return cards with scores: [] and tiers: [].
//     Enrichment will set score: null and tier: null for all cards.
//     The frontend already handles null scores/tiers gracefully (card-item.ts).
//     Raw stats could be exposed via a separate /api/v1/cards/stats endpoint in the future.
//
// To activate: set DATA_SOURCE=euophrys environment variable.
// Requires better-sqlite3 (add to server/package.json when implementing).

import type { TierlistDataSource, NormalizedTierlistCard } from './interface.js';

export class EuophrysDataSource implements TierlistDataSource {
  constructor(
    private readonly _dbPath?: string, // path to master.db when available
    private readonly _cardsJsPath?: string, // path to pre-converted cards.js
  ) {}

  async getIndex(): Promise<Map<string, NormalizedTierlistCard>> {
    throw new Error('Euophrys data source not yet implemented. See datasource/euophrys.ts for implementation notes.');
  }

  async getAllCards(): Promise<NormalizedTierlistCard[]> {
    throw new Error('Euophrys data source not yet implemented. See datasource/euophrys.ts for implementation notes.');
  }

  async update(): Promise<void> {
    throw new Error('Euophrys data source not yet implemented. Run db-convert.py from the Euophrys/umamusume-tierlist repo against a fresh master.db to update card data.');
  }
}
