import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardService } from '../../services/cardService.js';

// Mock the io module so no real files are touched.
vi.mock('../../services/io.js', () => ({
  loadJson: vi.fn(),
  saveJson: vi.fn(),
}));

import { loadJson, saveJson } from '../../services/io.js';
const mockLoadJson = vi.mocked(loadJson);
const mockSaveJson = vi.mocked(saveJson);

const CARDS_PATH = '/fake/my_cards.json';

function makeService() {
  return new CardService(CARDS_PATH);
}

const sampleCards = [
  { name: 'Grass Wonder', type: 0, rarity: 3, lb: 2 },
  { name: 'Special Week', type: 1, rarity: 2, lb: 0 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveJson.mockResolvedValue(undefined);
});

// ── getAll ────────────────────────────────────────────────────────────────────

describe('CardService.getAll', () => {
  it('returns parsed cards from file', async () => {
    mockLoadJson.mockResolvedValue(sampleCards);
    const svc = makeService();
    expect(await svc.getAll()).toEqual(sampleCards);
  });

  it('returns empty array when file load fails', async () => {
    mockLoadJson.mockRejectedValue(new Error('ENOENT'));
    expect(await makeService().getAll()).toEqual([]);
  });
});

// ── add ───────────────────────────────────────────────────────────────────────

describe('CardService.add', () => {
  it('adds a new card with lb=0', async () => {
    mockLoadJson.mockResolvedValue([]);
    const svc = makeService();
    const { card, message } = await svc.add('New Card', 0, 3);
    expect(card).toEqual({ name: 'New Card', type: 0, rarity: 3, lb: 0 });
    expect(message).toContain('New Card');
    expect(mockSaveJson).toHaveBeenCalledOnce();
  });

  it('increments lb for an existing card', async () => {
    mockLoadJson.mockResolvedValue([{ name: 'Grass Wonder', type: 0, rarity: 3, lb: 2 }]);
    const { card, message } = await makeService().add('Grass Wonder', 0, 3);
    expect(card.lb).toBe(3);
    expect(message).toContain('Grass Wonder');
    expect(mockSaveJson).toHaveBeenCalledOnce();
  });

  it('increments lb from 0 to 1', async () => {
    mockLoadJson.mockResolvedValue([{ name: 'Card', type: 0, rarity: 1, lb: 0 }]);
    const { card } = await makeService().add('Card', 0, 1);
    expect(card.lb).toBe(1);
  });

  it('does not save when card is already at max lb (4)', async () => {
    mockLoadJson.mockResolvedValue([{ name: 'MLB Card', type: 0, rarity: 3, lb: 4 }]);
    const { card, message } = await makeService().add('MLB Card', 0, 3);
    expect(card.lb).toBe(4);
    expect(message.toLowerCase()).toContain('max');
    expect(mockSaveJson).not.toHaveBeenCalled();
  });

  it('matches by name+type+rarity (different rarity is a new card)', async () => {
    mockLoadJson.mockResolvedValue([{ name: 'Card', type: 0, rarity: 3, lb: 0 }]);
    const { card } = await makeService().add('Card', 0, 2); // rarity 2, not 3
    expect(card.lb).toBe(0); // new card
    expect(card.rarity).toBe(2);
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe('CardService.delete', () => {
  it('removes the card at the given index and saves', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    await makeService().delete(0);
    const saved = mockSaveJson.mock.calls[0][1] as typeof sampleCards;
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Special Week');
  });

  it('throws RangeError for a negative index', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    await expect(makeService().delete(-1)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for an index at cards.length', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    await expect(makeService().delete(2)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for an out-of-range index', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    await expect(makeService().delete(999)).rejects.toThrow(RangeError);
  });
});

// ── updateLb ──────────────────────────────────────────────────────────────────

describe('CardService.updateLb', () => {
  it('updates lb and returns the updated card', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    const card = await makeService().updateLb(0, 4);
    expect(card.lb).toBe(4);
    expect(card.name).toBe('Grass Wonder');
    expect(mockSaveJson).toHaveBeenCalledOnce();
  });

  it('throws RangeError when lb > 4', async () => {
    await expect(makeService().updateLb(0, 5)).rejects.toThrow(RangeError);
    expect(mockLoadJson).not.toHaveBeenCalled();
  });

  it('throws RangeError when lb < 0', async () => {
    await expect(makeService().updateLb(0, -1)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for an invalid index', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    await expect(makeService().updateLb(99, 2)).rejects.toThrow(RangeError);
  });

  it('accepts lb=0 (valid)', async () => {
    mockLoadJson.mockResolvedValue([...sampleCards]);
    const card = await makeService().updateLb(0, 0);
    expect(card.lb).toBe(0);
  });
});
