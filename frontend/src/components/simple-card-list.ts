import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { CardResponse } from '../services/types';
import { formatType, formatRarity } from '../utils/formatters';
import './lb-crystals';

@customElement('simple-card-list')
export class SimpleCardList extends LitElement {
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

    .list-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #2196f3;
    }

    .list-header h3 {
      margin: 0;
      color: #333;
      font-size: 1.3rem;
    }

    .count-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .card-table {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f5f5f5;
      padding: 0.875rem 1rem;
      text-align: left;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #e0e0e0;
      font-size: 0.9rem;
    }

    td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: #fafafa;
    }

    .card-name {
      font-weight: 500;
    }

    .type-badge,
    .rarity-badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .type-badge {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .rarity-badge {
      background: #fff3e0;
      color: #e65100;
    }

    .row-number {
      color: #999;
      font-size: 0.85rem;
    }
  `;

  @property({ type: Array }) cards: CardResponse[] = [];

  render() {
    if (this.cards.length === 0) {
      return html`
        <div class="empty-state">
          <h3>No cards yet</h3>
          <p>Add your first card using the form on the left!</p>
        </div>
      `;
    }

    return html`
      <div class="list-header">
        <h3>My Cards</h3>
        <span class="count-badge">${this.cards.length} total</span>
      </div>

      <div class="card-table">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Card Name</th>
              <th style="width: 120px;">Type</th>
              <th style="width: 100px;">Rarity</th>
              <th style="width: 100px;">LB</th>
            </tr>
          </thead>
          <tbody>
            ${this.cards.map(
              (card, index) => html`
                <tr>
                  <td class="row-number">${index + 1}</td>
                  <td class="card-name">${card.name}</td>
                  <td><span class="type-badge">${formatType(card.type)}</span></td>
                  <td><span class="rarity-badge">${formatRarity(card.rarity)}</span></td>
                  <td><lb-crystals .lb=${card.lb} show-label></lb-crystals></td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}
