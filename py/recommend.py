# SPDX-License-Identifier: MIT

"""Recommend the best cards to use based on type distribution.

This module builds a deck recommendation by:
1. Finding the absolute best card from the precomputed tierlist
2. Selecting the best cards from your collection for each type
3. Combining them into a 6-card deck
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, cast

from util import EnrichedCard, TYPE_NAMES, load_enriched_cards, load_json

TIER_ORDER = ["S+", "S", "A+", "A", "B+", "B", "C+", "C", "D+", "D", "E+", "E", "F"]
TIER_VALUE = {t: len(TIER_ORDER) - i for i, t in enumerate(TIER_ORDER)}


def get_tier_value(tier: str | None) -> int:
	"""Convert a tier string (S+, S, etc.) to a numeric value for comparison."""
	if not tier:
		return 0
	return TIER_VALUE.get(tier, 0)


def get_best_cards_by_type_from_tierlist(
	tierlist_path: Path, 
	my_cards: List[EnrichedCard]
) -> Dict[int, tuple[int, str, int, int, str]]:
	"""Find the best card for each type in the tierlist that the user doesn't have at MLB.
	
	Returns: Mapping of type -> (card_id, card_name, card_type, max_score, max_tier)
	"""
	data = load_json(tierlist_path)
	
	if not isinstance(data, dict) or "cards" not in data:
		raise ValueError("Invalid tierlist format")
	
	cards_data = data["cards"]  # type: ignore[index]
	if not isinstance(cards_data, dict):
		raise ValueError("Invalid tierlist cards format")
	cards = cast(Dict[str, Any], cards_data)
	
	# Create a set of IDs that the user already has at MLB (lb=4)
	mlb_ids = {c.get("id") for c in my_cards if c.get("lb") == 4 and c.get("id") is not None}
	
	best_by_type: Dict[int, tuple[int, str, int, int, str]] = {}
	
	for card_id, card_info in cards.items():
		if not isinstance(card_info, dict):
			continue
		
		card_dict = cast(Dict[str, Any], card_info)
		
		# Get card ID
		card_id_int = card_dict.get("id")
		if not isinstance(card_id_int, int):
			card_id_int = int(card_id) if card_id.isdigit() else 0
		
		# Skip if user already has this card at MLB
		if card_id_int in mlb_ids:
			continue
			
		scores_obj = card_dict.get("scores", [])
		tiers_obj = card_dict.get("tiers", [])
		if not isinstance(scores_obj, list) or not isinstance(tiers_obj, list):
			continue
		scores = cast(List[int], scores_obj)
		tiers = cast(List[str], tiers_obj)
		if not scores or not tiers:
			continue
		
		max_score = max(scores)
		max_tier = tiers[-1]  # Assuming last tier is for MLB
		card_type = card_dict.get("type", -1)
		if not isinstance(card_type, int) or card_type == -1:
			continue
			
		# Compare by tier first, then score
		current_best = best_by_type.get(card_type)
		if not current_best or get_tier_value(max_tier) > get_tier_value(current_best[4]) or (get_tier_value(max_tier) == get_tier_value(current_best[4]) and max_score > current_best[3]):
			card_name = card_dict.get("name", "Unknown")
			if not isinstance(card_name, str):
				card_name = "Unknown"
			best_by_type[card_type] = (card_id_int, card_name, card_type, max_score, max_tier)
	
	return best_by_type


def find_best_card_in_tierlist(tierlist_path: Path, my_cards: List[EnrichedCard]) -> tuple[int, str, int, int, str]:
	"""Find the absolute best card in the entire tierlist that the user doesn't have at MLB."""
	best_by_type = get_best_cards_by_type_from_tierlist(tierlist_path, my_cards)
	if not best_by_type:
		raise ValueError("No valid cards found in tierlist")
	
	# Return the one with the highest tier, then score
	return max(best_by_type.values(), key=lambda x: (get_tier_value(x[4]), x[3]))


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
	my_cards = load_enriched_cards(args.input)
	
	# Find the best support card from tierlist if requested
	support_card = None
	exclude_id = None
	selected: List[EnrichedCard] = []
	
	if not args.no_support and total_cards < 6:
		try:
			# Try borrowing the best card of each type and see which one is best for the deck
			potential_borrows = get_best_cards_by_type_from_tierlist(args.tierlist, my_cards)
			
			best_overall_tier_val = -1
			best_overall_score = -1
			best_support = None
			best_selected_for_support: List[EnrichedCard] = []
			
			for borrow_candidate in potential_borrows.values():
				cand_id, _, cand_type, cand_score, cand_tier = borrow_candidate
				
				# Adjust type counts for simulation: the borrow card fills one slot of its type
				sim_type_counts = type_counts.copy()
				if sim_type_counts.get(cand_type, 0) > 0:
					sim_type_counts[cand_type] -= 1
				
				# Simulate deck with this borrow_candidate
				current_selected = select_best_cards_by_type(my_cards, sim_type_counts, cand_id)
				
				# Fill remaining slots to reach 6 total (including borrow)
				current_total = len(current_selected) + 1
				if current_total < 6:
					sel_ids = {c.get("id") for c in current_selected}
					sel_ids.add(cand_id)
					rem = [c for c in my_cards if c.get("id") not in sel_ids and c.get("score") is not None]
					rem.sort(key=lambda c: c.get("score", 0), reverse=True)
					current_selected.extend(rem[:6 - current_total])
				
				# Calculate total score and average tier
				total_score = cand_score + sum(c.get("score", 0) for c in current_selected)
				total_tier_val = get_tier_value(cand_tier) + sum(get_tier_value(cast(str, c.get("tier"))) for c in current_selected)
				
				# Compare by total tier value first, then total score
				if total_tier_val > best_overall_tier_val or (total_tier_val == best_overall_tier_val and total_score > best_overall_score):
					best_overall_tier_val = total_tier_val
					best_overall_score = total_score
					best_support = borrow_candidate
					best_selected_for_support = current_selected
			
			if best_support:
				support_card = (best_support[0], best_support[1], best_support[2], best_support[3])
				exclude_id = best_support[0]
				selected = best_selected_for_support
				print(f"Found best support card to borrow: {best_support[1]} ({TYPE_NAMES.get(best_support[2])}) (Tier: {best_support[4]}, Score: {best_support[3]})\n")
		except Exception as e:
			print(f"warning: could not find support card: {e}", file=sys.stderr)
	
	# If no support card was found or requested, select cards normally
	if not support_card:
		selected = select_best_cards_by_type(my_cards, type_counts, exclude_id)
		
		# If we have fewer than 6 cards total, fill with best remaining
		current_total = len(selected)
		if current_total < 6:
			# Get all cards not already selected
			selected_ids = {card.get("id") for card in selected}
			
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
		_, best_name, best_type, best_score = support_card
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
	my_cards = load_enriched_cards(args.input)
	
	# Find the best support card from tierlist if requested
	support_card = None
	exclude_id = None
	
	if not args.no_support:
		try:
			best_id, best_name, best_type, best_score, best_tier = find_best_card_in_tierlist(args.tierlist, my_cards)
			support_card = (best_id, best_name, best_type, best_score)
			exclude_id = best_id
			print(f"Found best support card to borrow: {best_name} ({TYPE_NAMES.get(best_type)}) (Tier: {best_tier}, Score: {best_score})\n")
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
		_, best_name, best_type, best_score = support_card
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
