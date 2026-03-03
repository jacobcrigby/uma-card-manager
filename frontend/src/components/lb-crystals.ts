import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lb-crystals')
export class LbCrystals extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      gap: 0.25rem;
      align-items: center;
    }

    .crystal {
      width: 16px;
      height: 16px;
      position: relative;
      transform: rotate(45deg);
    }

    .crystal-inner {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
      border: 1.5px solid #1976d2;
      border-radius: 2px;
      position: relative;
      box-shadow: inset 0 0 3px rgba(255, 255, 255, 0.5);
    }

    .crystal.filled .crystal-inner {
      background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
      border-color: #0d47a1;
      box-shadow:
        inset 0 0 4px rgba(255, 255, 255, 0.6),
        0 0 4px rgba(25, 118, 210, 0.4);
    }

    .crystal.empty .crystal-inner {
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
      border-color: #bdbdbd;
      box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.3);
    }

    .crystal-shine {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 1px;
    }

    .crystal.filled .crystal-shine {
      background: rgba(255, 255, 255, 0.9);
    }

    .crystal.empty .crystal-shine {
      background: rgba(255, 255, 255, 0.4);
    }

    .label {
      margin-left: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #666;
      transform: translateY(0);
    }

    :host([show-mlb]) .crystal:nth-child(4).filled ~ .label {
      color: #1976d2;
    }
  `;

  @property({ type: Number }) lb = 0;
  @property({ type: Boolean, attribute: 'show-label' }) showLabel = false;

  private getLabel(): string {
    if (this.lb === 4) return 'MLB';
    return `LB${this.lb}`;
  }

  render() {
    return html`
      ${[0, 1, 2, 3].map(
        (index) => html`
          <div class="crystal ${index < this.lb ? 'filled' : 'empty'}">
            <div class="crystal-inner">
              <div class="crystal-shine"></div>
            </div>
          </div>
        `
      )}
      ${this.showLabel ? html`<span class="label">${this.getLabel()}</span>` : ''}
    `;
  }
}
