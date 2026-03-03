// SPDX-License-Identifier: MIT
// Port of py/api/routes/metadata.py
// Routes: GET /api/v1/metadata/types|rarities|tiers|file-status

import { Hono } from 'hono';
import { TYPE_NAMES, TIER_ORDER } from '../types.js';
import { getFileMtime } from '../services/io.js';
import { MY_CARDS_PATH, ENRICHED_PATH } from '../config.js';

export function createMetadataRouter(): Hono {
  const router = new Hono();

  router.get('/types', (c) => c.json(TYPE_NAMES));

  router.get('/rarities', (c) => c.json({ 1: 'R', 2: 'SR', 3: 'SSR' }));

  router.get('/tiers', (c) => c.json(TIER_ORDER));

  router.get('/file-status', async (c) => {
    const [myCardsMtime, enrichedMtime] = await Promise.all([
      getFileMtime(MY_CARDS_PATH),
      getFileMtime(ENRICHED_PATH),
    ]);
    return c.json({
      my_cards_mtime: myCardsMtime,
      enriched_mtime: enrichedMtime,
      timestamp: Date.now(),
    });
  });

  return router;
}
