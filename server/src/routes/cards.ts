// SPDX-License-Identifier: MIT
// Port of py/api/routes/cards.py
// Routes: GET/POST /api/v1/cards, PATCH/DELETE /api/v1/cards/:index, GET /api/v1/cards/enriched

import { Hono } from 'hono';
import { z } from 'zod';
import type { CardService } from '../services/cardService.js';
import type { EnrichService } from '../services/enrichService.js';

const CardCreateSchema = z.object({
  name: z.string().min(1),
  type: z.number().int().min(0).max(5),
  rarity: z.number().int().min(1).max(3),
});

const CardLBUpdateSchema = z.object({
  lb: z.number().int().min(0).max(4),
});

export function createCardsRouter(
  cardService: CardService,
  enrichService: EnrichService,
): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const cards = await cardService.getAll();
    return c.json({ cards, total: cards.length });
  });

  router.get('/enriched', async (c) => {
    const cards = await enrichService.getEnrichedCards(true);
    return c.json({ cards, total: cards.length });
  });

  router.post('/', async (c) => {
    let body: z.infer<typeof CardCreateSchema>;
    try {
      body = CardCreateSchema.parse(await c.req.json());
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }
    const result = await cardService.add(body.name, body.type, body.rarity);
    return c.json({ card: result.card, message: result.message }, 201);
  });

  router.patch('/:index', async (c) => {
    const index = parseInt(c.req.param('index'), 10);
    if (isNaN(index)) return c.json({ error: 'Invalid index' }, 400);

    let body: z.infer<typeof CardLBUpdateSchema>;
    try {
      body = CardLBUpdateSchema.parse(await c.req.json());
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }

    try {
      const card = await cardService.updateLb(index, body.lb);
      return c.json({ card, message: `Updated LB to ${body.lb}` });
    } catch (err) {
      if (err instanceof RangeError) return c.json({ error: err.message }, 404);
      throw err;
    }
  });

  router.delete('/:index', async (c) => {
    const index = parseInt(c.req.param('index'), 10);
    if (isNaN(index)) return c.json({ error: 'Invalid index' }, 400);

    try {
      await cardService.delete(index);
      return new Response(null, { status: 204 });
    } catch (err) {
      if (err instanceof RangeError) return c.json({ error: err.message }, 404);
      throw err;
    }
  });

  return router;
}
