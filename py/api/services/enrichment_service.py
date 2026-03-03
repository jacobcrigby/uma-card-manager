"""Service layer for enrichment operations, wrapping existing CLI logic."""

import sys
from pathlib import Path
from typing import List, cast

# Add parent directory to path to import existing modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from util import (
    EnrichedCard,
    EnrichedData,
    TierlistData,
    UserCard,
    get_file_hash,
    load_enriched_cards,
    load_json,
    save_json,
)
from enrich import build_tierlist_index, enrich_cards as enrich_cards_logic


class EnrichmentService:
    """Service for enriching user cards with tierlist data."""

    def __init__(self, data_dir: Path):
        """
        Initialize the enrichment service.

        Args:
            data_dir: Path to the data directory containing JSON files
        """
        self.my_cards_path = data_dir / "my_cards.json"
        self.tierlist_path = data_dir / "precomputed-tierlist.json"
        self.enriched_path = data_dir / "my_cards_enriched.json"

    def needs_enrichment(self) -> bool:
        """
        Check if enrichment is needed (input files changed since last enrichment).

        Returns:
            True if enrichment needed, False otherwise
        """
        if not self.enriched_path.exists():
            return True

        # Calculate current hashes
        current_input_hash = get_file_hash(self.my_cards_path)
        current_tierlist_hash = get_file_hash(self.tierlist_path)

        try:
            existing_data = load_json(self.enriched_path)
            if isinstance(existing_data, dict) and "metadata" in existing_data:
                metadata = existing_data.get("metadata", {})
                if (
                    metadata.get("input_hash") == current_input_hash
                    and metadata.get("tierlist_hash") == current_tierlist_hash
                ):
                    return False
        except Exception:
            # If anything goes wrong, assume we need to re-enrich
            pass

        return True

    def enrich(self, force: bool = False) -> int:
        """
        Perform enrichment of user cards with tierlist data.

        Args:
            force: If True, force re-enrichment even if not needed

        Returns:
            Number of enriched cards
        """
        # Check if enrichment needed
        if not force and not self.needs_enrichment():
            return self.get_enriched_card_count()

        # Load input data
        cards_data_obj = load_json(self.my_cards_path)
        if not isinstance(cards_data_obj, list):
            raise ValueError(f"Expected JSON array in {self.my_cards_path}")

        cards_data = cast(List[UserCard], cards_data_obj)

        # Load tierlist
        tierlist_data_obj = load_json(self.tierlist_path)
        tierlist_data = cast(TierlistData, tierlist_data_obj)
        tier_index = build_tierlist_index(tierlist_data)

        # Enrich cards
        enriched_cards = enrich_cards_logic(cards_data, tier_index)

        # Prepare output with metadata
        current_input_hash = get_file_hash(self.my_cards_path)
        current_tierlist_hash = get_file_hash(self.tierlist_path)

        output_data: EnrichedData = {
            "metadata": {
                "input_hash": current_input_hash,
                "tierlist_hash": current_tierlist_hash,
            },
            "cards": cast(List[EnrichedCard], enriched_cards),
        }

        # Save enriched data
        save_json(self.enriched_path, output_data, pretty=True)

        return len(enriched_cards)

    def get_enriched_cards(self, auto_enrich: bool = True) -> List[EnrichedCard]:
        """
        Get enriched cards, optionally triggering enrichment if needed.

        Args:
            auto_enrich: If True, automatically enrich if needed

        Returns:
            List of enriched cards
        """
        if auto_enrich and self.needs_enrichment():
            self.enrich(force=False)

        if not self.enriched_path.exists():
            return []

        return load_enriched_cards(self.enriched_path)

    def get_enriched_card_count(self) -> int:
        """Get number of enriched cards."""
        if not self.enriched_path.exists():
            return 0

        cards = load_enriched_cards(self.enriched_path)
        return len(cards)

    def get_total_card_count(self) -> int:
        """Get total number of user cards (not enriched)."""
        if not self.my_cards_path.exists():
            return 0

        cards = load_json(self.my_cards_path)
        if isinstance(cards, list):
            return len(cards)
        return 0
