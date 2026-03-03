import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ApiClient } from '../services/api';
import type { RecommendedCard } from '../services/types';
import { formatType, formatRarity, getTierColor, getTierTextColor } from '../utils/formatters';
import './lb-crystals';

@customElement('recommendation-panel')
export class RecommendationPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
      font-size: 1.5rem;
    }

    .form-section {
      margin-bottom: 1.5rem;
    }

    .form-section h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #555;
    }

    .type-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .type-input {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .type-input label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #666;
    }

    .type-input input {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      text-align: center;
    }

    .type-input input:focus {
      outline: none;
      border-color: #4caf50;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-primary {
      background: #4caf50;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #45a049;
    }

    .btn-secondary {
      background: #2196f3;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #1976d2;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .error {
      background: #ffebee;
      border: 1px solid #ef5350;
      color: #c62828;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .results {
      margin-top: 1.5rem;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #4caf50;
      margin-bottom: 1rem;
    }

    .results-header h3 {
      margin: 0;
      font-size: 1.3rem;
      color: #333;
    }

    .total-score {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2196f3;
    }

    .deck-grid {
      display: grid;
      gap: 0.75rem;
    }

    .deck-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem;
      background: #fafafa;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      transition: background 0.2s;
    }

    .deck-card:hover {
      background: #f5f5f5;
    }

    .deck-card.borrowed {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-color: #fb8c00;
    }

    .card-number {
      font-size: 1.1rem;
      font-weight: 600;
      color: #999;
      min-width: 24px;
      text-align: center;
    }

    .borrowed-badge {
      background: #ff9800;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .card-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .card-name {
      font-weight: 600;
      color: #333;
    }

    .card-type {
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
      background: #e8f5e9;
      color: #2e7d32;
    }

    .card-tier {
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .card-score {
      font-weight: 600;
      color: #2196f3;
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #666;
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #fff3e0;
      border-radius: 4px;
      border: 1px solid #ff9800;
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #e65100;
    }

    .checkbox-option input[type='checkbox'] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checkbox-option label {
      cursor: pointer;
      font-weight: 500;
    }
  `;

  @state() private speedCount = 0;
  @state() private staminaCount = 0;
  @state() private powerCount = 0;
  @state() private gutsCount = 0;
  @state() private witCount = 0;
  @state() private friendCount = 0;
  @state() private borrowFriend = false;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private recommendations: RecommendedCard[] = [];
  @state() private totalScore = 0;

  private api = new ApiClient();

  private async getRecommendations(bestCards: boolean = false) {
    this.loading = true;
    this.error = null;

    try {
      const typeCounts: { [key: number]: number } = bestCards
        ? {}
        : {
            0: this.speedCount,
            1: this.staminaCount,
            2: this.powerCount,
            3: this.gutsCount,
            4: this.witCount,
            5: this.friendCount,
          };

      const result = await this.api.getRecommendations({
        type_counts: typeCounts,
        no_support: false, // Always include borrowed card (required by game)
        borrow_friend: !bestCards && this.friendCount > 0 && this.borrowFriend,
      });

      this.recommendations = result.cards;
      this.totalScore = result.total_score;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to get recommendations';
      console.error('Failed to get recommendations:', e);
    } finally {
      this.loading = false;
    }
  }

  private clearForm() {
    this.speedCount = 0;
    this.staminaCount = 0;
    this.powerCount = 0;
    this.gutsCount = 0;
    this.witCount = 0;
    this.friendCount = 0;
    this.recommendations = [];
  }

  render() {
    return html`
      <h2>Deck Recommendations</h2>

      <div class="form-section">
        <h3>Card Type Distribution</h3>
        <div class="type-inputs">
          <div class="type-input">
            <label>Speed</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.speedCount)}
              @input=${(e: Event) =>
                (this.speedCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
          <div class="type-input">
            <label>Stamina</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.staminaCount)}
              @input=${(e: Event) =>
                (this.staminaCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
          <div class="type-input">
            <label>Power</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.powerCount)}
              @input=${(e: Event) =>
                (this.powerCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
          <div class="type-input">
            <label>Guts</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.gutsCount)}
              @input=${(e: Event) =>
                (this.gutsCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
          <div class="type-input">
            <label>Wit</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.witCount)}
              @input=${(e: Event) =>
                (this.witCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
          <div class="type-input">
            <label>Friend</label>
            <input
              type="number"
              min="0"
              max="6"
              .value=${String(this.friendCount)}
              @input=${(e: Event) =>
                (this.friendCount = parseInt((e.target as HTMLInputElement).value) || 0)}
              ?disabled=${this.loading}
            />
          </div>
        </div>

        <div style="margin-top: 1rem; padding: 0.75rem; background: #e3f2fd; border-radius: 4px; color: #1565c0; font-size: 0.9rem;">
          ℹ️ Your deck will include 5 cards from your collection + 1 borrowed card (required by game)
        </div>

        ${this.friendCount > 0
          ? html`
              <div class="checkbox-option">
                <input
                  type="checkbox"
                  id="borrow-friend"
                  .checked=${this.borrowFriend}
                  @change=${(e: Event) =>
                    (this.borrowFriend = (e.target as HTMLInputElement).checked)}
                  ?disabled=${this.loading}
                />
                <label for="borrow-friend">Prefer borrowing a Friend card</label>
              </div>
            `
          : ''}
      </div>

      <div class="actions">
        <button
          class="btn-primary"
          @click=${() => this.getRecommendations(false)}
          ?disabled=${this.loading}
        >
          ${this.loading ? 'Loading...' : 'Get Recommendations'}
        </button>
        <button
          class="btn-secondary"
          @click=${() => this.getRecommendations(true)}
          ?disabled=${this.loading}
        >
          Best 6 Cards
        </button>
        <button @click=${this.clearForm} ?disabled=${this.loading}>Clear</button>
      </div>

      ${this.error ? html`<div class="error">${this.error}</div>` : ''}

      ${this.recommendations.length > 0
        ? html`
            <div class="results">
              <div class="results-header">
                <h3>Recommended Deck</h3>
                <span class="total-score">Total Score: ${this.totalScore.toLocaleString()}</span>
              </div>

              <div class="deck-grid">
                ${this.recommendations.map(
                  (card, index) => html`
                    <div class="deck-card ${card.is_borrowed ? 'borrowed' : ''}">
                      <span class="card-number">${index + 1}</span>
                      ${card.is_borrowed
                        ? html`<span class="borrowed-badge">BORROWED</span>`
                        : ''}
                      <div class="card-info">
                        <span class="card-name">${card.name}</span>
                        <span class="card-type">${formatType(card.type)}</span>
                        ${card.tier
                          ? html`
                              <span
                                class="card-tier"
                                style="background-color: ${getTierColor(
                                  card.tier
                                )}; color: ${getTierTextColor(card.tier)}"
                              >
                                ${card.tier}
                              </span>
                            `
                          : ''}
                        <span class="card-score">★ ${card.score.toLocaleString()}</span>
                        ${!card.is_borrowed && card.rarity !== null && card.rarity !== undefined
                          ? html`
                              <span class="card-meta">
                                <span>${formatRarity(card.rarity!)}</span>
                                <span>•</span>
                                <lb-crystals
                                  .lb=${card.lb ?? 0}
                                  show-label
                                ></lb-crystals>
                              </span>
                            `
                          : ''}
                      </div>
                    </div>
                  `
                )}
              </div>
            </div>
          `
        : ''}
    `;
  }
}
