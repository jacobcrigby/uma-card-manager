# SPDX-License-Identifier: MIT

"""Enrich `my_cards.json` with data from `precomputed-tierlist.json`.

This module:
* Loads the user's card list (defaults to ../my_cards.json).
* Loads the precomputed tierlist data (defaults to ../precomputed-tierlist.json).
* Matches cards by (name, type, rarity).
* Adds `id`, `score`, and `tier` to each matching card, using `lb` as the index
  into the tierlist's `scores` and `tiers` arrays.
* Writes the enriched list to ../my_cards_enriched.json by default.
* Optionally prints the enriched JSON to stdout with --stdout.

The original my_cards.json is never modified.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, cast

from util import (
    EnrichedCard,
    EnrichedData,
    TierlistCard,
    TierlistData,
    UserCard,
    get_file_hash,
    load_json,
    save_json,
)


@dataclass(frozen=True)
class CardKey:
    """Composite key for looking up cards in the tierlist.

    Keys are built from (name, type, rarity) as requested.
    """

    name: str
    type: int
    rarity: int


def build_tierlist_index(tierlist: TierlistData) -> Dict[CardKey, TierlistCard]:
    """Build an index from (name, type, rarity) -> card info from the tierlist."""

    cards = tierlist.get("cards")
    if cards is None:
        raise ValueError("tierlist JSON missing 'cards' object")

    index: Dict[CardKey, TierlistCard] = {}

    for _card_id, card in cards.items():
        name = card.get("name")
        ctype = card.get("type")
        rarity = card.get("rarity")

        if (
            not isinstance(name, str)
            or not isinstance(ctype, int)
            or not isinstance(rarity, int)
        ):
            # Incomplete or malformed entry; skip.
            continue

        key = CardKey(name=name, type=ctype, rarity=rarity)

        if key in index:
            # Multiple entries for the same (name, type, rarity). This *shouldn't* happen,
            # but if it does, warn and keep the first one.
            print(
                "warning: duplicate tierlist entry for "
                f"(name={name!r}, type={ctype}, rarity={rarity}); ignoring later one",
                file=sys.stderr,
            )
            continue

        index[key] = card

    return index


def enrich_cards(
    cards: Iterable[UserCard],
    tier_index: Mapping[CardKey, TierlistCard],
) -> List[Dict[str, object]]:
    """Return a new list of cards enriched with id/score/tier when available."""

    enriched: List[Dict[str, object]] = []

    for card in cards:
        # Work on a shallow copy so we don't mutate the original input.
        out: Dict[str, object] = dict(card)

        name = card.get("name")
        ctype = card.get("type")
        rarity = card.get("rarity")
        lb = card.get("lb")

        lb_valid = isinstance(lb, int)

        if not (
            isinstance(name, str) and isinstance(ctype, int) and isinstance(rarity, int)
        ):
            print(
                "warning: skipping enrichment for card with invalid key fields: "
                f"name={name!r}, type={ctype!r}, rarity={rarity!r}",
                file=sys.stderr,
            )
            enriched.append(out)
            continue

        key = CardKey(name=name, type=ctype, rarity=rarity)
        tier_card = tier_index.get(key)

        if tier_card is None:
            # No tierlist entry found for this card; log and skip it entirely.
            print(
                "warning: no tierlist match for card "
                f"(name={name!r}, type={ctype}, rarity={rarity}); skipping",
                file=sys.stderr,
            )
            continue

        # Add ID from tierlist if present.
        if "id" in tier_card:
            out["id"] = tier_card["id"]

        # Only try to add score/tier if we have a sensible lb and score/tier arrays.
        if not lb_valid:
            print(
                f"warning: lb is not an integer for card {name!r}; skipping score/tier",
                file=sys.stderr,
            )
            enriched.append(out)
            continue

        scores = tier_card.get("scores")
        tiers = tier_card.get("tiers")

        if not isinstance(scores, list) or not isinstance(tiers, list):
            print(
                f"warning: missing or invalid scores/tiers for card {name!r}; "
                "skipping score/tier",
                file=sys.stderr,
            )
            enriched.append(out)
            continue

        if not (0 <= lb < len(scores)) or not (0 <= lb < len(tiers)):
            print(
                "warning: lb index out of range for card "
                f"{name!r} (lb={lb}, scores_len={len(scores)}, tiers_len={len(tiers)}); "
                "skipping score/tier",
                file=sys.stderr,
            )
            enriched.append(out)
            continue

        out["score"] = scores[lb]
        out["tier"] = tiers[lb]

        enriched.append(out)

    return enriched


def add_subparser(subparsers: Any) -> None:
    """Add the 'enrich' subcommand to the argument parser."""
    default_base = Path(__file__).resolve().parent.parent

    parser = subparsers.add_parser(
        "enrich",
        help="Enrich card data with tierlist information",
        description=(
            "Enrich my_cards.json with id/score/tier from precomputed-tierlist.json "
            "based on (name, type, rarity)."
        ),
    )

    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=default_base / "my_cards.json",
        help="Path to input my_cards.json (default: ../my_cards.json)",
    )

    parser.add_argument(
        "--tierlist",
        "-t",
        type=Path,
        default=default_base / "precomputed-tierlist.json",
        help="Path to precomputed-tierlist.json (default: ../precomputed-tierlist.json)",
    )

    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=default_base / "my_cards_enriched.json",
        help="Output path for enriched JSON (default: ../my_cards_enriched.json)",
    )

    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Also print the enriched JSON to stdout (useful for *nix pipelines)",
    )

    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Force re-enrichment even if input files haven't changed.",
    )

    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output with indentation.",
    )

    parser.set_defaults(func=run)


def run(args: argparse.Namespace) -> int:
    """Execute the enrich subcommand."""
    # Calculate hashes of input files to see if we need to re-enrich.
    current_input_hash = get_file_hash(args.input)
    current_tierlist_hash = get_file_hash(args.tierlist)

    if not args.force and args.output.exists():
        try:
            existing_data = cast(Dict[str, Any], load_json(args.output))
            if "metadata" in existing_data:
                metadata = cast(Dict[str, str], existing_data.get("metadata", {}))
                if (
                    metadata.get("input_hash") == current_input_hash
                    and metadata.get("tierlist_hash") == current_tierlist_hash
                ):
                    print(
                        "Enriched data is already up to date. Use --force to re-enrich."
                    )
                    return 0
        except Exception:
            # If anything goes wrong reading the existing file, just proceed with enrichment.
            pass

    # Load input data.
    cards_data_obj = load_json(args.input)
    if not isinstance(cards_data_obj, list):
        print(
            f"error: expected a JSON array in {args.input}, got {type(cards_data_obj).__name__}",
            file=sys.stderr,
        )
        return 1

    cards_data = cast(List[UserCard], cards_data_obj)

    tierlist_data_obj = load_json(args.tierlist)
    tierlist_data = cast(TierlistData, tierlist_data_obj)
    tier_index = build_tierlist_index(tierlist_data)

    enriched_cards = enrich_cards(cards_data, tier_index)

    # Prepare the output structure with metadata.
    output_data: EnrichedData = {
        "metadata": {
            "input_hash": current_input_hash,
            "tierlist_hash": current_tierlist_hash,
        },
        "cards": cast(List[EnrichedCard], enriched_cards),
    }

    # Write to file (never overwrite the original input unless the user explicitly
    # passes the same path for --output, which is on them).
    try:
        save_json(args.output, output_data, pretty=args.pretty)
        if not args.stdout:
            print(f"Successfully enriched cards and saved to {args.output}")
    except Exception as e:
        print(f"error: failed to write output file {args.output}: {e}", file=sys.stderr)
        return 1

    # Optionally print to stdout for *nix-style piping.
    if args.stdout:
        if args.pretty:
            json.dump(output_data, sys.stdout, ensure_ascii=False, indent=2)
        else:
            json.dump(output_data, sys.stdout, ensure_ascii=False)
        # Ensure trailing newline for nicer terminals.
        sys.stdout.write("\n")

    return 0
