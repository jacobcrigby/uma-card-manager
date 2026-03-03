"""API routes for deck recommendations."""

from fastapi import APIRouter, HTTPException, status
from pathlib import Path

from ..models.card import RecommendationRequest, RecommendationResponse, RecommendedCard
from ..services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Initialize service
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
recommendation_service = RecommendationService(DATA_DIR)


@router.post("", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get deck recommendations based on type distribution or just best cards.

    Returns a 6-card deck consisting of:
    - 5 cards from your collection (or best available if type_counts is empty)
    - 1 borrowed card from the tierlist (unless no_support=True)

    Note: The game requires exactly one borrowed card in every deck.
    """
    try:
        # If no type counts specified, return best cards
        if not request.type_counts or sum(request.type_counts.values()) == 0:
            selected, support_card = recommendation_service.get_best_cards(
                no_support=request.no_support
            )
        else:
            selected, support_card = recommendation_service.get_recommended_deck(
                type_counts=request.type_counts,
                no_support=request.no_support,
                borrow_friend=request.borrow_friend
            )

        # Convert to response format
        recommended_cards = []

        # Add selected cards from collection FIRST
        for card in selected:
            recommended_cards.append(
                RecommendedCard(
                    name=card.get("name", "Unknown"),
                    type=card.get("type", 0),
                    score=card.get("score", 0),
                    tier=card.get("tier"),
                    lb=card.get("lb"),
                    rarity=card.get("rarity"),
                    is_borrowed=False,
                )
            )

        # Add borrowed card at the BOTTOM if present
        if support_card:
            card_id, name, card_type, score, tier = support_card
            recommended_cards.append(
                RecommendedCard(
                    name=name,
                    type=card_type,
                    score=score,
                    tier=tier,
                    lb=4,  # Borrowed cards are always at MLB
                    rarity=3,  # Show as SSR for display purposes
                    is_borrowed=True,
                )
            )

        # Calculate total score
        total_score = sum(c.score for c in recommended_cards)

        return RecommendationResponse(cards=recommended_cards, total_score=total_score)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}",
        )
