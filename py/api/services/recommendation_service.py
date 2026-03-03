"""Service layer for deck recommendations, wrapping recommend.py logic."""

import sys
from pathlib import Path
from typing import Dict, List, Optional, cast

# Add parent directory to path to import existing modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from util import EnrichedCard, load_enriched_cards, load_json
from recommend import (
    get_best_cards_by_type_from_tierlist,
    find_best_card_in_tierlist,
    select_best_cards_by_type,
    get_tier_value,
)


class RecommendationService:
    """Service for generating deck recommendations."""

    def __init__(self, data_dir: Path):
        """
        Initialize the recommendation service.

        Args:
            data_dir: Path to the data directory
        """
        self.enriched_path = data_dir / "my_cards_enriched.json"
        self.tierlist_path = data_dir / "precomputed-tierlist.json"

    def get_best_cards(self, no_support: bool = False) -> tuple[List[EnrichedCard], Optional[tuple]]:
        """
        Get the best 6 cards regardless of type.

        Args:
            no_support: If True, don't include a support card from tierlist

        Returns:
            Tuple of (selected_cards, support_card_info)
        """
        my_cards = load_enriched_cards(self.enriched_path)

        # Find the best support card from tierlist if requested
        support_card = None
        exclude_id = None

        if not no_support:
            try:
                best_id, best_name, best_type, best_score, best_tier = find_best_card_in_tierlist(
                    self.tierlist_path, my_cards
                )
                support_card = (best_id, best_name, best_type, best_score, best_tier)
                exclude_id = best_id
            except Exception as e:
                print(f"Warning: could not find support card: {e}", file=sys.stderr)

        # Filter out the support card and sort by score
        available_cards = [
            card
            for card in my_cards
            if card.get("id") != exclude_id and card.get("score") is not None
        ]
        available_cards.sort(key=lambda c: c.get("score", 0), reverse=True)

        # Take top 5 (or 6 if no support)
        num_to_take = 5 if support_card else 6
        selected = available_cards[:num_to_take]

        return selected, support_card

    def get_recommended_deck(
        self, type_counts: Dict[int, int], no_support: bool = False, borrow_friend: bool = False
    ) -> tuple[List[EnrichedCard], Optional[tuple]]:
        """
        Get deck recommendation with specific type distribution.

        Args:
            type_counts: Dictionary mapping type (0-5) to count needed
            no_support: If True, don't include a support card from tierlist
            borrow_friend: If True, force borrowing a Friend card (type 5)

        Returns:
            Tuple of (selected_cards, support_card_info)
        """
        my_cards = load_enriched_cards(self.enriched_path)

        total_cards = sum(type_counts.values())
        if total_cards > 6:
            raise ValueError(f"Total card count ({total_cards}) exceeds 6")

        if total_cards == 0:
            raise ValueError("Must specify at least one card type")

        # Find the best support card from tierlist if requested
        support_card = None
        exclude_id = None
        selected: List[EnrichedCard] = []

        if not no_support and total_cards < 6:
            try:
                potential_borrows = get_best_cards_by_type_from_tierlist(
                    self.tierlist_path, my_cards
                )

                # If borrow_friend is True, only consider Friend cards (type 5)
                if borrow_friend:
                    if 5 in potential_borrows:
                        potential_borrows = {5: potential_borrows[5]}
                    else:
                        potential_borrows = {}

                best_overall_tier_val = -1
                best_overall_score = -1
                best_support = None
                best_selected_for_support: List[EnrichedCard] = []

                for borrow_candidate in potential_borrows.values():
                    cand_id, _, cand_type, cand_score, cand_tier = borrow_candidate

                    # Don't adjust type counts - borrowed card is ADDITIONAL to user's constraints
                    # User asks for "1 Friend" means 1 Friend from their collection + borrowed card
                    sim_type_counts = type_counts.copy()

                    # Simulate deck with this borrow_candidate
                    current_selected = select_best_cards_by_type(
                        my_cards, sim_type_counts, cand_id
                    )

                    # Fill remaining slots to reach 6 total
                    current_total = len(current_selected) + 1
                    if current_total < 6:
                        sel_ids = {c.get("id") for c in current_selected}
                        sel_ids.add(cand_id)
                        rem = [
                            c
                            for c in my_cards
                            if c.get("id") not in sel_ids and c.get("score") is not None
                        ]
                        rem.sort(key=lambda c: c.get("score", 0), reverse=True)
                        current_selected.extend(rem[: 6 - current_total])

                    # Calculate total score and tier value
                    total_score = cand_score + sum(
                        c.get("score", 0) for c in current_selected
                    )
                    total_tier_val = get_tier_value(cand_tier) + sum(
                        get_tier_value(cast(str, c.get("tier"))) for c in current_selected
                    )

                    # Compare by tier first, then score
                    if total_tier_val > best_overall_tier_val or (
                        total_tier_val == best_overall_tier_val
                        and total_score > best_overall_score
                    ):
                        best_overall_tier_val = total_tier_val
                        best_overall_score = total_score
                        best_support = borrow_candidate
                        best_selected_for_support = current_selected

                if best_support:
                    support_card = best_support
                    exclude_id = best_support[0]
                    selected = best_selected_for_support

            except Exception as e:
                print(f"Warning: could not find support card: {e}", file=sys.stderr)

        # If no support card, select cards normally
        if not support_card:
            selected = select_best_cards_by_type(my_cards, type_counts, exclude_id)

            # Fill remaining slots if needed
            current_total = len(selected)
            if current_total < 6:
                selected_ids = {card.get("id") for card in selected}
                remaining_cards = [
                    card
                    for card in my_cards
                    if card.get("id") not in selected_ids
                    and card.get("score") is not None
                ]
                remaining_cards.sort(key=lambda c: c.get("score", 0), reverse=True)
                num_to_add = 6 - current_total
                selected.extend(remaining_cards[:num_to_add])

        return selected, support_card
