# SPDX-License-Identifier: MIT

"""Shared utility functions and types for the Uma card management tool."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, TypedDict, cast


class TierlistCard(TypedDict, total=False):
    """Structure of a single card entry in the tierlist JSON."""

    id: int
    name: str
    type: int
    rarity: int
    scores: List[int]
    tiers: List[str]


class TierlistData(TypedDict, total=False):
    """Top-level structure of the precomputed tierlist JSON."""

    cards: Dict[str, TierlistCard]


class UserCard(TypedDict, total=False):
    """Structure of a card in the user's collection (my_cards.json)."""

    name: str
    type: int
    rarity: int
    lb: int


class EnrichedCard(TypedDict, total=False):
    """Structure of an enriched card (my_cards_enriched.json)."""

    name: str
    type: int
    rarity: int
    lb: int
    id: int
    score: int
    tier: str


class EnrichedData(TypedDict):
    """Structure of the enriched cards file with metadata."""

    metadata: Dict[str, str]
    cards: List[EnrichedCard]


TYPE_NAMES = {
    0: "Speed",
    1: "Stamina",
    2: "Power",
    3: "Guts",
    4: "Wit",
    5: "Friend",
}


def get_file_hash(path: Path) -> str:
    """Calculate the SHA-256 hash of a file."""
    if not path.exists():
        return ""
    sha256 = hashlib.sha256()
    try:
        with path.open("rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
    except OSError:
        return ""
    return sha256.hexdigest()


def load_json(path: Path) -> Any:
    """Load JSON from a file, raising a clear error if it fails."""
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"error: file not found: {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"error: failed to parse JSON from {path}: {e}", file=sys.stderr)
        sys.exit(1)


def load_enriched_cards(path: Path) -> List[EnrichedCard]:
    """Load and validate the enriched cards JSON, supporting both old and new formats."""
    data = load_json(path)

    if isinstance(data, dict) and "cards" in data:
        return cast(List[EnrichedCard], data["cards"])
    elif isinstance(data, list):
        return cast(List[EnrichedCard], data)
    else:
        print(
            f"error: expected a JSON array or object with 'cards' in {path}",
            file=sys.stderr,
        )
        sys.exit(1)


def save_json(path: Path, data: Any, pretty: bool = True) -> None:
    """Save data to a JSON file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            if pretty:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
            else:
                json.dump(data, f, ensure_ascii=False)
    except OSError as e:
        print(f"error: failed to write to {path}: {e}", file=sys.stderr)
        sys.exit(1)
