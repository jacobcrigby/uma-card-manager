// SPDX-License-Identifier: MIT
// Port of py/recommend.py + py/api/services/recommendation_service.py
// Greedy deck recommendation engine.

import type { EnrichedCard } from '../types.js';
import type { TierlistDataSource } from '../datasource/interface.js';
import { TIER_VALUE } from '../types.js';
import { loadJson } from './io.js';
import type { EnrichedData } from '../types.js';

function tierValue(tier: string | null | undefined): number {
  if (!tier) return 0;
  return TIER_VALUE[tier] ?? 0;
}

export interface BorrowedCard {
  id: number;
  name: string;
  type: number;
  score: number;
  tier: string;
}

export interface DeckResult {
  selected: EnrichedCard[];
  support: BorrowedCard | null;
}

export class RecommendService {
  constructor(
    private readonly enrichedPath: string,
    private readonly dataSource: TierlistDataSource,
  ) {}

  private async loadEnrichedCards(): Promise<EnrichedCard[]> {
    try {
      const data = await loadJson<EnrichedData>(this.enrichedPath);
      return data.cards;
    } catch {
      return [];
    }
  }

  // Port of get_best_cards_by_type_from_tierlist:
  // Returns best borrowable card per type (excludes cards user already has at MLB).
  private async getBestByTypeFromTierlist(
    myCards: EnrichedCard[],
  ): Promise<Map<number, BorrowedCard>> {
    const allTierlistCards = await this.dataSource.getAllCards();
    const mlbIds = new Set(
      myCards.filter((c) => c.lb === 4 && c.id != null).map((c) => c.id),
    );

    const bestByType = new Map<number, BorrowedCard>();

    for (const card of allTierlistCards) {
      if (!card.scores.length || !card.tiers.length) continue;
      if (mlbIds.has(card.id)) continue;

      const maxScore = Math.max(...card.scores);
      const maxTier = card.tiers[card.tiers.length - 1]; // MLB tier

      const current = bestByType.get(card.type);
      if (
        !current ||
        tierValue(maxTier) > tierValue(current.tier) ||
        (tierValue(maxTier) === tierValue(current.tier) && maxScore > current.score)
      ) {
        bestByType.set(card.type, {
          id: card.id,
          name: card.name,
          type: card.type,
          score: maxScore,
          tier: maxTier,
        });
      }
    }

    // Synthesised Friend card fallback (ID 50001) — same as Python
    if (!bestByType.has(5)) {
      const syntheticFriendId = 50001;
      if (!mlbIds.has(syntheticFriendId)) {
        const avgScore =
          bestByType.size > 0
            ? Math.floor(
                [...bestByType.values()].reduce((s, c) => s + c.score, 0) /
                  bestByType.size,
              )
            : 35000;
        bestByType.set(5, {
          id: syntheticFriendId,
          name: 'Friend (Borrowed)',
          type: 5,
          score: avgScore,
          tier: 'B',
        });
      }
    }

    return bestByType;
  }

  // Port of select_best_cards_by_type:
  // Groups user cards by type, sorts by score desc, takes N per type.
  private selectByType(
    myCards: EnrichedCard[],
    typeCounts: Record<number, number>,
    excludeId?: number,
  ): EnrichedCard[] {
    const byType = new Map<number, EnrichedCard[]>();
    for (const card of myCards) {
      if (card.id === excludeId) continue;
      if (!byType.has(card.type)) byType.set(card.type, []);
      byType.get(card.type)!.push(card);
    }

    for (const list of byType.values()) {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    const selected: EnrichedCard[] = [];
    for (const [typeStr, count] of Object.entries(typeCounts)) {
      const type = parseInt(typeStr, 10);
      const available = byType.get(type) ?? [];
      selected.push(...available.slice(0, count));
    }
    return selected;
  }

  async getRecommendedDeck(
    typeCounts: Record<number, number>,
    noSupport: boolean,
    _borrowFriend: boolean,
  ): Promise<DeckResult> {
    const myCards = await this.loadEnrichedCards();
    const totalRequested = Object.values(typeCounts).reduce((s, n) => s + n, 0);

    if (!noSupport && totalRequested < 6) {
      try {
        const candidates = await this.getBestByTypeFromTierlist(myCards);

        let bestTierVal = -1;
        let bestScore = -1;
        let bestSupport: BorrowedCard | null = null;
        let bestSelected: EnrichedCard[] = [];

        for (const candidate of candidates.values()) {
          const simSelected = this.selectByType(myCards, typeCounts, candidate.id);

          // Fill remaining slots to reach 6 total (including support)
          const current = [...simSelected];
          const needed = 6 - current.length - 1;
          if (needed > 0) {
            const usedIds = new Set([candidate.id, ...current.map((c) => c.id)]);
            const remaining = myCards
              .filter((c) => !usedIds.has(c.id) && c.score != null)
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            current.push(...remaining.slice(0, needed));
          }

          const totalTierVal =
            tierValue(candidate.tier) +
            current.reduce((s, c) => s + tierValue(c.tier), 0);
          const totalScore =
            candidate.score + current.reduce((s, c) => s + (c.score ?? 0), 0);

          if (
            totalTierVal > bestTierVal ||
            (totalTierVal === bestTierVal && totalScore > bestScore)
          ) {
            bestTierVal = totalTierVal;
            bestScore = totalScore;
            bestSupport = candidate;
            bestSelected = current;
          }
        }

        if (bestSupport) {
          return { selected: bestSelected, support: bestSupport };
        }
      } catch {
        // Fall through to no-support selection
      }
    }

    // No support card path
    let selected = this.selectByType(myCards, typeCounts);
    if (selected.length < 6) {
      const usedIds = new Set(selected.map((c) => c.id));
      const remaining = myCards
        .filter((c) => !usedIds.has(c.id) && c.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      selected = [...selected, ...remaining.slice(0, 6 - selected.length)];
    }
    return { selected, support: null };
  }

  async getBestCards(noSupport: boolean): Promise<DeckResult> {
    const myCards = await this.loadEnrichedCards();

    let support: BorrowedCard | null = null;
    let excludeId: number | undefined;

    if (!noSupport) {
      try {
        const candidates = await this.getBestByTypeFromTierlist(myCards);
        if (candidates.size > 0) {
          // Find absolute best candidate (highest tier, then score)
          support = [...candidates.values()].reduce((best, c) =>
            tierValue(c.tier) > tierValue(best.tier) ||
            (tierValue(c.tier) === tierValue(best.tier) && c.score > best.score)
              ? c
              : best,
          );
          excludeId = support.id;
        }
      } catch {
        // No support available
      }
    }

    const numToTake = support ? 5 : 6;
    const available = myCards
      .filter((c) => c.id !== excludeId && c.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return { selected: available.slice(0, numToTake), support };
  }
}
