# SPDX-License-Identifier: MIT

"""Generate a Markdown visualization of enriched cards grouped by type and sorted by score."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, List

from util import EnrichedCard, TYPE_NAMES, load_enriched_cards


def generate_markdown(cards: List[EnrichedCard]) -> str:
    """Generate Markdown visualization of cards grouped by type and sorted by score."""
    # Group cards by type
    cards_by_type: dict[int, List[EnrichedCard]] = {}
    for card in cards:
        card_type = card.get("type")
        if card_type is not None:
            if card_type not in cards_by_type:
                cards_by_type[card_type] = []
            cards_by_type[card_type].append(card)

    # Build markdown output
    lines: List[str] = []
    lines.append("# Uma Musume Card Collection")

    for type_id in sorted(cards_by_type.keys()):
        type_name = TYPE_NAMES.get(type_id, f"Unknown Type {type_id}")
        type_cards = cards_by_type[type_id]

        # Sort by score descending
        type_cards.sort(key=lambda c: c.get("score", 0), reverse=True)

        lines.append(f"\n## {type_name}\n")
        lines.append("| Tier | Score | Name | LB | Rarity |")
        lines.append("|------|-------|------|----:|-------:|")

        for card in type_cards:
            tier = card.get("tier", "?")
            score = card.get("score", 0)
            name = card.get("name", "Unknown")
            lb_raw = card.get("lb", 0)
            rarity_raw = card.get("rarity", 0)

            # Format LB: 4 -> "MLB", others as-is
            lb_display = "MLB" if lb_raw == 4 else str(lb_raw)

            # Format Rarity: 2 -> "SR", 3 -> "SSR"
            rarity_display = (
                "SSR"
                if rarity_raw == 3
                else ("SR" if rarity_raw == 2 else str(rarity_raw))
            )

            lines.append(
                f"| {tier} | {score} | {name} | {lb_display} | {rarity_display} |"
            )

    # Add an "All cards" section sorted by score (descending)
    # Include type in the table for this section
    all_sorted = sorted(cards, key=lambda c: c.get("score", 0), reverse=True)

    lines.append("\n## All Cards (by Score)\n")
    lines.append("| Tier | Score | Name | Type | LB | Rarity |")
    lines.append("|------|-------|------|------|----:|-------:|")

    for card in all_sorted:
        tier = card.get("tier", "?")
        score = card.get("score", 0)
        name = card.get("name", "Unknown")
        type_id = card.get("type", -1)
        type_name = TYPE_NAMES.get(type_id, f"Type {type_id}")
        lb_raw = card.get("lb", 0)
        rarity_raw = card.get("rarity", 0)

        lb_display = "MLB" if lb_raw == 4 else str(lb_raw)
        rarity_display = (
            "SSR" if rarity_raw == 3 else ("SR" if rarity_raw == 2 else str(rarity_raw))
        )

        lines.append(
            f"| {tier} | {score} | {name} | {type_name} | {lb_display} | {rarity_display} |"
        )

    return "\n".join(lines)


def add_subparser(subparsers: Any) -> None:
    """Add the 'visualize' subcommand to the argument parser."""
    default_base = Path(__file__).resolve().parent.parent

    parser = subparsers.add_parser(
        "visualize",
        help="Generate Markdown visualization of enriched cards",
        description="Generate Markdown visualization of enriched card data.",
    )

    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=default_base / "my_cards_enriched.json",
        help="Path to enriched cards JSON (default: ../my_cards_enriched.json)",
    )

    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=default_base / "my_cards_visualization.md",
        help="Output Markdown file path (default: ../my_cards_visualization.md)",
    )

    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print Markdown to stdout instead of (or in addition to) writing to file",
    )

    parser.set_defaults(func=run)


def run(args: argparse.Namespace) -> int:
    """Execute the visualize subcommand."""

    cards = load_enriched_cards(args.input)
    markdown = generate_markdown(cards)

    # Write to file unless stdout-only
    if (
        not args.stdout
        or args.output
        != Path(__file__).resolve().parent.parent / "my_cards_visualization.md"
    ):
        try:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            with args.output.open("w", encoding="utf-8") as f:
                f.write(markdown)
            print(f"Visualization written to {args.output}")
        except OSError as e:
            print(
                f"error: failed to write output file {args.output}: {e}",
                file=sys.stderr,
            )
            return 1

    # Print to stdout if requested
    if args.stdout:
        print(markdown)

    return 0
