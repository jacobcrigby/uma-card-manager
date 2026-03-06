import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichService } from '../../services/enrichService.js';
import type { TierlistDataSource } from '../../datasource/interface.js';
import type { EnrichedData, UserCard } from '../../types.js';

vi.mock('../../services/io.js', () => ({
  loadJson: vi.fn(),
  saveJson: vi.fn(),
  getFileHash: vi.fn(),
}));

import { loadJson, saveJson, getFileHash } from '../../services/io.js';
const mockLoadJson = vi.mocked(loadJson);
const mockSaveJson = vi.mocked(saveJson);
const mockGetFileHash = vi.mocked(getFileHash);

const mockDataSource: TierlistDataSource = {
  getIndex: vi.fn(),
  getAllCards: vi.fn(),
  update: vi.fn(),
};

function makeService() {
  return new EnrichService(
    '/fake/my_cards.json',
    '/fake/tierlist.json',
    '/fake/enriched.json',
    mockDataSource,
  );
}

const sampleUserCards: UserCard[] = [
  { name: 'Grass Wonder', type: 0, rarity: 3, lb: 2 },
  { name: 'Friend Card', type: 5, rarity: 3, lb: 0 },
];

const tierlistIndex = new Map([
  ['Grass Wonder|0|3', { id: 101, name: 'Grass Wonder', type: 0, rarity: 3, scores: [28000, 30000, 32000, 34000, 36000], tiers: ['B', 'A', 'A', 'S', 'S+'] }],
]);

const upToDateEnrichedData: EnrichedData = {
  metadata: { input_hash: 'hash-cards', tierlist_hash: 'hash-tierlist' },
  cards: [{ name: 'Grass Wonder', type: 0, rarity: 3, lb: 2, id: 101, score: 32000, tier: 'A' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveJson.mockResolvedValue(undefined);
});

// ── needsEnrichment ───────────────────────────────────────────────────────────

describe('EnrichService.needsEnrichment', () => {
  it('returns true when enriched file cannot be loaded', async () => {
    mockLoadJson.mockRejectedValue(new Error('ENOENT'));
    expect(await makeService().needsEnrichment()).toBe(true);
  });

  it('returns false when hashes match', async () => {
    mockLoadJson.mockResolvedValue(upToDateEnrichedData);
    mockGetFileHash
      .mockResolvedValueOnce('hash-cards')
      .mockResolvedValueOnce('hash-tierlist');
    expect(await makeService().needsEnrichment()).toBe(false);
  });

  it('returns true when input hash differs', async () => {
    mockLoadJson.mockResolvedValue(upToDateEnrichedData);
    mockGetFileHash
      .mockResolvedValueOnce('different-hash')
      .mockResolvedValueOnce('hash-tierlist');
    expect(await makeService().needsEnrichment()).toBe(true);
  });

  it('returns true when tierlist hash differs', async () => {
    mockLoadJson.mockResolvedValue(upToDateEnrichedData);
    mockGetFileHash
      .mockResolvedValueOnce('hash-cards')
      .mockResolvedValueOnce('different-hash');
    expect(await makeService().needsEnrichment()).toBe(true);
  });
});

// ── enrich ────────────────────────────────────────────────────────────────────

describe('EnrichService.enrich', () => {
  beforeEach(() => {
    vi.mocked(mockDataSource.getIndex).mockResolvedValue(tierlistIndex);
    mockGetFileHash.mockResolvedValue('some-hash');
  });

  it('matches cards by name|type|rarity key', async () => {
    mockLoadJson.mockResolvedValueOnce(sampleUserCards); // cards
    const svc = makeService();
    const cards = await svc.enrich(true);
    const wonder = cards.find((c) => c.name === 'Grass Wonder');
    expect(wonder?.id).toBe(101);
    expect(wonder?.score).toBe(32000); // lb=2 → scores[2]
    expect(wonder?.tier).toBe('A');    // tiers[2]
  });

  it('uses lb as the index into scores/tiers arrays', async () => {
    const cardsAtLb4: UserCard[] = [{ name: 'Grass Wonder', type: 0, rarity: 3, lb: 4 }];
    mockLoadJson.mockResolvedValueOnce(cardsAtLb4);
    const [card] = await makeService().enrich(true);
    expect(card.score).toBe(36000); // scores[4]
    expect(card.tier).toBe('S+');   // tiers[4]
  });

  it('assigns synthetic ID (40000–49999) for unmatched cards', async () => {
    mockLoadJson.mockResolvedValueOnce([{ name: 'Friend Card', type: 5, rarity: 3, lb: 0 }]);
    const [card] = await makeService().enrich(true);
    expect(card.id).toBeGreaterThanOrEqual(40000);
    expect(card.id).toBeLessThan(50000);
  });

  it('sets score and tier to null for unmatched cards', async () => {
    mockLoadJson.mockResolvedValueOnce([{ name: 'Friend Card', type: 5, rarity: 3, lb: 0 }]);
    const [card] = await makeService().enrich(true);
    expect(card.score).toBeNull();
    expect(card.tier).toBeNull();
  });

  it('saves output with metadata hashes', async () => {
    mockLoadJson.mockResolvedValueOnce(sampleUserCards);
    mockGetFileHash.mockResolvedValue('test-hash');
    await makeService().enrich(true);
    expect(mockSaveJson).toHaveBeenCalledOnce();
    const saved = mockSaveJson.mock.calls[0][1] as EnrichedData;
    expect(saved.metadata.input_hash).toBe('test-hash');
    expect(saved.metadata.tierlist_hash).toBe('test-hash');
    expect(saved.cards).toHaveLength(2);
  });

  it('skips enrichment and returns cached cards when hashes match and force=false', async () => {
    // needsEnrichment checks: load enriched file + compare hashes
    mockLoadJson.mockResolvedValueOnce(upToDateEnrichedData); // for needsEnrichment
    mockGetFileHash
      .mockResolvedValueOnce('hash-cards')
      .mockResolvedValueOnce('hash-tierlist');
    // If not skipped, enrich() would call loadJson again for cards + getIndex
    mockLoadJson.mockResolvedValueOnce(upToDateEnrichedData); // for the cached read
    const cards = await makeService().enrich(false);
    expect(vi.mocked(mockDataSource.getIndex)).not.toHaveBeenCalled();
    expect(cards).toEqual(upToDateEnrichedData.cards);
  });

  it('re-enriches when force=true even if hashes match', async () => {
    mockLoadJson.mockResolvedValueOnce(sampleUserCards);
    const cards = await makeService().enrich(true);
    expect(vi.mocked(mockDataSource.getIndex)).toHaveBeenCalled();
    expect(cards.length).toBeGreaterThan(0);
  });

  it('handles empty cards list', async () => {
    mockLoadJson.mockResolvedValueOnce([]);
    const cards = await makeService().enrich(true);
    expect(cards).toEqual([]);
  });
});

// ── getEnrichedCards ──────────────────────────────────────────────────────────

describe('EnrichService.getEnrichedCards', () => {
  it('returns cached cards without enriching when autoEnrich=false and hashes match', async () => {
    mockLoadJson.mockResolvedValueOnce(upToDateEnrichedData); // needsEnrichment
    mockGetFileHash
      .mockResolvedValueOnce('hash-cards')
      .mockResolvedValueOnce('hash-tierlist');
    mockLoadJson.mockResolvedValueOnce(upToDateEnrichedData); // actual load
    const cards = await makeService().getEnrichedCards(false);
    expect(cards).toEqual(upToDateEnrichedData.cards);
    expect(vi.mocked(mockDataSource.getIndex)).not.toHaveBeenCalled();
  });
});
