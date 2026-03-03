# Uma Musume Card Manager

A vibe coded tool for managing your Uma Musume support card collection. Enriches your cards with tierlist scores, visualizes your collection, and recommends decks — available as both a web app and a CLI.

## Features

- **Collection view**: Browse your cards enriched with tierlist scores and tiers, grouped by type
- **Deck recommendations**: Get suggestions for the best 6-card deck, with options for type distribution and borrowing
- **Collection management**: Add new cards or update limit break (LB) levels via the web UI or CLI
- **Auto-refresh**: The web app polls for file changes so the UI stays in sync when you use the CLI
- **Data updates**: Pull the latest precomputed tierlist from uma.moe

## Web App (recommended)

Start the backend and frontend separately:

```bash
# Backend (from repo root)
uv run uvicorn py.api.main:app --reload --port 8000

# Frontend (from frontend/)
npm install
npm run dev   # Dev server on localhost:5173
```

Or build the frontend for production — FastAPI will serve it automatically:

```bash
cd frontend && npm run build
# Then just run the backend; visit http://localhost:8000
uv run uvicorn py.api.main:app --port 8000
```

API docs are available at `http://localhost:8000/api/docs`.

## CLI

```bash
uv run py/main.py --help

uv run py/main.py update                        # Fetch latest tierlist from uma.moe
uv run py/main.py add "Kitasan Black" spd SSR   # Add card (types: spd/sta/pow/gut/wit/fri, rarities: R/SR/SSR)
uv run py/main.py enrich                        # Enrich cards (skipped if inputs unchanged)
uv run py/main.py enrich --force                # Force re-enrichment
uv run py/main.py visualize                     # Generate my_cards.md
uv run py/main.py recommend                     # Get 6-card deck recommendation
```

## Project Structure

```text
my_cards.json               # Your card collection
precomputed-tierlist.json   # Reference tierlist from uma.moe
my_cards_enriched.json      # Generated — cards with scores and tiers
py/
  main.py                   # CLI entry point
  enrich.py                 # Fuzzy-match cards against tierlist
  recommend.py              # Greedy deck selection engine
  visualize.py              # Markdown report generation
  add.py / fetch.py         # Collection management and data updates
  util.py                   # Shared types and JSON helpers
  api/                      # FastAPI backend
    routes/                 # cards, enrichment, metadata, recommendations
    services/               # Business logic shared with CLI
frontend/
  src/
    components/             # Lit web components
    services/api.ts         # API client
    services/types.ts       # TypeScript interfaces
```

## Installation

Requires [uv](https://github.com/astral-sh/uv) for Python and Node.js for the frontend.

```bash
# Python dependencies are managed automatically by uv
uv run py/main.py --help

# Frontend dependencies
cd frontend && npm install
```

## Credits

Precomputed tierlist data sourced from [uma.moe/tierlist](https://uma.moe/tierlist).

## License

MIT
