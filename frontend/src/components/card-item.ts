import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { EnrichedCard } from '../services/types';
import { formatRarity, getTierColor, getTierTextColor } from '../utils/formatters';
import './lb-crystals';

@customElement('card-item')
export class CardItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      background: white;
      transition: transform 0.2s, box-shadow 0.2s;
      height: 100%;
      cursor: pointer;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .card-name {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #333;
      line-height: 1.3;
      min-height: 2.6em;
    }

    .card-tier {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }

    .card-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #666;
      margin-top: auto;
    }

    .score {
      font-weight: 600;
      color: #2196f3;
    }

    .meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  `;

  @property({ type: Object }) card!: EnrichedCard;

  render() {
    const tierBgColor = this.card.tier ? getTierColor(this.card.tier) : '#E0E0E0';
    const tierTextColor = this.card.tier ? getTierTextColor(this.card.tier) : '#666';

    return html`
      <div class="card">
        <div class="card-name">${this.card.name}</div>
        ${this.card.tier
          ? html`
              <div class="card-tier" style="background-color: ${tierBgColor}; color: ${tierTextColor}">
                ${this.card.tier}
              </div>
            `
          : ''}
        <div class="card-stats">
          <span class="score">${this.card.score !== null ? `★ ${this.card.score}` : '—'}</span>
          <span class="meta">
            <span>${formatRarity(this.card.rarity)}</span>
            <span>•</span>
            <lb-crystals .lb=${this.card.lb}></lb-crystals>
          </span>
        </div>
      </div>
    `;
  }
}
