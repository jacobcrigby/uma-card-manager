# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Uma Musume card collection manager with two interfaces:
1. **CLI tool** (`py/main.py`) — for direct card management and data operations
2. **Web app** — FastAPI backend (`py/api/`) + Lit.js frontend (`frontend/`)

Root-level JSON files are the shared data store for both interfaces:
- `my_cards.json` — user's card collection
- `precomputed-tierlist.json` — reference tierlist from uma.moe
- `my_cards_enriched.json` — generated; cards enriched with scores and tiers

## Commands

### Python CLI (run from repo root)

```bash
uv run py/main.py --help
uv run py/main.py enrich           # Enrich cards (skipped if inputs unchanged)
uv run py/main.py enrich --force   # Force re-enrichment
uv run py/main.py visualize        # Generate my_cards.md
uv run py/main.py recommend        # Get 6-card deck recommendation
uv run py/main.py add "Card Name" spd SSR  # Add card (types: spd/sta/pow/gut/wit/fri, rarities: R/SR/SSR)
uv run py/main.py update           # Fetch latest tierlist from uma.moe
```

### FastAPI backend (run from repo root)

```bash
uv run uvicorn py.api.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/api/docs`.

### Frontend (run from `frontend/`)

```bash
npm install
npm run dev      # Dev server on localhost:5173, proxies /api to localhost:8000
npm run build    # Build to frontend/dist/ (served by FastAPI in production)
npm run format   # Prettier format
```

### Linting

```bash
uv run ruff check py/   # Lint Python
uv run ruff format py/  # Format Python
```

## Architecture

### Data flow

`my_cards.json` + `precomputed-tierlist.json` → **enrich** → `my_cards_enriched.json`

Enrichment is skipped automatically if input file hashes haven't changed (tracked in `my_cards_enriched.json`'s `metadata` field). The `EnrichedData` TypedDict in `util.py` wraps cards with a `metadata` dict containing these hashes.

### Python CLI (`py/`)

Each subcommand is a separate module that registers itself via `add_subparser()`:
- `enrich.py` — fuzzy-matches user cards against tierlist by name+type+rarity; sets `score` and `tier` per LB level
- `visualize.py` — renders enriched cards to Markdown, grouped by type and sorted by score
- `recommend.py` — greedy deck selection; can borrow one card from the tierlist if the user lacks good options
- `add.py` — adds cards to `my_cards.json` or increments LB if already present
- `fetch.py` — downloads updated `precomputed-tierlist.json` from uma.moe
- `util.py` — shared `TypedDict` types (`UserCard`, `EnrichedCard`, `TierlistCard`), JSON I/O helpers, and `TYPE_NAMES` mapping

### FastAPI backend (`py/api/`)

Thin REST wrapper around the same CLI logic. Services in `py/api/services/` call the same underlying data operations as the CLI. Routes use an index-based card addressing scheme (cards are stored as an ordered list).

- Routes: `GET/POST /api/v1/cards`, `PATCH/DELETE /api/v1/cards/{index}`, `GET /api/v1/cards/enriched`
- `POST /api/v1/enrich?force=true` — triggers enrichment
- `GET /api/v1/metadata/file-status` — returns mtimes for polling
- `POST /api/v1/recommendations` — accepts `RecommendationRequest` (type_counts, no_support, borrow_friend)

In production, FastAPI serves the built frontend from `frontend/dist/` via `StaticFiles`.

### Frontend (`frontend/`)

Lit web components (TypeScript, no framework). Entry point: `src/main.ts` registers the `<uma-app>` custom element.

Component tree:
- `uma-app` — root component; manages state (enriched cards, raw cards), tabs, and polling for file changes every 3s via `GET /api/v1/metadata/file-status`
  - `card-form` — add new cards
  - `card-list` — enriched card display with inline LB editing via `card-item` and `card-edit-dialog`
  - `simple-card-list` — raw (non-enriched) card list
  - `recommendation-panel` — deck recommendations UI

`src/services/api.ts` — `ApiClient` class, all API calls go through here.
`src/services/types.ts` — TypeScript interfaces mirroring the Pydantic models.

### Type system

Card types are integers 0–5: Speed=0, Stamina=1, Power=2, Guts=3, Wit=4, Friend=5.
Rarities are integers 1–3: R=1, SR=2, SSR=3.
LB levels are 0–4 (4 = max limit break).
Tier strings: S+, S, A, B, C, D, E, F. Score and tier may be `None` for Friend cards not in the tierlist.
