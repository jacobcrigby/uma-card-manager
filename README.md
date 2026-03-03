# Uma Musume Card Manager

A vibe coded tool for managing your Uma Musume support card collection. Enriches your cards with tierlist scores, visualizes your collection, and recommends decks — available as both a web app and a CLI.

## Features

- **Collection view**: Browse your cards enriched with tierlist scores and tiers, grouped by type
- **Deck recommendations**: Get suggestions for the best 6-card deck, with options for type distribution and borrowing
- **Collection management**: Add new cards or update limit break (LB) levels via the web UI or CLI
- **Auto-refresh**: The web app polls for file changes so the UI stays in sync when you use the CLI
- **Data updates**: Pull the latest precomputed tierlist from uma.moe

## Web App (Node.js — recommended)

The Node.js server serves the API and (in production) the built frontend from a single process.

```bash
# Install dependencies (once)
npm install
cd frontend && npm install && cd ..

# Development — hot-reload server on :8000, Vite on :5173
npm run dev

# Production — build everything, then serve on :8000
npm run build
npm start
```

The dev server proxies `/api` to `:8000`, so the Vite frontend at `http://localhost:5173` and the production build at `http://localhost:8000` both work identically.

### Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | HTTP port |
| `UMA_DATA_DIR` | `process.cwd()` | Path to the JSON data files — set to `%APPDATA%\UmaCardManager` for desktop packaging |
| `DATA_SOURCE` | `umamoe` | Tier list source: `umamoe` or `euophrys` (see [Data sources](#data-sources)) |

## Web App (Python — legacy)

The original FastAPI backend still works:

```bash
# Backend
uv run uvicorn py.api.main:app --reload --port 8000

# Frontend (separate terminal, from frontend/)
npm run dev
```

Or build for production — FastAPI will serve it automatically:

```bash
cd frontend && npm run build
uv run uvicorn py.api.main:app --port 8000
# Visit http://localhost:8000
```

API docs: `http://localhost:8000/api/docs`

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

## Data Sources

Tier and score data can come from two sources, selected at startup via the `DATA_SOURCE` env var.

### uma.moe (default)

Fetches `precomputed-tierlist.json` from [uma.moe/tierlist](https://uma.moe/tierlist). Each card has pre-computed scores and tiers for each limit break level. Run `uv run py/main.py update` (or `POST /api/v1/enrich/update` — TODO) to refresh.

### Euophrys (stub — not yet active)

[Euophrys/umamusume-tierlist](https://github.com/Euophrys/umamusume-tierlist) extracts card data directly from the game's `master.db` SQLite database using `db-convert.py`, producing detailed per-card stat breakdowns (33 fields) rather than pre-computed scores. Event bonuses are extracted separately by `event_extract.py`.

Set `DATA_SOURCE=euophrys` to activate. When the game database is available, the adapter will read from `master.db` using `better-sqlite3`. See [server/src/datasource/euophrys.ts](server/src/datasource/euophrys.ts) for implementation notes on the two approaches (porting the scoring algorithm vs. passing raw stats through).

## Project Structure

```text
my_cards.json               # Your card collection
precomputed-tierlist.json   # Reference tierlist from uma.moe
my_cards_enriched.json      # Generated — cards with scores and tiers
package.json                # Workspace root (coordinates server + frontend)
server/                     # Node.js/TypeScript backend (Hono)
  src/
    index.ts                # Entry point
    config.ts               # Paths and env var config
    types.ts                # Shared TypeScript types
    datasource/             # TierlistDataSource abstraction
      interface.ts          # Interface definition
      umamoe.ts             # uma.moe adapter
      euophrys.ts           # Euophrys/game-DB adapter (stub)
    services/
      cardService.ts        # Collection CRUD
      enrichService.ts      # Enrichment with hash-based caching
      recommendService.ts   # Greedy deck builder
      io.ts                 # JSON file I/O helpers
    routes/                 # Hono route handlers
      cards.ts              # GET/POST /api/v1/cards, PATCH/DELETE /api/v1/cards/:index
      enrichment.ts         # GET/POST /api/v1/enrich
      metadata.ts           # GET /api/v1/metadata/*
      recommendations.ts    # POST /api/v1/recommendations
frontend/
  src/
    components/             # Lit web components
    services/api.ts         # API client
    services/types.ts       # TypeScript interfaces
py/                         # Python CLI (unchanged)
  main.py                   # CLI entry point
  enrich.py                 # Fuzzy-match cards against tierlist
  recommend.py              # Greedy deck selection engine
  visualize.py              # Markdown report generation
  add.py / fetch.py         # Collection management and data updates
  util.py                   # Shared types and JSON helpers
  api/                      # FastAPI backend (legacy)
```

## Installation

```bash
# Node.js server + frontend
npm install              # installs concurrently at root
cd server && npm install
cd frontend && npm install

# Python CLI (requires uv)
uv run py/main.py --help
```

## Credits

Precomputed tierlist data sourced from [uma.moe/tierlist](https://uma.moe/tierlist).
Alternative detailed card data available from [Euophrys/umamusume-tierlist](https://github.com/Euophrys/umamusume-tierlist).

## License

MIT
