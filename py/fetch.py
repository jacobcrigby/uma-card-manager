"""Fetch updated tierlist data from the internet."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

URL = "https://uma.moe/assets/data/precomputed-tierlist.json"


def add_subparser(subparsers: Any) -> None:
	"""Add the 'update' subcommand to the argument parser."""
	default_base = Path(__file__).resolve().parent.parent
	parser = subparsers.add_parser(
		"update",
		help="Update local precomputed tierlist data from the internet",
		description=(
			"Download the latest precomputed tierlist JSON from "
			f"{URL} and save it locally, then re-enrich your cards."
		),
	)
	parser.add_argument(
		"--output",
		"-o",
		type=Path,
		default=default_base / "precomputed-tierlist.json",
		help="Output path for the downloaded tierlist JSON (default: precomputed-tierlist.json)",
	)
	parser.add_argument(
		"--stdout",
		action="store_true",
		help="Print the fetched JSON to stdout instead of saving to a file",
	)
	parser.set_defaults(func=run)


def run(args: argparse.Namespace) -> int:
	"""Execute the fetch command."""
	# Fetch content from the URL using urllib to avoid external dependencies
	try:
		import urllib.request
		with urllib.request.urlopen(URL) as resp:  # nosec B310
			text = resp.read().decode("utf-8")
	except Exception as e:
		print(f"error: failed to fetch data: {e}", file=sys.stderr)
		return 1
	
	# Parse JSON to ensure it is valid
	try:
		parsed: Any = json.loads(text)
	except json.JSONDecodeError as e:
		print(f"error: fetched content is not valid JSON: {e}", file=sys.stderr)
		return 1
	
	if args.stdout:
		json.dump(parsed, sys.stdout, indent=2, ensure_ascii=False)
		print()
		return 0
	
	# Save to file
	try:
		with open(args.output, "w", encoding="utf-8") as f:
			json.dump(parsed, f, indent=2, ensure_ascii=False)
			f.write("\n")
			print(f"Saved updated tierlist to {args.output}")

		# After fetching, re-enrich the local card list using the new tierlist
		try:
			import enrich  # local module
			from types import SimpleNamespace
			base = Path(__file__).resolve().parent.parent
			enrich_args = SimpleNamespace(
				input=base / "my_cards.json",
				tierlist=args.output,
				output=base / "my_cards_enriched.json",
				stdout=False,
				pretty=True,
			)
			print("Re-enriching cards with the updated tierlist...")
			enrich.run(enrich_args)  # type: ignore[arg-type]
			print("Update complete: cards re-enriched.")
		except Exception as e:
			print(f"warning: failed to re-enrich cards: {e}", file=sys.stderr)
		return 0
	except OSError as e:
		print(f"error: could not write file {args.output}: {e}", file=sys.stderr)
		return 1
