// SPDX-License-Identifier: MIT
// Port of py/add.py + py/api/services/card_service.py
// Manages the user's card collection (my_cards.json).

import type { UserCard } from '../types.js';
import { loadJson, saveJson } from './io.js';

export class CardService {
  constructor(private readonly cardsPath: string) {}

  async getAll(): Promise<UserCard[]> {
    try {
      return await loadJson<UserCard[]>(this.cardsPath);
    } catch {
      return [];
    }
  }

  async add(
    name: string,
    type: number,
    rarity: number,
  ): Promise<{ card: UserCard; message: string }> {
    const cards = await this.getAll();
    const idx = cards.findIndex(
      (c) => c.name === name && c.type === type && c.rarity === rarity,
    );

    if (idx !== -1) {
      const current = cards[idx].lb;
      if (current >= 4) {
        return { card: cards[idx], message: `'${name}' is already at max LB` };
      }
      const updated: UserCard = { ...cards[idx], lb: current + 1 };
      cards[idx] = updated;
      await saveJson(this.cardsPath, cards);
      return {
        card: updated,
        message: `Increased LB for '${name}' from ${current} to ${current + 1}`,
      };
    }

    const newCard: UserCard = { name, type, rarity, lb: 0 };
    cards.push(newCard);
    await saveJson(this.cardsPath, cards);
    return { card: newCard, message: `Added '${name}' with LB 0` };
  }

  async delete(index: number): Promise<void> {
    const cards = await this.getAll();
    if (index < 0 || index >= cards.length) {
      throw new RangeError(`Card index ${index} out of range (0-${cards.length - 1})`);
    }
    cards.splice(index, 1);
    await saveJson(this.cardsPath, cards);
  }

  async updateLb(index: number, lb: number): Promise<UserCard> {
    if (lb < 0 || lb > 4) throw new RangeError(`LB must be 0-4, got ${lb}`);
    const cards = await this.getAll();
    if (index < 0 || index >= cards.length) {
      throw new RangeError(`Card index ${index} out of range (0-${cards.length - 1})`);
    }
    const updated: UserCard = { ...cards[index], lb };
    cards[index] = updated;
    await saveJson(this.cardsPath, cards);
    return updated;
  }
}
