# SPDX-License-Identifier: MIT

"""Add new cards to the user's collection."""

import argparse
import sys
from pathlib import Path
from typing import Any, List, cast

from util import UserCard, load_json, save_json


def parse_rarity(value: str) -> int:
    """Parse rarity from string (R/SR/SSR) or int (1/2/3)."""
    value_upper = value.upper()
    if value_upper == "R":
        return 1
    elif value_upper == "SR":
        return 2
    elif value_upper == "SSR":
        return 3
    elif value in ["1", "2", "3"]:
        return int(value)
    else:
        raise argparse.ArgumentTypeError(
            f"Invalid rarity '{value}'. Use R, SR, SSR, or 1, 2, 3"
        )


def parse_type(value: str) -> int:
    """Parse card type from string (spd/sta/pow/gut/wit/fri) or int (0-5)."""
    value_lower = value.lower()
    type_map = {
        "spd": 0,
        "sta": 1,
        "pow": 2,
        "gut": 3,
        "wit": 4,
        "fri": 5,
    }

    if value_lower in type_map:
        return type_map[value_lower]
    elif value in ["0", "1", "2", "3", "4", "5"]:
        return int(value)
    else:
        raise argparse.ArgumentTypeError(
            f"Invalid type '{value}'. Use spd, sta, pow, gut, wit, fri, or 0-5"
        )


def find_card_index(
    cards: List[UserCard], name: str, card_type: int, rarity: int
) -> int:
    """Find the index of a card in the collection. Returns -1 if not found."""
    for i, card in enumerate(cards):
        if (
            card.get("name") == name
            and card.get("type") == card_type
            and card.get("rarity") == rarity
        ):
            return i
    return -1


def add_card(
    cards: List[UserCard], name: str, card_type: int, rarity: int
) -> tuple[List[UserCard], str]:
    """
    Add a card to the collection or increase its lb.
    Returns (updated_cards, message).
    """
    idx = find_card_index(cards, name, card_type, rarity)

    if idx != -1:
        # Card exists
        current_lb = cards[idx].get("lb", 0)
        if current_lb >= 4:
            return (
                cards,
                f"Card '{name}' is already at max limit break (lb=4), ignoring",
            )
        else:
            cards[idx]["lb"] = current_lb + 1
            return (
                cards,
                f"Increased lb for '{name}' from {current_lb} to {current_lb + 1}",
            )
    else:
        # Card doesn't exist, add it
        new_card: UserCard = {
            "name": name,
            "type": card_type,
            "rarity": rarity,
            "lb": 0,
        }
        cards.append(new_card)
        return cards, f"Added new card '{name}' with lb=0"


def add_subparser(subparsers: Any) -> None:
    """Add the 'add' subcommand to the argument parser."""
    parser = subparsers.add_parser(
        "add",
        help="Add a new card to your collection or increase its limit break",
        description="Add a new card to my_cards.json or increase the limit break level of an existing card.",
    )

    parser.add_argument(
        "name",
        type=str,
        help="The name of the card to add",
    )

    parser.add_argument(
        "type",
        type=parse_type,
        help="Card type: spd, sta, pow, gut, wit, fri (or 0-5)",
    )

    parser.add_argument(
        "rarity",
        type=parse_rarity,
        help="Card rarity: R, SR, SSR (or 1, 2, 3)",
    )

    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "my_cards.json",
        help="Path to the input my_cards.json file (default: my_cards.json)",
    )

    parser.set_defaults(func=run)


def run(args: argparse.Namespace) -> int:
    """Execute the add command."""
    # Load current collection
    cards_obj = load_json(args.input)
    if not isinstance(cards_obj, list):
        print(f"error: expected JSON array in {args.input}", file=sys.stderr)
        return 1

    cards = cast(List[UserCard], cards_obj)

    # Add or update the card
    updated_cards, message = add_card(cards, args.name, args.type, args.rarity)

    # Save back to file
    save_json(args.input, updated_cards, pretty=True)

    print(message)
    return 0
