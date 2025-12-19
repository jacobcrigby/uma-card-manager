#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""Uma Musume card management tool.

This is the main entry point for various card management subcommands:
- enrich: Add tierlist data to your card collection
- visualize: Generate Markdown visualization of enriched cards

More subcommands will be added in the future.
"""

from __future__ import annotations

import argparse

import add
import fetch
import enrich
import recommend
import visualize


def main(argv: list[str] | None = None) -> int:
	"""Main entry point with subcommand dispatch."""
	parser = argparse.ArgumentParser(
		prog="uma-cards",
		description="Uma Musume card management tool",
		epilog="Use '<subcommand> --help' for more information on a specific subcommand.",
	)

	subparsers = parser.add_subparsers(
		title="subcommands",
		description="Available subcommands",
		dest="subcommand",
		required=True,
	)

	# Register subcommands
	enrich.add_subparser(subparsers)
	visualize.add_subparser(subparsers)
	recommend.add_subparser(subparsers)
	fetch.add_subparser(subparsers)
	add.add_subparser(subparsers)

	# Parse arguments and dispatch
	args = parser.parse_args(argv)

	# Call the appropriate subcommand function
	return args.func(args)


if __name__ == "__main__":
	raise SystemExit(main())
