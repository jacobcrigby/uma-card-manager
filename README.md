# Uma Musume Card Management Tool

A vibe coded Python-based CLI tool for managing and analyzing your Uma Musume support card collection. This tool helps you enrich your local card data with tierlist information, visualize your collection in Markdown, and get deck recommendations.

## Features

- **Enrichment**: Automatically match your cards against a comprehensive tierlist to add scores and tiers.
- **Visualization**: Generate a clean Markdown report of your collection, grouped by type and sorted by score.
- **Recommendations**: Get suggestions for the best cards to use in your decks, including support for specific card types.
- **Collection Management**: Easily add new cards or update limit break (LB) levels via the CLI.
- **Data Updates**: Pull the latest precomputed tierlist data directly from the web.

## Project Structure

- `my_cards.json`: Your local card collection.
- `precomputed-tierlist.json`: The reference tierlist data.
- `py/`: Python source code.
  - `main.py`: CLI entry point.
  - `util.py`: Shared types and utility functions.
  - `enrich.py`: Logic for data enrichment.
  - `visualize.py`: Markdown report generation.
  - `recommend.py`: Deck recommendation engine.
  - `add.py`: Collection management logic.
  - `fetch.py`: Data update logic.

## Installation

This project uses `uv` for dependency management.

```bash
# Clone the repository (if applicable)
# cd into the project directory

# Run the tool using uv
uv run py/main.py --help
```

## Usage

The tool is organized into several subcommands:

### 1. Update Tierlist Data

Fetch the latest tierlist data from the internet:

```bash
uv run py/main.py update
```

### 2. Add or Update Cards

Add a new card or increase the LB level of an existing one:

```bash
# Usage: add <name> <type> <rarity>
uv run py/main.py add "Kitasan Black" spd SSR
```

*Types: spd, sta, pow, gut, wit, fri*
*Rarities: R, SR, SSR*

### 3. Enrich Your Collection

Match your cards with the tierlist data to calculate scores. This process is automatically skipped if your input files haven't changed since the last enrichment.

```bash
uv run py/main.py enrich
```

Use `--force` or `-f` to force re-enrichment:

```bash
uv run py/main.py enrich --force
```

### 4. Visualize Collection

Generate a Markdown report (`my_cards.md`):

```bash
uv run py/main.py visualize
```

### 5. Get Recommendations

Get recommendations for a 6-card deck:

```bash
uv run py/main.py recommend
```

## Data Formats

### my_cards.json

```json
[
  {
    "name": "Kitasan Black",
    "type": 0,
    "rarity": 3,
    "lb": 4
  }
]
```

The included `my_cards.json` works as an example.

## Credits

The precomputed tierlist data used by this tool is sourced from [uma.moe](https://uma.moe).

## License

MIT
