"""API routes for enrichment operations."""

from fastapi import APIRouter, HTTPException, status
from pathlib import Path

from ..models.card import EnrichmentStatus
from ..services.enrichment_service import EnrichmentService

router = APIRouter(prefix="/enrich", tags=["enrichment"])

# Initialize service
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
enrichment_service = EnrichmentService(DATA_DIR)


@router.get("/status", response_model=EnrichmentStatus)
async def get_enrichment_status():
    """Check if enrichment is needed."""
    needs_enrich = enrichment_service.needs_enrichment()
    enriched_count = enrichment_service.get_enriched_card_count()
    total_count = enrichment_service.get_total_card_count()

    return EnrichmentStatus(
        needs_enrichment=needs_enrich,
        enriched_count=enriched_count,
        total_count=total_count,
    )


@router.post("", status_code=status.HTTP_200_OK)
async def trigger_enrichment(force: bool = False):
    """Manually trigger enrichment."""
    try:
        count = enrichment_service.enrich(force=force)
        return {"message": f"Successfully enriched {count} cards", "count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enrich cards: {str(e)}",
        )
