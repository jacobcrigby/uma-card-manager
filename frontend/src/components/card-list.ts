import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { EnrichedCard } from '../services/types';
import { formatType } from '../utils/formatters';
import './card-item';
import './card-edit-dialog';

@customElement('card-list')
export class CardList extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #666;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: #999;
    }

    .type-section {
      margin-bottom: 2.5rem;
    }

    .type-section:last-child {
      margin-bottom: 0;
    }

    .type-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #4caf50;
    }

    .type-header h3 {
      margin: 0;
      color: #333;
      font-size: 1.3rem;
    }

    .type-count {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }
  `;

  @property({ type: Array }) cards: EnrichedCard[] = [];
  @state() private editingCard: EnrichedCard | null = null;
  @state() private editingIndex: number = -1;

  private groupCardsByType(): Map<number, Array<{ card: EnrichedCard; index: number }>> {
    const grouped = new Map<number, Array<{ card: EnrichedCard; index: number }>>();

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      if (!grouped.has(card.type)) {
        grouped.set(card.type, []);
      }
      grouped.get(card.type)!.push({ card, index: i });
    }

    // Sort each group by score descending (null scores go last)
    for (const items of grouped.values()) {
      items.sort((a, b) => {
        const scoreA = a.card.score ?? -1;
        const scoreB = b.card.score ?? -1;
        return scoreB - scoreA;
      });
    }

    // Sort types by type number
    return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
  }

  private handleCardClick(card: EnrichedCard, index: number) {
    this.editingCard = card;
    this.editingIndex = index;
  }

  private handleDialogClose() {
    this.editingCard = null;
    this.editingIndex = -1;
  }

  private handleCardUpdated() {
    this.dispatchEvent(new CustomEvent('card-updated'));
  }

  render() {
    if (this.cards.length === 0) {
      return html`
        <div class="empty-state">
          <h3>No cards yet</h3>
          <p>Add your first card using the form on the left!</p>
        </div>
      `;
    }

    const groupedCards = this.groupCardsByType();

    return html`
      ${Array.from(groupedCards).map(
        ([type, items]) => html`
          <div class="type-section">
            <div class="type-header">
              <h3>${formatType(type)}</h3>
              <span class="type-count">${items.length}</span>
            </div>
            <div class="cards-grid">
              ${items.map(
                ({ card, index }) => html`
                  <card-item
                    .card=${card}
                    @click=${() => this.handleCardClick(card, index)}
                  ></card-item>
                `
              )}
            </div>
          </div>
        `
      )}
      ${this.editingCard
        ? html`
            <card-edit-dialog
              .card=${this.editingCard}
              .cardIndex=${this.editingIndex}
              @close=${this.handleDialogClose}
              @card-updated=${this.handleCardUpdated}
              @click=${this.handleDialogClose}
            ></card-edit-dialog>
          `
        : ''}
    `;
  }
}
