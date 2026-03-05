// SPDX-License-Identifier: MIT
// Centralised configuration — all paths and runtime options.
// DATA_DIR defaults to the repo root (resolved from this file's location) so data JSON
// files are found regardless of the working directory the server is started from.
// Override via UMA_DATA_DIR env var (for WebView2 packaging pointing to %APPDATA%) or
// --data-dir <path> CLI arg.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root is two levels up from server/src/ — works regardless of cwd
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const argIndex = process.argv.indexOf('--data-dir');
export const DATA_DIR: string =
  process.env.UMA_DATA_DIR ??
  (argIndex !== -1 ? process.argv[argIndex + 1] : REPO_ROOT);

export const MY_CARDS_PATH = path.join(DATA_DIR, 'my_cards.json');
export const TIERLIST_PATH = path.join(DATA_DIR, 'precomputed-tierlist.json');
export const ENRICHED_PATH = path.join(DATA_DIR, 'my_cards_enriched.json');

export const FRONTEND_DIST_PATH = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

export const PORT = parseInt(process.env.PORT ?? '8000', 10);
export const DEV_CORS_ORIGIN = 'http://localhost:5173';

// Set DATA_SOURCE=euophrys to activate the Euophrys adapter (stub — throws until implemented)
export const DATA_SOURCE: string = process.env.DATA_SOURCE ?? 'umamoe';
