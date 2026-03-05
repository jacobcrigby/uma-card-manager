import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { EnrichedCard } from '../services/types';
import { ApiClient } from '../services/api';
import { formatRarity, formatType } from '../utils/formatters';

@customElement('card-edit-dialog')
export class CardEditDialog extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.5);
    }

    .dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
      flex: 1;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .close-button:hover {
      background: #f0f0f0;
      color: #666;
    }

    .card-details {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      color: #666;
      font-weight: 500;
    }

    .detail-value {
      color: #333;
      font-weight: 600;
    }

    .lb-section {
      margin-bottom: 2rem;
    }

    .lb-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      color: #555;
    }

    .lb-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .diamond {
      width: 22px;
      height: 22px;
      transform: rotate(45deg);
      border: 2px solid #ccc;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      background: transparent;
    }

    .diamond.filled {
      background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
      border-color: #1976d2;
    }

    .diamond.preview {
      background: linear-gradient(135deg, #90caf9 0%, #64b5f6 100%);
      border-color: #64b5f6;
    }

    .lb-current-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #555;
      margin-left: 4px;
      min-width: 2.5rem;
    }

    .dialog-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #e0e0e0;
      color: #666;
    }

    .btn-cancel:hover {
      background: #d0d0d0;
    }

    .btn-save {
      background: #4caf50;
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: #45a049;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-indicator {
      text-align: center;
      padding: 1rem;
      color: #666;
    }

    .error {
      background: #ffebee;
      border: 1px solid #ef5350;
      color: #c62828;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
  `;

  @property({ type: Object }) card!: EnrichedCard;
  @property({ type: Number }) cardIndex!: number;
  @state() private selectedLB: number = 0;
  @state() private hoverLB: number = -1;
  @state() private saving = false;
  @state() private error: string | null = null;

  private api = new ApiClient();

  connectedCallback() {
    super.connectedCallback();
    this.selectedLB = this.card.lb;
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async save() {
    if (this.selectedLB === this.card.lb) {
      this.close();
      return;
    }

    this.saving = true;
    this.error = null;

    try {
      await this.api.updateCardLB(this.cardIndex, this.selectedLB);
      this.dispatchEvent(new CustomEvent('card-updated'));
      this.close();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to update card';
      console.error('Failed to update card:', e);
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="dialog-header">
          <h2>Edit Card</h2>
          <button class="close-button" @click=${this.close} ?disabled=${this.saving}>×</button>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="card-details">
          <div class="detail-row">
            <span class="detail-label">Card:</span>
            <span class="detail-value">${this.card.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type:</span>
            <span class="detail-value">${formatType(this.card.type)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rarity:</span>
            <span class="detail-value">${formatRarity(this.card.rarity)}</span>
          </div>
          ${this.card.tier
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Tier:</span>
                  <span class="detail-value">${this.card.tier}</span>
                </div>
              `
            : ''}
          ${this.card.score !== null
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Score:</span>
                  <span class="detail-value">${this.card.score.toLocaleString()}</span>
                </div>
              `
            : ''}
        </div>

        <div class="lb-section">
          <h3>Limit Break</h3>
          <div class="lb-selector">
            ${[1, 2, 3, 4].map((n) => {
              const active = this.hoverLB >= 0 ? n <= this.hoverLB : n <= this.selectedLB;
              const isPreview = this.hoverLB >= 0 && n <= this.hoverLB && n > this.selectedLB;
              return html`
                <div
                  class="diamond ${active && !isPreview ? 'filled' : ''} ${isPreview ? 'preview' : ''}"
                  @click=${() => (this.selectedLB = this.selectedLB === n ? 0 : n)}
                  @mouseenter=${() => (this.hoverLB = n)}
                  @mouseleave=${() => (this.hoverLB = -1)}
                ></div>
              `;
            })}
            <span class="lb-current-label">${this.selectedLB === 4 ? 'MLB' : `LB${this.selectedLB}`}</span>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn-cancel" @click=${this.close} ?disabled=${this.saving}>Cancel</button>
          <button class="btn-save" @click=${this.save} ?disabled=${this.saving}>
            ${this.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    `;
  }
}
