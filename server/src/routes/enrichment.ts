// SPDX-License-Identifier: MIT
// Port of py/api/routes/enrichment.py
// Routes: GET /api/v1/enrich/status, POST /api/v1/enrich

import { Hono } from 'hono';
import type { EnrichService } from '../services/enrichService.js';
import type { CardService } from '../services/cardService.js';

export function createEnrichmentRouter(
  enrichService: EnrichService,
  cardService: CardService,
): Hono {
  const router = new Hono();

  router.get('/status', async (c) => {
    const [needs, enrichedCount, totalCount] = await Promise.all([
      enrichService.needsEnrichment(),
      enrichService.getEnrichedCount(),
      cardService.getAll().then((cards) => cards.length),
    ]);
    return c.json({
      needs_enrichment: needs,
      enriched_count: enrichedCount,
      total_count: totalCount,
    });
  });

  router.post('/', async (c) => {
    const force = c.req.query('force') === 'true';
    const cards = await enrichService.enrich(force);
    return c.json({ message: `Enriched ${cards.length} cards`, count: cards.length });
  });

  return router;
}
