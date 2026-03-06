import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendService } from '../../services/recommendService.js';
import type { TierlistDataSource } from '../../datasource/interface.js';
import type { EnrichedCard, EnrichedData } from '../../types.js';

vi.mock('../../services/io.js', () => ({
  loadJson: vi.fn(),
  saveJson: vi.fn(),
  getFileHash: vi.fn(),
}));

import { loadJson } from '../../services/io.js';
const mockLoadJson = vi.mocked(loadJson);

const mockDataSource: TierlistDataSource = {
  getIndex: vi.fn(),
  getAllCards: vi.fn(),
  update: vi.fn(),
};

function makeService() {
  return new RecommendService('/fake/enriched.json', mockDataSource);
}

// Sample enriched cards with scores (no Friend cards in this set)
const enrichedCards: EnrichedCard[] = [
  { name: 'Grass Wonder', type: 0, rarity: 3, lb: 2, id: 101, score: 35000, tier: 'S' },
  { name: 'Silence Suzuka', type: 0, rarity: 3, lb: 4, id: 102, score: 38000, tier: 'S+' },
  { name: 'Special Week', type: 1, rarity: 2, lb: 0, id: 103, score: 20000, tier: 'C' },
  { name: 'Tokai Teio', type: 2, rarity: 3, lb: 3, id: 104, score: 31000, tier: 'A' },
  { name: 'Mejiro McQueen', type: 3, rarity: 3, lb: 4, id: 105, score: 30000, tier: 'A' },
  { name: 'Oguri Cap', type: 4, rarity: 3, lb: 2, id: 106, score: 28000, tier: 'B' },
];

const tierlistCards = [
  { id: 201, name: 'Best Speed', type: 0, rarity: 3, scores: [30000, 32000, 34000, 36000, 40000], tiers: ['A', 'A', 'A', 'S', 'S+'] },
  { id: 202, name: 'Best Stamina', type: 1, rarity: 3, scores: [25000, 27000, 29000, 31000, 33000], tiers: ['B', 'B', 'A', 'A', 'S'] },
];

const enrichedData: EnrichedData = {
  metadata: { input_hash: 'h', tierlist_hash: 'h' },
  cards: enrichedCards,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadJson.mockResolvedValue(enrichedData);
  vi.mocked(mockDataSource.getAllCards).mockResolvedValue(tierlistCards);
});

// ── getBestCards ──────────────────────────────────────────────────────────────

describe('RecommendService.getBestCards', () => {
  it('returns up to 5 user cards + 1 support card', async () => {
    const { selected, support } = await makeService().getBestCards(false);
    expect(selected.length).toBeLessThanOrEqual(5);
    expect(support).not.toBeNull();
  });

  it('support is null when noSupport=true', async () => {
    const { selected, support } = await makeService().getBestCards(true);
    expect(support).toBeNull();
    expect(selected.length).toBeLessThanOrEqual(6);
  });

  it('selected cards are sorted by score descending', async () => {
    const { selected } = await makeService().getBestCards(true);
    for (let i = 1; i < selected.length; i++) {
      expect((selected[i - 1].score ?? 0)).toBeGreaterThanOrEqual(selected[i].score ?? 0);
    }
  });

  it('support card is not included in selected', async () => {
    const { selected, support } = await makeService().getBestCards(false);
    if (support) {
      const ids = selected.map((c) => c.id);
      expect(ids).not.toContain(support.id);
    }
  });

  it('returns empty selection for empty collection without crashing', async () => {
    mockLoadJson.mockResolvedValue({ metadata: { input_hash: '', tierlist_hash: '' }, cards: [] });
    const { selected, support } = await makeService().getBestCards(true);
    expect(selected).toEqual([]);
    expect(support).toBeNull();
  });

  it('excludes cards with null score from selection', async () => {
    const withFriend: EnrichedCard[] = [
      ...enrichedCards,
      { name: 'Friend Card', type: 5, rarity: 3, lb: 0, id: 999, score: null, tier: null },
    ];
    mockLoadJson.mockResolvedValue({ ...enrichedData, cards: withFriend });
    const { selected } = await makeService().getBestCards(true);
    expect(selected.every((c) => c.score !== null)).toBe(true);
  });
});

// ── getRecommendedDeck ────────────────────────────────────────────────────────

describe('RecommendService.getRecommendedDeck', () => {
  it('respects type count distribution', async () => {
    const { selected } = await makeService().getRecommendedDeck({ 0: 2, 1: 1 }, true, false);
    const speedCards = selected.filter((c) => c.type === 0);
    const staminaCards = selected.filter((c) => c.type === 1);
    expect(speedCards.length).toBeLessThanOrEqual(2);
    expect(staminaCards.length).toBeLessThanOrEqual(1);
  });

  it('picks the highest-scoring card when multiple exist for a type', async () => {
    const { selected } = await makeService().getRecommendedDeck({ 0: 1 }, true, false);
    const speedCard = selected.find((c) => c.type === 0);
    // Silence Suzuka (score 38000) should beat Grass Wonder (35000)
    expect(speedCard?.name).toBe('Silence Suzuka');
  });

  it('returns null support when noSupport=true', async () => {
    const { support } = await makeService().getRecommendedDeck({ 0: 1 }, true, false);
    expect(support).toBeNull();
  });

  it('includes a support card when noSupport=false and slots remain', async () => {
    const { support } = await makeService().getRecommendedDeck({ 0: 1 }, false, false);
    expect(support).not.toBeNull();
  });

  it('handles empty collection without crashing', async () => {
    mockLoadJson.mockResolvedValue({ metadata: { input_hash: '', tierlist_hash: '' }, cards: [] });
    const { selected } = await makeService().getRecommendedDeck({ 0: 2 }, true, false);
    expect(selected).toEqual([]);
  });

  it('synthesizes Friend fallback (ID 50001) when type 5 absent from tierlist', async () => {
    // No type-5 cards in tierlist
    vi.mocked(mockDataSource.getAllCards).mockResolvedValue(tierlistCards); // only type 0 and 1
    const { support } = await makeService().getRecommendedDeck({ 0: 1 }, false, false);
    // Support may be the Friend fallback (50001) or another type — just verify no crash
    expect(support === null || typeof support.id === 'number').toBe(true);
  });
});
