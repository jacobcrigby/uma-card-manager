"""Service layer for card operations, wrapping existing CLI logic."""

import sys
from pathlib import Path
from typing import List, cast

# Add parent directory to path to import existing modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from util import UserCard, load_json, save_json
from add import add_card as add_card_logic, find_card_index


class CardService:
    """Service for managing user's card collection."""

    def __init__(self, data_dir: Path):
        """
        Initialize the card service.

        Args:
            data_dir: Path to the data directory containing my_cards.json
        """
        self.my_cards_path = data_dir / "my_cards.json"

    def get_all_cards(self) -> List[UserCard]:
        """
        Load all user cards from my_cards.json.

        Returns:
            List of UserCard dictionaries
        """
        if not self.my_cards_path.exists():
            # If file doesn't exist, return empty list
            return []

        data = load_json(self.my_cards_path)
        if not isinstance(data, list):
            raise ValueError(f"Expected JSON array in {self.my_cards_path}")

        return cast(List[UserCard], data)

    def add_card(self, name: str, card_type: int, rarity: int) -> tuple[UserCard, str]:
        """
        Add a new card or increment limit break of existing card.

        Args:
            name: Card name
            card_type: Card type (0-5)
            rarity: Card rarity (1-3)

        Returns:
            Tuple of (affected_card, message)
        """
        cards = self.get_all_cards()
        updated_cards, message = add_card_logic(cards, name, card_type, rarity)

        # Save back to file
        save_json(self.my_cards_path, updated_cards, pretty=True)

        # Find and return the affected card
        idx = find_card_index(updated_cards, name, card_type, rarity)
        if idx == -1:
            raise ValueError(f"Card not found after add operation")

        return updated_cards[idx], message

    def delete_card(self, index: int) -> None:
        """
        Remove a card by index.

        Args:
            index: Index of the card to remove

        Raises:
            ValueError: If index is out of bounds
        """
        cards = self.get_all_cards()

        if not (0 <= index < len(cards)):
            raise ValueError(f"Invalid card index: {index}")

        del cards[index]
        save_json(self.my_cards_path, cards, pretty=True)

    def update_card_lb(self, index: int, new_lb: int) -> UserCard:
        """
        Update a card's limit break level.

        Args:
            index: Index of the card to update
            new_lb: New LB level (0-4)

        Returns:
            The updated card

        Raises:
            ValueError: If index is out of bounds or LB level is invalid
        """
        if not (0 <= new_lb <= 4):
            raise ValueError(f"Invalid LB level: {new_lb}. Must be 0-4.")

        cards = self.get_all_cards()

        if not (0 <= index < len(cards)):
            raise ValueError(f"Invalid card index: {index}")

        cards[index]["lb"] = new_lb
        save_json(self.my_cards_path, cards, pretty=True)

        return cards[index]

    def get_card_count(self) -> int:
        """Get total number of cards in collection."""
        return len(self.get_all_cards())
