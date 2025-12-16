#!/usr/bin/env python3

"""Recommend the best cards to use based on type distribution.

This module builds a deck recommendation by:
1. Finding the absolute best card from the precomputed tierlist
2. Selecting the best cards from your collection for each type
3. Combining them into a 6-card deck
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, TypedDict, cast


class EnrichedCard(TypedDict, total=False):
	"""Structure of a card in my_cards_enriched.json."""

	name: str
	type: int
	rarity: int
	lb: int
	id: int
	score: int
	tier: str


class TierlistCard(TypedDict, total=False):
	"""Structure of a card in precomputed-tierlist.json."""

	id: int
	name: str
	type: int
	rarity: int
	scores: List[int]
	tiers: List[str]


TYPE_NAMES = {
	0: "Speed",
	1: "Stamina",
	2: "Power",
	3: "Guts",
	4: "Wit",
	5: "Friend",
}


def load_json(path: Path) -> object:
	"""Load JSON from a file."""
	try:
		with path.open("r", encoding="utf-8") as f:
			return json.load(f)
	except FileNotFoundError:
		print(f"error: file not found: {path}", file=sys.stderr)
		raise
	except json.JSONDecodeError as e:
		print(f"error: failed to parse JSON from {path}: {e}", file=sys.stderr)
		raise


def find_best_card_in_tierlist(tierlist_path: Path) -> tuple[int, str, int, int]:
	"""Find the absolute best card in the entire tierlist.
	
	Returns: (card_id, card_name, card_type, max_score)
	"""
	data = load_json(tierlist_path)
	
	if not isinstance(data, dict) or "cards" not in data:
		raise ValueError("Invalid tierlist format")
	
	cards_data = data["cards"]  # type: ignore[index]
	if not isinstance(cards_data, dict):
		raise ValueError("Invalid tierlist cards format")
	cards = cast(Dict[str, Any], cards_data)
	best_score = 0
	best_card = None
	
	for card_id, card_info in cards.items():
		if not isinstance(card_info, dict):
			continue
		
		card_dict = cast(Dict[str, Any], card_info)
		scores_obj = card_dict.get("scores", [])
		if not isinstance(scores_obj, list):
			continue
		scores = cast(List[int], scores_obj)
		if not scores:
			continue
		
		max_score = max(scores)
		if max_score > best_score:
			best_score = max_score
			card_id_int = card_dict.get("id")
			if not isinstance(card_id_int, int):
				card_id_int = int(card_id) if card_id.isdigit() else 0
			card_name = card_dict.get("name", "Unknown")
			if not isinstance(card_name, str):
				card_name = "Unknown"
			card_type = card_dict.get("type", -1)
			if not isinstance(card_type, int):
				card_type = -1
			best_card = (card_id_int, card_name, card_type, max_score)
	
	if best_card is None:
		raise ValueError("No valid cards found in tierlist")
	
	return best_card


def select_best_cards_by_type(
	my_cards: List[EnrichedCard],
	type_counts: Dict[int, int],
	exclude_card_id: int | None = None,
) -> List[EnrichedCard]:
	"""Select the best cards from my collection for each type.
	
	Args:
		my_cards: User's enriched card collection
		type_counts: Dictionary mapping type -> count needed
		exclude_card_id: Card ID to exclude (e.g., the global best card)
	
	Returns:
		List of selected cards
	"""
	# Group cards by type and sort by score descending
	cards_by_type: Dict[int, List[EnrichedCard]] = {}
	for card in my_cards:
		card_type = card.get("type")
		card_id = card.get("id")
		
		# Skip cards without required fields or excluded cards
		if card_type is None or card_id == exclude_card_id:
			continue
		
		if card_type not in cards_by_type:
			cards_by_type[card_type] = []
		cards_by_type[card_type].append(card)
	
	# Sort each type by score descending
	for card_list in cards_by_type.values():
		card_list.sort(key=lambda c: c.get("score", 0), reverse=True)
	
	# Select the requested number of cards for each type
	selected: List[EnrichedCard] = []
	for card_type, count in type_counts.items():
		available = cards_by_type.get(card_type, [])
		selected.extend(available[:count])
	
	return selected


def format_card_display(
	card_name: str,
	card_type: int,
	score: int,
	tier: str | None = None,
	lb: int | None = None,
	rarity: int | None = None,
	is_borrowed: bool = False,
) -> str:
	"""Format a card for display."""
	type_name = TYPE_NAMES.get(card_type, f"Type {card_type}")
	
	parts = [f"{card_name} ({type_name})"]
	parts.append(f"Score: {score}")
	
	if tier:
		parts.append(f"Tier: {tier}")
	
	if lb is not None:
		lb_display = "MLB" if lb == 4 else str(lb)
		parts.append(f"LB: {lb_display}")
	
	if rarity is not None:
		rarity_display = "SSR" if rarity == 3 else ("SR" if rarity == 2 else str(rarity))
		parts.append(f"Rarity: {rarity_display}")
	
	if is_borrowed:
		parts.append("⭐ SUPPORT CARD")
	
	return " | ".join(parts)


def add_subparser(subparsers: Any) -> None:
	"""Add the 'recommend' subcommand to the argument parser."""
	default_base = Path(__file__).resolve().parent.parent

	parser = subparsers.add_parser(
		"recommend",
		help="Recommend best cards for a deck",
		description="Build a 6-card deck recommendation with the best available cards. "
		"Use positional arguments (speed stamina power guts wit [friend]) or --best for top cards.",
	)

	parser.add_argument(
		"counts",
		nargs="*",
		type=int,
		help="Card counts by type: speed stamina power guts wit [friend] (e.g., '2 1 1 1 1')",
	)

	parser.add_argument(
		"--speed",
		type=int,
		help="Number of Speed (Type 0) cards to include",
	)

	parser.add_argument(
		"--stamina",
		type=int,
		help="Number of Stamina (Type 1) cards to include",
	)

	parser.add_argument(
		"--power",
		type=int,
		help="Number of Power (Type 2) cards to include",
	)

	parser.add_argument(
		"--guts",
		type=int,
		help="Number of Guts (Type 3) cards to include",
	)

	parser.add_argument(
		"--wit",
		type=int,
		help="Number of Wit (Type 4) cards to include",
	)

	parser.add_argument(
		"--friend",
		type=int,
		help="Number of Friend (Type 5) cards to include",
	)

	parser.add_argument(
		"--best",
		action="store_true",
		help="Just show the best 6 cards available regardless of type",
	)

	parser.add_argument(
		"--input",
		"-i",
		type=Path,
		default=default_base / "my_cards_enriched.json",
		help="Path to enriched cards JSON (default: ../my_cards_enriched.json)",
	)

	parser.add_argument(
		"--tierlist",
		"-t",
		type=Path,
		default=default_base / "precomputed-tierlist.json",
		help="Path to precomputed tierlist (default: ../precomputed-tierlist.json)",
	)

	parser.add_argument(
		"--no-support",
		action="store_true",
		help="Don't include a support card (only use cards from your collection)",
	)

	parser.set_defaults(func=run)


def run(args: argparse.Namespace) -> int:
	"""Execute the recommend subcommand."""
	# Handle --best flag for just the top cards
	if args.best:
		return run_best_cards(args)
	
	# Parse type counts from positional or named arguments
	type_counts = {}
	
	# If positional arguments provided, use them (speed stamina power guts wit friend)
	if args.counts:
		if len(args.counts) > 6:
			print("error: too many positional arguments (max 6: speed stamina power guts wit friend)", file=sys.stderr)
			return 1
		
		for i, count in enumerate(args.counts):
			type_counts[i] = count
		
		# Fill remaining with 0
		for i in range(len(args.counts), 6):
			type_counts[i] = 0
	else:
		# Use named arguments
		type_counts = {
			0: args.speed if args.speed is not None else 0,
			1: args.stamina if args.stamina is not None else 0,
			2: args.power if args.power is not None else 0,
			3: args.guts if args.guts is not None else 0,
			4: args.wit if args.wit is not None else 0,
			5: args.friend if args.friend is not None else 0,
		}
	
	total_cards = sum(type_counts.values())
	
	if total_cards == 0:
		print("error: you must specify at least one card type", file=sys.stderr)
		print("examples:", file=sys.stderr)
		print("  recommend 2 1 1 1 1", file=sys.stderr)
		print("  recommend --speed 2 --stamina 1 --power 2 --wit 1", file=sys.stderr)
		print("  recommend --best", file=sys.stderr)
		return 1
	
	if total_cards > 6:
		print(f"error: total card count ({total_cards}) exceeds 6", file=sys.stderr)
		return 1
	
	# Load user's cards
	my_cards_obj = load_json(args.input)
	if not isinstance(my_cards_obj, list):
		print(f"error: expected JSON array in {args.input}", file=sys.stderr)
		return 1
	
	my_cards = cast(List[EnrichedCard], my_cards_obj)
	
	# Find the best support card from tierlist if requested
	support_card = None
	exclude_id = None
	
	if not args.no_support and total_cards < 6:
		try:
			best_id, best_name, best_type, best_score = find_best_card_in_tierlist(args.tierlist)
			support_card = (best_id, best_name, best_type, best_score)
			exclude_id = best_id
			print(f"Found best support card: {best_name} (Score: {best_score})\n")
		except Exception as e:
			print(f"warning: could not find support card: {e}", file=sys.stderr)
	
	# Select best cards from user's collection for specified types
	selected = select_best_cards_by_type(my_cards, type_counts, exclude_id)
	
	# If we have fewer than 6 cards total (including support), fill with best remaining
	current_total = len(selected) + (1 if support_card else 0)
	if current_total < 6:
		# Get all cards not already selected
		selected_ids = {card.get("id") for card in selected}
		if exclude_id is not None:
			selected_ids.add(exclude_id)
		
		remaining_cards = [
			card for card in my_cards
			if card.get("id") not in selected_ids and card.get("score") is not None
		]
		remaining_cards.sort(key=lambda c: c.get("score", 0), reverse=True)
		
		# Add best remaining cards to reach 6 total
		num_to_add = 6 - current_total
		selected.extend(remaining_cards[:num_to_add])
		
		if num_to_add > 0 and remaining_cards:
			print(f"Filled {min(num_to_add, len(remaining_cards))} remaining slot(s) with best available cards\n")
	
	# Check if we got enough cards
	if len(selected) + (1 if support_card else 0) < 6:
		print(
			f"warning: only found {len(selected) + (1 if support_card else 0)} cards total, "
			f"could not fill all 6 slots",
			file=sys.stderr,
		)
	
	# Display recommendations
	print("=" * 70)
	print("RECOMMENDED DECK")
	print("=" * 70)
	print()
	
	if support_card:
		best_id, best_name, best_type, best_score = support_card
		print(format_card_display(
			best_name,
			best_type,
			best_score,
			is_borrowed=True,
		))
		print()
	
	if not selected:
		print("No cards from your collection match the criteria.")
		return 0
	
	for i, card in enumerate(selected, start=1):
		print(format_card_display(
			card.get("name", "Unknown"),
			card.get("type", -1),
			card.get("score", 0),
			card.get("tier"),
			card.get("lb"),
			card.get("rarity"),
		))
	
	print()
	print("=" * 70)
	print(f"Total cards: {len(selected) + (1 if support_card else 0)}")
	
	if support_card:
		total_score = support_card[3] + sum(c.get("score", 0) for c in selected)
	else:
		total_score = sum(c.get("score", 0) for c in selected)
	
	print(f"Combined score: {total_score}")
	print("=" * 70)
	
	return 0


def run_best_cards(args: argparse.Namespace) -> int:
	"""Show the best 6 cards available regardless of type."""
	# Load user's cards
	my_cards_obj = load_json(args.input)
	if not isinstance(my_cards_obj, list):
		print(f"error: expected JSON array in {args.input}", file=sys.stderr)
		return 1
	
	my_cards = cast(List[EnrichedCard], my_cards_obj)
	
	# Find the best support card from tierlist if requested
	support_card = None
	exclude_id = None
	
	if not args.no_support:
		try:
			best_id, best_name, best_type, best_score = find_best_card_in_tierlist(args.tierlist)
			support_card = (best_id, best_name, best_type, best_score)
			exclude_id = best_id
			print(f"Found best support card: {best_name} (Score: {best_score})\n")
		except Exception as e:
			print(f"warning: could not find support card: {e}", file=sys.stderr)
	
	# Filter out the support card if present and sort by score
	available_cards = [
		card for card in my_cards
		if card.get("id") != exclude_id and card.get("score") is not None
	]
	available_cards.sort(key=lambda c: c.get("score", 0), reverse=True)
	
	# Take top 5 (or 6 if no support)
	num_to_take = 5 if support_card else 6
	selected = available_cards[:num_to_take]
	
	# Display recommendations
	print("=" * 70)
	print("RECOMMENDED DECK (BEST CARDS)")
	print("=" * 70)
	print()
	
	if support_card:
		best_id, best_name, best_type, best_score = support_card
		print(format_card_display(
			best_name,
			best_type,
			best_score,
			is_borrowed=True,
		))
		print()
	
	if not selected:
		print("No cards available in your collection.")
		return 0
	
	for card in selected:
		print(format_card_display(
			card.get("name", "Unknown"),
			card.get("type", -1),
			card.get("score", 0),
			card.get("tier"),
			card.get("lb"),
			card.get("rarity"),
		))
	
	print()
	print("=" * 70)
	print(f"Total cards: {len(selected) + (1 if support_card else 0)}")
	
	if support_card:
		total_score = support_card[3] + sum(c.get("score", 0) for c in selected)
	else:
		total_score = sum(c.get("score", 0) for c in selected)
	
	print(f"Combined score: {total_score}")
	print("=" * 70)
	
	return 0


if __name__ == "__main__":
	# For standalone execution
	class Args:
		pass
	
	default_base = Path(__file__).resolve().parent.parent
	args = Args()
	args.speed = 1  # type: ignore[attr-defined]
	args.stamina = 1  # type: ignore[attr-defined]
	args.power = 1  # type: ignore[attr-defined]
	args.guts = 1  # type: ignore[attr-defined]
	args.wit = 1  # type: ignore[attr-defined]
	args.friend = 0  # type: ignore[attr-defined]
	args.input = default_base / "my_cards_enriched.json"  # type: ignore[attr-defined]
	args.tierlist = default_base / "precomputed-tierlist.json"  # type: ignore[attr-defined]
	args.no_support = False  # type: ignore[attr-defined]
	
	raise SystemExit(run(args))  # type: ignore[arg-type]
