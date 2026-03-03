// SPDX-License-Identifier: MIT
// Entry point: wires up services, routes, static file serving, and starts the HTTP server.

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  PORT,
  DEV_CORS_ORIGIN,
  FRONTEND_DIST_PATH,
  MY_CARDS_PATH,
  TIERLIST_PATH,
  ENRICHED_PATH,
  DATA_SOURCE,
} from './config.js';

import { UmaMoeDataSource } from './datasource/umamoe.js';
import { EuophrysDataSource } from './datasource/euophrys.js';
import type { TierlistDataSource } from './datasource/interface.js';

import { CardService } from './services/cardService.js';
import { EnrichService } from './services/enrichService.js';
import { RecommendService } from './services/recommendService.js';

import { createCardsRouter } from './routes/cards.js';
import { createEnrichmentRouter } from './routes/enrichment.js';
import { createMetadataRouter } from './routes/metadata.js';
import { createRecommendationsRouter } from './routes/recommendations.js';

// Select data source based on DATA_SOURCE env var
const dataSource: TierlistDataSource =
  DATA_SOURCE === 'euophrys'
    ? new EuophrysDataSource()
    : new UmaMoeDataSource(TIERLIST_PATH);

// Instantiate services
const cardService = new CardService(MY_CARDS_PATH);
const enrichService = new EnrichService(MY_CARDS_PATH, TIERLIST_PATH, ENRICHED_PATH, dataSource);
const recommendService = new RecommendService(ENRICHED_PATH, dataSource);

// Build Hono app
const app = new Hono();

// CORS for dev (Vite dev server on :5173)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', cors({ origin: DEV_CORS_ORIGIN }));
}

// Global error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// API routes under /api/v1
const api = new Hono();
api.route('/cards', createCardsRouter(cardService, enrichService));
api.route('/enrich', createEnrichmentRouter(enrichService, cardService));
api.route('/metadata', createMetadataRouter());
api.route('/recommendations', createRecommendationsRouter(recommendService));
api.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/v1', api);
// Keep /api/health as a top-level alias
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Serve built frontend in production (when frontend/dist/ exists)
if (existsSync(FRONTEND_DIST_PATH)) {
  // Relative path from process.cwd() for serveStatic
  const relativeFrontend = path.relative(process.cwd(), FRONTEND_DIST_PATH);
  app.use('/*', serveStatic({ root: relativeFrontend }));
  // SPA fallback — any unmatched route returns index.html
  app.get('*', serveStatic({ path: path.join(relativeFrontend, 'index.html') }));
}

// Start server
serve({ fetch: app.fetch, port: PORT }, (info) => {
  const source = DATA_SOURCE === 'euophrys' ? 'Euophrys (stub)' : 'uma.moe';
  console.log(`Uma card manager server running on http://localhost:${info.port}`);
  console.log(`  Data source : ${source}`);
  console.log(`  Data dir    : ${MY_CARDS_PATH.replace('/my_cards.json', '')}`);
  if (existsSync(FRONTEND_DIST_PATH)) {
    console.log(`  Frontend    : ${FRONTEND_DIST_PATH}`);
  } else {
    console.log(`  Frontend    : not built (run "npm run build -w frontend")`);
  }
});
