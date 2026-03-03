"""API routes for card management."""

from fastapi import APIRouter, HTTPException, status
from pathlib import Path

from ..models.card import (
    CardCreate,
    CardLBUpdate,
    CardListResponse,
    CardResponse,
    CardUpdateResponse,
    EnrichedCardListResponse,
    EnrichedCardResponse,
)
from ..services.card_service import CardService
from ..services.enrichment_service import EnrichmentService

router = APIRouter(prefix="/cards", tags=["cards"])

# Initialize services (data directory is parent of py/)
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
card_service = CardService(DATA_DIR)
enrichment_service = EnrichmentService(DATA_DIR)


@router.get("", response_model=CardListResponse)
async def get_cards():
    """Get all user cards."""
    cards = card_service.get_all_cards()
    return CardListResponse(
        cards=[CardResponse(**card) for card in cards], total=len(cards)
    )


@router.get("/enriched", response_model=EnrichedCardListResponse)
async def get_enriched_cards():
    """Get all enriched cards, auto-enriching if needed."""
    try:
        enriched_cards = enrichment_service.get_enriched_cards(auto_enrich=True)
        return EnrichedCardListResponse(
            cards=[EnrichedCardResponse(**card) for card in enriched_cards],
            total=len(enriched_cards),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get enriched cards: {str(e)}",
        )


@router.post("", response_model=CardUpdateResponse, status_code=status.HTTP_201_CREATED)
async def add_card(card_data: CardCreate):
    """Add a new card or increment limit break of existing card."""
    try:
        card, message = card_service.add_card(
            name=card_data.name, card_type=card_data.type, rarity=card_data.rarity
        )
        return CardUpdateResponse(card=CardResponse(**card), message=message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to add card: {str(e)}"
        )


@router.delete("/{index}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(index: int):
    """Delete a card by index."""
    try:
        card_service.delete_card(index)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete card: {str(e)}",
        )


@router.patch("/{index}", response_model=CardUpdateResponse)
async def update_card_lb(index: int, update_data: CardLBUpdate):
    """Update a card's limit break level."""
    try:
        updated_card = card_service.update_card_lb(index, update_data.lb)
        return CardUpdateResponse(
            card=CardResponse(**updated_card), message=f"Updated card LB to {update_data.lb}"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update card: {str(e)}",
        )
