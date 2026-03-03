// SPDX-License-Identifier: MIT
// Port of py/api/routes/recommendations.py
// Route: POST /api/v1/recommendations

import { Hono } from 'hono';
import { z } from 'zod';
import type { RecommendService } from '../services/recommendService.js';
import { TYPE_NAMES } from '../types.js';

const RecommendationRequestSchema = z.object({
  type_counts: z.record(z.string(), z.number().int().min(0)).optional(),
  no_support: z.boolean().default(false),
  borrow_friend: z.boolean().optional().default(false),
});

export function createRecommendationsRouter(recommendService: RecommendService): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    let body: z.infer<typeof RecommendationRequestSchema>;
    try {
      body = RecommendationRequestSchema.parse(await c.req.json());
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }

    const { type_counts, no_support, borrow_friend } = body;

    let result;
    if (!type_counts || Object.values(type_counts).every((n) => n === 0)) {
      // No type distribution specified — return best 6 overall
      result = await recommendService.getBestCards(no_support);
    } else {
      // Convert string keys to numbers (JSON object keys are always strings)
      const numericTypeCounts: Record<number, number> = {};
      for (const [k, v] of Object.entries(type_counts)) {
        numericTypeCounts[parseInt(k, 10)] = v;
      }
      result = await recommendService.getRecommendedDeck(
        numericTypeCounts,
        no_support,
        borrow_friend ?? false,
      );
    }

    const cards = [
      ...(result.support
        ? [
            {
              name: result.support.name,
              type: result.support.type,
              type_name: TYPE_NAMES[result.support.type] ?? 'Unknown',
              score: result.support.score,
              tier: result.support.tier,
              lb: null,
              rarity: null,
              is_borrowed: true,
            },
          ]
        : []),
      ...result.selected.map((card) => ({
        name: card.name,
        type: card.type,
        type_name: TYPE_NAMES[card.type] ?? 'Unknown',
        score: card.score,
        tier: card.tier,
        lb: card.lb,
        rarity: card.rarity,
        is_borrowed: false,
      })),
    ];

    const totalScore = cards.reduce((s, c) => s + (c.score ?? 0), 0);

    return c.json({ cards, total_score: totalScore });
  });

  return router;
}
