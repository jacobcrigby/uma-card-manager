/**
 * API client for the Uma card manager backend.
 */

import type {
  CardCreate,
  CardLBUpdate,
  CardResponse,
  CardUpdateResponse,
  EnrichedCard,
  EnrichedCardListResponse,
  EnrichmentStatus,
  FileStatus,
  RecommendationRequest,
  RecommendationResponse,
} from './types';

export class ApiClient {
  private baseUrl = '/api/v1';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timed out after 30 s');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`API error: response was not valid JSON`);
    }
  }

  async getCards(): Promise<CardResponse[]> {
    const result = await this.request<{ cards: CardResponse[]; total: number }>('/cards');
    return result.cards;
  }

  async getEnrichedCards(): Promise<EnrichedCard[]> {
    const result = await this.request<EnrichedCardListResponse>('/cards/enriched');
    return result.cards;
  }

  async addCard(card: CardCreate): Promise<CardUpdateResponse> {
    return this.request<CardUpdateResponse>('/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    });
  }

  async deleteCard(index: number): Promise<void> {
    await this.request<void>(`/cards/${index}`, {
      method: 'DELETE',
    });
  }

  async updateCardLB(index: number, lb: number): Promise<CardUpdateResponse> {
    return this.request<CardUpdateResponse>(`/cards/${index}`, {
      method: 'PATCH',
      body: JSON.stringify({ lb }),
    });
  }

  async getEnrichmentStatus(): Promise<EnrichmentStatus> {
    return this.request<EnrichmentStatus>('/enrich/status');
  }

  async triggerEnrichment(force: boolean = false): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>(
      `/enrich${force ? '?force=true' : ''}`,
      {
        method: 'POST',
      }
    );
  }

  async getFileStatus(): Promise<FileStatus> {
    return this.request<FileStatus>('/metadata/file-status');
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    return this.request<RecommendationResponse>('/recommendations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}
