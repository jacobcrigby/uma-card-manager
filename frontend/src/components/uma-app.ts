import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { EnrichedCard, CardResponse } from '../services/types';
import { ApiClient } from '../services/api';
import './card-form';
import './card-list';
import './simple-card-list';
import './recommendation-panel';

@customElement('uma-app')
export class UmaApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: #fafafa;
    }

    .header {
      background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
      color: white;
      padding: 2rem 2rem 0;
    }

    .header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .header p {
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .content {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .sidebar {
      position: sticky;
      top: 2rem;
    }

    .main {
      min-height: 400px;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .error {
      background: #ffebee;
      border: 1px solid #ef5350;
      color: #c62828;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .stats {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
    }

    .stat-label {
      opacity: 0.8;
    }

    .stat-value {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .tabs {
      display: flex;
      gap: 0.25rem;
      margin-top: 1.5rem;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.8);
      border: none;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
    }

    .tab:hover {
      background: rgba(255, 255, 255, 0.25);
      color: white;
    }

    .tab.active {
      background: #fafafa;
      color: #388e3c;
      font-weight: 600;
      padding-bottom: calc(0.75rem + 2px);
      margin-bottom: -2px;
    }
  `;

  @state() private enrichedCards: EnrichedCard[] = [];
  @state() private rawCards: CardResponse[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private activeTab: 'collection' | 'simple-list' | 'recommendations' = 'collection';

  private api = new ApiClient();
  private pollInterval?: number;
  private lastMyCardsMtime = 0;
  private lastEnrichedMtime = 0;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadCards();
    this.startPolling();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
  }

  private async loadCards() {
    this.loading = true;
    this.error = null;

    try {
      // Fetch both enriched and raw cards
      const [enriched, raw] = await Promise.all([
        this.api.getEnrichedCards(),
        this.api.getCards(),
      ]);
      this.enrichedCards = enriched;
      this.rawCards = raw;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load cards';
      console.error('Failed to load cards:', e);
    } finally {
      this.loading = false;
    }
  }

  private async handleCardAdded() {
    await this.loadCards();
  }

  private startPolling() {
    // Check for file changes every 3 seconds
    this.pollInterval = window.setInterval(() => this.checkForChanges(), 3000);
  }

  private stopPolling() {
    if (this.pollInterval !== undefined) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  private async checkForChanges() {
    try {
      const status = await this.api.getFileStatus();

      // Initialize on first check
      if (this.lastMyCardsMtime === 0) {
        this.lastMyCardsMtime = status.my_cards_mtime;
        this.lastEnrichedMtime = status.enriched_mtime;
        return;
      }

      // Check if files have changed
      const myCardsChanged = status.my_cards_mtime !== this.lastMyCardsMtime;
      const enrichedChanged = status.enriched_mtime !== this.lastEnrichedMtime;

      if (myCardsChanged || enrichedChanged) {
        console.log('Files changed externally, reloading cards...');
        await this.loadCards();

        // Update tracked timestamps
        this.lastMyCardsMtime = status.my_cards_mtime;
        this.lastEnrichedMtime = status.enriched_mtime;
      }
    } catch (e) {
      // Silently fail - don't show errors for background polling
      console.debug('Polling check failed:', e);
    }
  }

  private getTotalScore(): number {
    return this.enrichedCards.reduce((sum, card) => sum + (card.score ?? 0), 0);
  }

  private getAverageScore(): number {
    if (this.enrichedCards.length === 0) return 0;
    const cardsWithScores = this.enrichedCards.filter((c) => c.score !== null);
    if (cardsWithScores.length === 0) return 0;
    const total = cardsWithScores.reduce((sum, card) => sum + (card.score ?? 0), 0);
    return Math.round(total / cardsWithScores.length);
  }

  private getCardCount(): number {
    return this.activeTab === 'simple-list' ? this.rawCards.length : this.enrichedCards.length;
  }

  render() {
    const cardCount = this.getCardCount();

    return html`
      <div class="header">
        <h1>Uma Musume Card Manager</h1>
        <p>Manage your support card collection</p>
        ${cardCount > 0
          ? html`
              <div class="stats">
                <div class="stat">
                  <span class="stat-label">Total Cards:</span>
                  <span class="stat-value">${cardCount}</span>
                </div>
                ${this.activeTab === 'collection'
                  ? html`
                      <div class="stat">
                        <span class="stat-label">Total Score:</span>
                        <span class="stat-value">${this.getTotalScore().toLocaleString()}</span>
                      </div>
                      <div class="stat">
                        <span class="stat-label">Average Score:</span>
                        <span class="stat-value">${this.getAverageScore().toLocaleString()}</span>
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
        <div class="tabs">
          <button
            class="tab ${this.activeTab === 'collection' ? 'active' : ''}"
            @click=${() => (this.activeTab = 'collection')}
          >
            Collection
          </button>
          <button
            class="tab ${this.activeTab === 'simple-list' ? 'active' : ''}"
            @click=${() => (this.activeTab = 'simple-list')}
          >
            Simple List
          </button>
          <button
            class="tab ${this.activeTab === 'recommendations' ? 'active' : ''}"
            @click=${() => (this.activeTab = 'recommendations')}
          >
            Recommendations
          </button>
        </div>
      </div>

      <div class="container">
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        ${this.activeTab === 'recommendations'
          ? html`
              <div style="max-width: 900px; margin: 0 auto;">
                <recommendation-panel></recommendation-panel>
              </div>
            `
          : html`
              <div class="content">
                <div class="sidebar">
                  <card-form @card-added=${this.handleCardAdded}></card-form>
                </div>

                <div class="main">
                  ${this.loading
                    ? html`<div class="loading">Loading cards...</div>`
                    : this.activeTab === 'collection'
                      ? html`<card-list .cards=${this.enrichedCards} @card-updated=${this.handleCardAdded}></card-list>`
                      : html`<simple-card-list .cards=${this.rawCards} .enrichedCards=${this.enrichedCards}></simple-card-list>`}
                </div>
              </div>
            `}
      </div>
    `;
  }
}
