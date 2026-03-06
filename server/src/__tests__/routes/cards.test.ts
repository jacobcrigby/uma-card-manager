import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createCardsRouter } from '../../routes/cards.js';
import type { CardService } from '../../services/cardService.js';
import type { EnrichService } from '../../services/enrichService.js';

const sampleCards = [
  { name: 'Grass Wonder', type: 0, rarity: 3, lb: 2 },
  { name: 'Special Week', type: 1, rarity: 2, lb: 0 },
];

const enrichedCards = [
  { name: 'Grass Wonder', type: 0, rarity: 3, lb: 2, id: 101, score: 32000, tier: 'A' },
];

// Typed mock helpers
const mockCardService = {
  getAll: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  updateLb: vi.fn(),
} as unknown as CardService;

const mockEnrichService = {
  getEnrichedCards: vi.fn(),
  needsEnrichment: vi.fn(),
  enrich: vi.fn(),
  getEnrichedCount: vi.fn(),
} as unknown as EnrichService;

function buildApp() {
  const app = new Hono();
  app.route('/cards', createCardsRouter(mockCardService, mockEnrichService));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /cards ────────────────────────────────────────────────────────────────

describe('GET /cards', () => {
  it('returns 200 with cards array and total', async () => {
    vi.mocked(mockCardService.getAll).mockResolvedValue(sampleCards);
    const res = await buildApp().request('/cards');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cards).toEqual(sampleCards);
    expect(body.total).toBe(2);
  });

  it('returns empty array when no cards', async () => {
    vi.mocked(mockCardService.getAll).mockResolvedValue([]);
    const res = await buildApp().request('/cards');
    const body = await res.json();
    expect(body.cards).toEqual([]);
    expect(body.total).toBe(0);
  });
});

// ── GET /cards/enriched ───────────────────────────────────────────────────────

describe('GET /cards/enriched', () => {
  it('returns 200 with enriched cards', async () => {
    vi.mocked(mockEnrichService.getEnrichedCards).mockResolvedValue(enrichedCards);
    const res = await buildApp().request('/cards/enriched');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cards[0].score).toBe(32000);
    expect(body.cards[0].tier).toBe('A');
  });
});

// ── POST /cards ───────────────────────────────────────────────────────────────

describe('POST /cards', () => {
  it('returns 201 with card and message on success', async () => {
    const newCard = { name: 'New Card', type: 0, rarity: 3, lb: 0 };
    vi.mocked(mockCardService.add).mockResolvedValue({ card: newCard, message: "Added 'New Card' with LB 0" });
    const res = await buildApp().request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Card', type: 0, rarity: 3 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.card.name).toBe('New Card');
    expect(body.message).toContain('New Card');
  });

  it('returns 400 when name is empty', async () => {
    const res = await buildApp().request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', type: 0, rarity: 3 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when type is out of range (6)', async () => {
    const res = await buildApp().request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Card', type: 6, rarity: 3 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when rarity is out of range (4)', async () => {
    const res = await buildApp().request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Card', type: 0, rarity: 4 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is missing fields', async () => {
    const res = await buildApp().request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Card' }),
    });
    expect(res.status).toBe(400);
  });
});

// ── PATCH /cards/:index ───────────────────────────────────────────────────────

describe('PATCH /cards/:index', () => {
  it('returns 200 with updated card', async () => {
    const updated = { name: 'Grass Wonder', type: 0, rarity: 3, lb: 4 };
    vi.mocked(mockCardService.updateLb).mockResolvedValue(updated);
    const res = await buildApp().request('/cards/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lb: 4 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card.lb).toBe(4);
  });

  it('returns 400 when lb is out of range (5)', async () => {
    const res = await buildApp().request('/cards/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lb: 5 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when index is NaN', async () => {
    const res = await buildApp().request('/cards/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lb: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when service throws RangeError', async () => {
    vi.mocked(mockCardService.updateLb).mockRejectedValue(new RangeError('out of range'));
    const res = await buildApp().request('/cards/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lb: 2 }),
    });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /cards/:index ──────────────────────────────────────────────────────

describe('DELETE /cards/:index', () => {
  it('returns 204 on success', async () => {
    vi.mocked(mockCardService.delete).mockResolvedValue(undefined);
    const res = await buildApp().request('/cards/0', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 400 when index is NaN', async () => {
    const res = await buildApp().request('/cards/abc', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when service throws RangeError', async () => {
    vi.mocked(mockCardService.delete).mockRejectedValue(new RangeError('out of range'));
    const res = await buildApp().request('/cards/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
