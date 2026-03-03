import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ApiClient } from '../services/api';

@customElement('card-form')
export class CardForm extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1.5rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
      font-size: 1.5rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-weight: 500;
      color: #555;
    }

    input,
    select {
      padding: 0.75rem;
      font-size: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: #4caf50;
    }

    button {
      padding: 0.875rem;
      font-size: 1rem;
      font-weight: 600;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 0.5rem;
    }

    button:hover:not(:disabled) {
      background: #45a049;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .success-message {
      padding: 0.75rem;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .error-message {
      padding: 0.75rem;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
      font-size: 0.9rem;
    }
  `;

  @state() private name = '';
  @state() private type = 0;
  @state() private rarity = 3;
  @state() private submitting = false;
  @state() private message = '';
  @state() private isError = false;

  private api = new ApiClient();

  private async handleSubmit(e: Event) {
    e.preventDefault();

    if (!this.name.trim()) {
      this.isError = true;
      this.message = 'Please enter a card name';
      return;
    }

    this.submitting = true;
    this.message = '';

    try {
      const result = await this.api.addCard({
        name: this.name,
        type: this.type,
        rarity: this.rarity,
      });

      this.isError = false;
      this.message = result.message;

      // Emit event for parent to refresh
      this.dispatchEvent(new CustomEvent('card-added', { bubbles: true, composed: true }));

      // Reset form
      this.name = '';

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.message = '';
      }, 3000);
    } catch (e) {
      this.isError = true;
      this.message = e instanceof Error ? e.message : 'Failed to add card';
    } finally {
      this.submitting = false;
    }
  }

  render() {
    return html`
      <h2>Add Card</h2>
      <form @submit=${this.handleSubmit}>
        <label>
          <span>Card Name</span>
          <input
            type="text"
            placeholder="e.g., Kitasan Black"
            .value=${this.name}
            @input=${(e: Event) => (this.name = (e.target as HTMLInputElement).value)}
            ?disabled=${this.submitting}
          />
        </label>

        <label>
          <span>Type</span>
          <select
            .value=${String(this.type)}
            @change=${(e: Event) => (this.type = Number((e.target as HTMLSelectElement).value))}
            ?disabled=${this.submitting}
          >
            <option value="0">Speed</option>
            <option value="1">Stamina</option>
            <option value="2">Power</option>
            <option value="3">Guts</option>
            <option value="4">Wit</option>
            <option value="5">Friend</option>
          </select>
        </label>

        <label>
          <span>Rarity</span>
          <select
            .value=${String(this.rarity)}
            @change=${(e: Event) =>
              (this.rarity = Number((e.target as HTMLSelectElement).value))}
            ?disabled=${this.submitting}
          >
            <option value="1">R</option>
            <option value="2">SR</option>
            <option value="3">SSR</option>
          </select>
        </label>

        <button type="submit" ?disabled=${this.submitting}>
          ${this.submitting ? 'Adding...' : 'Add Card'}
        </button>

        ${this.message
          ? html`
              <div class="${this.isError ? 'error-message' : 'success-message'}">
                ${this.message}
              </div>
            `
          : ''}
      </form>
    `;
  }
}
