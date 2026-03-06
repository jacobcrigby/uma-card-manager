import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../services/api.js';

function makeFetch(status: number, body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

let client: ApiClient;

beforeEach(() => {
  client = new ApiClient();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── getCards ──────────────────────────────────────────────────────────────────

describe('ApiClient.getCards', () => {
  it('calls GET /api/v1/cards and returns cards array', async () => {
    const cards = [{ name: 'Grass Wonder', type: 0, rarity: 3, lb: 2 }];
    vi.stubGlobal('fetch', makeFetch(200, { cards, total: 1 }));
    const result = await client.getCards();
    expect(result).toEqual(cards);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/cards');
  });
});

// ── getEnrichedCards ──────────────────────────────────────────────────────────

describe('ApiClient.getEnrichedCards', () => {
  it('calls GET /api/v1/cards/enriched and returns cards array', async () => {
    const cards = [{ name: 'Grass Wonder', type: 0, rarity: 3, lb: 2, id: 101, score: 32000, tier: 'A' }];
    vi.stubGlobal('fetch', makeFetch(200, { cards, total: 1 }));
    const result = await client.getEnrichedCards();
    expect(result).toEqual(cards);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/cards/enriched');
  });
});

// ── addCard ───────────────────────────────────────────────────────────────────

describe('ApiClient.addCard', () => {
  it('calls POST /api/v1/cards with correct body', async () => {
    const response = { card: { name: 'New Card', type: 0, rarity: 3, lb: 0 }, message: 'Added' };
    const mockFetch = makeFetch(201, response);
    vi.stubGlobal('fetch', mockFetch);
    await client.addCard({ name: 'New Card', type: 0, rarity: 3 });
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/cards');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'New Card', type: 0, rarity: 3 });
  });
});

// ── deleteCard ────────────────────────────────────────────────────────────────

describe('ApiClient.deleteCard', () => {
  it('calls DELETE /api/v1/cards/0 and returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 204,
      json: async () => undefined,
      text: async () => '',
    }));
    const result = await client.deleteCard(0);
    expect(result).toBeUndefined();
    const [url, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/cards/0');
    expect(opts.method).toBe('DELETE');
  });
});

// ── updateCardLB ──────────────────────────────────────────────────────────────

describe('ApiClient.updateCardLB', () => {
  it('calls PATCH /api/v1/cards/0 with {lb: N}', async () => {
    const response = { card: { name: 'Card', type: 0, rarity: 3, lb: 3 }, message: 'Updated' };
    const mockFetch = makeFetch(200, response);
    vi.stubGlobal('fetch', mockFetch);
    await client.updateCardLB(0, 3);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/cards/0');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string)).toEqual({ lb: 3 });
  });
});

// ── getEnrichmentStatus ───────────────────────────────────────────────────────

describe('ApiClient.getEnrichmentStatus', () => {
  it('calls GET /api/v1/enrich/status', async () => {
    const status = { needs_enrichment: false, enriched_count: 5, total_count: 5 };
    vi.stubGlobal('fetch', makeFetch(200, status));
    const result = await client.getEnrichmentStatus();
    expect(result).toEqual(status);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/enrich/status');
  });
});

// ── triggerEnrichment ─────────────────────────────────────────────────────────

describe('ApiClient.triggerEnrichment', () => {
  it('calls POST /api/v1/enrich without force param by default', async () => {
    const mockFetch = makeFetch(200, { message: 'ok', count: 5 });
    vi.stubGlobal('fetch', mockFetch);
    await client.triggerEnrichment(false);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/enrich');
    expect(url).not.toContain('force=true');
    expect(opts.method).toBe('POST');
  });

  it('adds ?force=true when force is true', async () => {
    const mockFetch = makeFetch(200, { message: 'ok', count: 5 });
    vi.stubGlobal('fetch', mockFetch);
    await client.triggerEnrichment(true);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('force=true');
  });
});

// ── getFileStatus ─────────────────────────────────────────────────────────────

describe('ApiClient.getFileStatus', () => {
  it('calls GET /api/v1/metadata/file-status', async () => {
    const status = { my_cards_mtime: 1000, enriched_mtime: 2000, timestamp: 3000 };
    vi.stubGlobal('fetch', makeFetch(200, status));
    const result = await client.getFileStatus();
    expect(result).toEqual(status);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/metadata/file-status');
  });
});

// ── getRecommendations ────────────────────────────────────────────────────────

describe('ApiClient.getRecommendations', () => {
  it('calls POST /api/v1/recommendations with the request body', async () => {
    const response = { cards: [], total_score: 0 };
    const mockFetch = makeFetch(200, response);
    vi.stubGlobal('fetch', mockFetch);
    const request = { type_counts: { 0: 2, 1: 1 }, no_support: false };
    await client.getRecommendations(request);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/recommendations');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual(request);
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('ApiClient error handling', () => {
  it('throws an Error with status code when response is not ok', async () => {
    vi.stubGlobal('fetch', makeFetch(404, 'Not found', false));
    await expect(client.getCards()).rejects.toThrow(/404/);
  });

  it('includes HTTP status in the error message', async () => {
    vi.stubGlobal('fetch', makeFetch(500, 'Server error', false));
    await expect(client.getEnrichedCards()).rejects.toThrow('500');
  });

  it('sends Content-Type: application/json header', async () => {
    const mockFetch = makeFetch(200, { cards: [], total: 0 });
    vi.stubGlobal('fetch', mockFetch);
    await client.getCards();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});
