// SPDX-License-Identifier: MIT
// Port of py/enrich.py + py/api/services/enrichment_service.py
// Enriches user cards with scores and tiers from the tier list data source.

import type { UserCard, EnrichedCard, EnrichedData } from '../types.js';
import type { TierlistDataSource } from '../datasource/interface.js';
import { loadJson, saveJson, getFileHash } from './io.js';

// Stable 32-bit hash for generating synthetic card IDs (unmatched cards).
// Matches the intent of Python's hash() for the same purpose.
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

export class EnrichService {
  constructor(
    private readonly cardsPath: string,
    private readonly tierlistPath: string,
    private readonly enrichedPath: string,
    private readonly dataSource: TierlistDataSource,
  ) {}

  async needsEnrichment(): Promise<boolean> {
    try {
      const existing = await loadJson<EnrichedData>(this.enrichedPath);
      const [inputHash, tierlistHash] = await Promise.all([
        getFileHash(this.cardsPath),
        getFileHash(this.tierlistPath),
      ]);
      return (
        existing.metadata.input_hash !== inputHash ||
        existing.metadata.tierlist_hash !== tierlistHash
      );
    } catch {
      return true;
    }
  }

  async enrich(force = false): Promise<EnrichedCard[]> {
    if (!force && !(await this.needsEnrichment())) {
      const existing = await loadJson<EnrichedData>(this.enrichedPath);
      return existing.cards;
    }

    const [cards, index, inputHash, tierlistHash] = await Promise.all([
      loadJson<UserCard[]>(this.cardsPath).catch(() => [] as UserCard[]),
      this.dataSource.getIndex(),
      getFileHash(this.cardsPath),
      getFileHash(this.tierlistPath),
    ]);

    const enriched: EnrichedCard[] = cards.map((card) => {
      const key = `${card.name}|${card.type}|${card.rarity}`;
      const match = index.get(key);

      if (!match || match.scores.length === 0) {
        // Unmatched card (e.g. Friend not in tier list) — assign synthetic ID
        const syntheticId = 40000 + (stableHash(key) % 10000);
        return { ...card, id: syntheticId, score: null, tier: null };
      }

      const score = match.scores[card.lb] ?? null;
      const tier = match.tiers[card.lb] ?? null;
      return { ...card, id: match.id, score, tier };
    });

    const output: EnrichedData = {
      metadata: { input_hash: inputHash, tierlist_hash: tierlistHash },
      cards: enriched,
    };
    await saveJson(this.enrichedPath, output);
    return enriched;
  }

  async getEnrichedCards(autoEnrich = true): Promise<EnrichedCard[]> {
    if (autoEnrich && (await this.needsEnrichment())) {
      return this.enrich();
    }
    try {
      const data = await loadJson<EnrichedData>(this.enrichedPath);
      return data.cards;
    } catch {
      return this.enrich();
    }
  }

  async getEnrichedCount(): Promise<number> {
    const cards = await this.getEnrichedCards(false).catch(() => []);
    return cards.length;
  }
}
