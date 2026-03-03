// SPDX-License-Identifier: MIT
// Data source adapter for uma.moe's precomputed-tierlist.json.
// This is the production-ready adapter that mirrors py/fetch.py behaviour.

import type { TierlistDataSource, NormalizedTierlistCard } from './interface.js';
import type { TierlistData } from '../types.js';
import { loadJson, saveJson } from '../services/io.js';

export class UmaMoeDataSource implements TierlistDataSource {
  constructor(
    private readonly tierlistPath: string,
    private readonly fetchUrl = 'https://uma.moe/assets/data/precomputed-tierlist.json',
  ) {}

  async getIndex(): Promise<Map<string, NormalizedTierlistCard>> {
    const data = await loadJson<TierlistData>(this.tierlistPath);
    const index = new Map<string, NormalizedTierlistCard>();

    for (const card of Object.values(data.cards)) {
      if (!card.name || card.type == null || card.rarity == null) continue;
      if (!Array.isArray(card.scores) || !Array.isArray(card.tiers)) continue;

      const key = `${card.name}|${card.type}|${card.rarity}`;
      if (!index.has(key)) {
        index.set(key, {
          id: card.id,
          name: card.name,
          type: card.type,
          rarity: card.rarity,
          scores: card.scores,
          tiers: card.tiers,
        });
      }
    }

    return index;
  }

  async getAllCards(): Promise<NormalizedTierlistCard[]> {
    const index = await this.getIndex();
    return [...index.values()];
  }

  async update(): Promise<void> {
    const res = await fetch(this.fetchUrl);
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
    const data: unknown = await res.json();
    await saveJson(this.tierlistPath, data);
  }
}
