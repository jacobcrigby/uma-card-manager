"""Pydantic models for card API endpoints."""

from pydantic import BaseModel, Field
from typing import Optional


class CardBase(BaseModel):
    """Base card model with common fields."""

    name: str
    type: int = Field(ge=0, le=5, description="Card type: 0-5 (Speed, Stamina, Power, Guts, Wit, Friend)")
    rarity: int = Field(ge=1, le=3, description="Card rarity: 1-3 (R, SR, SSR)")


class CardCreate(CardBase):
    """Model for creating a new card."""

    pass


class CardResponse(CardBase):
    """Model for card response with LB level."""

    lb: int = Field(ge=0, le=4, description="Limit break level: 0-4 (4 = MLB)")


class EnrichedCardResponse(CardResponse):
    """Model for enriched card with tier and score.

    Note: score and tier may be None for cards not in the tierlist (e.g., Friend cards).
    """

    id: int = Field(description="Card ID from tierlist or synthetic ID")
    score: Optional[int] = Field(default=None, description="Card score at current LB level (None for cards without tierlist data)")
    tier: Optional[str] = Field(default=None, description="Card tier: S+, S, A, B, C, D, E, F (None for cards without tierlist data)")


class CardListResponse(BaseModel):
    """Response model for list of cards."""

    cards: list[CardResponse]
    total: int


class EnrichedCardListResponse(BaseModel):
    """Response model for list of enriched cards."""

    cards: list[EnrichedCardResponse]
    total: int


class CardLBUpdate(BaseModel):
    """Model for updating a card's LB level."""

    lb: int = Field(ge=0, le=4, description="New limit break level: 0-4 (4 = MLB)")


class CardUpdateResponse(BaseModel):
    """Response model for card creation/update."""

    card: CardResponse
    message: str


class EnrichmentStatus(BaseModel):
    """Status of card enrichment."""

    needs_enrichment: bool
    enriched_count: int
    total_count: int


class RecommendationRequest(BaseModel):
    """Request model for deck recommendations."""

    type_counts: dict[int, int] = Field(
        default={}, description="Desired count of each type: {0: 2, 1: 1, ...}"
    )
    no_support: bool = Field(
        default=False, description="If True, don't borrow a card from tierlist"
    )
    borrow_friend: bool = Field(
        default=False, description="Prefer borrowing a Friend card (type 5) if available"
    )


class RecommendedCard(BaseModel):
    """Model for a recommended card."""

    name: str
    type: int
    score: int
    tier: Optional[str] = None
    lb: Optional[int] = None
    rarity: Optional[int] = None
    is_borrowed: bool = False


class RecommendationResponse(BaseModel):
    """Response model for deck recommendations."""

    cards: list[RecommendedCard]
    total_score: int
