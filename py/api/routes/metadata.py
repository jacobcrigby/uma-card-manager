"""API routes for metadata and file status."""

from fastapi import APIRouter
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/metadata", tags=["metadata"])

# Data directory
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent


@router.get("/types")
async def get_types():
    """Get card type names."""
    return {
        0: "Speed",
        1: "Stamina",
        2: "Power",
        3: "Guts",
        4: "Wit",
        5: "Friend",
    }


@router.get("/rarities")
async def get_rarities():
    """Get rarity names."""
    return {1: "R", 2: "SR", 3: "SSR"}


@router.get("/tiers")
async def get_tier_order():
    """Get tier order from highest to lowest."""
    return ["S+", "S", "A", "B", "C", "D", "E", "F"]


@router.get("/file-status")
async def get_file_status():
    """Get modification timestamps of data files for change detection."""
    my_cards_path = DATA_DIR / "my_cards.json"
    enriched_path = DATA_DIR / "my_cards_enriched.json"

    def get_mtime(path: Path) -> float:
        """Get modification time as timestamp, or 0 if file doesn't exist."""
        try:
            return path.stat().st_mtime if path.exists() else 0
        except Exception:
            return 0

    return {
        "my_cards_mtime": get_mtime(my_cards_path),
        "enriched_mtime": get_mtime(enriched_path),
        "timestamp": datetime.now().timestamp(),
    }
