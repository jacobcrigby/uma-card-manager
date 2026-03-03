/**
 * TypeScript types for the Uma card manager API.
 * These mirror the Pydantic models on the backend.
 */

export interface CardBase {
  name: string;
  type: number; // 0-5 (Speed, Stamina, Power, Guts, Wit, Friend)
  rarity: number; // 1-3 (R, SR, SSR)
}

export interface CardCreate extends CardBase {}

export interface CardLBUpdate {
  lb: number; // 0-4 (0 = base, 4 = MLB)
}

export interface CardResponse extends CardBase {
  lb: number; // 0-4 (0 = base, 4 = MLB)
}

export interface EnrichedCard extends CardResponse {
  id: number;
  score: number | null; // null for cards without tierlist data (e.g., Friend cards)
  tier: string | null; // S+, S, A, B, C, D, E, F, or null
}

export interface CardListResponse {
  cards: CardResponse[];
  total: number;
}

export interface EnrichedCardListResponse {
  cards: EnrichedCard[];
  total: number;
}

export interface CardUpdateResponse {
  card: CardResponse;
  message: string;
}

export interface EnrichmentStatus {
  needs_enrichment: boolean;
  enriched_count: number;
  total_count: number;
}

export interface FileStatus {
  my_cards_mtime: number;
  enriched_mtime: number;
  timestamp: number;
}

export interface RecommendationRequest {
  type_counts: { [key: number]: number };
  no_support: boolean;
  borrow_friend?: boolean; // Prefer borrowing a Friend card if Friend cards are requested
}

export interface RecommendedCard {
  name: string;
  type: number;
  score: number;
  tier?: string;
  lb?: number;
  rarity?: number;
  is_borrowed: boolean;
}

export interface RecommendationResponse {
  cards: RecommendedCard[];
  total_score: number;
}
