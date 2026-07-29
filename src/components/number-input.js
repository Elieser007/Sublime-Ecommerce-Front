/**
 * <number-input> Web Component — Chromatic High-Contrast design system
 *
 * Reusable quantity stepper with ± buttons and numeric input.
 * Works in any context: cart, product detail, admin forms, bulk operations.
 *
 * Attributes:
 *   data-value    — current value (default: 1)
 *   data-min      — minimum allowed value (default: 1)
 *   data-max      — maximum allowed value (default: 999)
 *   data-step     — increment/decrement step (default: 1)
 *   data-name     — form field name (for form submission)
 *   data-disabled — disable all controls
 *   data-label    — accessible label text
 *
 * Events:
 *   number-input:change — fires on value change, detail: { value: number }
 *
 * Properties:
 *   .value   — get/set current value programmatically
 *
 * Usage:
 *   <number-input value="2" min="1" max="10" label="Cantidad"></number-input>
 *   <number-input data-value="1" data-min="1" data-max="99" data-name="quantity"></number-input>
 */

class NumberInput extends HTMLElement {
  #value = 1;
  #min = 1;
  #max = 999;
  #step = 1;
  #disabled = false;
  #shadow;

  static get observedAttributes() {
    return ['data-value', 'data-min', 'data-max', 'data-step', 'data-disabled'];
  }

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#min = parseInt(this.dataset.min || '1', 10);
    this.#max = parseInt(this.dataset.max || '999', 10);
    this.#step = parseInt(this.dataset.step || '1', 10);
    this.#value = parseInt(this.dataset.value || '1', 10);
    this.#disabled = this.dataset.disabled === 'true';
    this.#value = Math.max(this.#min, Math.min(this.#max, this.#value));
    this.#render();
    this.#attachEvents();
  }

  attributeChangedCallback(name, _old, newVal) {
    if (name === 'data-value' && newVal !== null) {
      this.value = parseInt(newVal, 10);
    } else if (name === 'data-min' && newVal !== null) {
      this.#min = parseInt(newVal, 10);
      this.#render();
    } else if (name === 'data-max' && newVal !== null) {
      this.#max = parseInt(newVal, 10);
      this.#render();
    } else if (name === 'data-disabled' && newVal !== null) {
      this.#disabled = newVal === 'true';
      this.#render();
    }
  }

  get value() {
    return this.#value;
  }

  set value(v) {
    const clamped = Math.max(this.#min, Math.min(this.#max, v));
    if (clamped === this.#value) return;
    this.#value = clamped;
    this.#updateDisplay();
    this.#updateButtons();
    this.dispatchEvent(new CustomEvent('number-input:change', {
      bubbles: true,
      composed: true,
      detail: { value: this.#value },
    }));
  }

  #updateDisplay() {
    const input = this.#shadow.querySelector('.qty-display');
    if (input) input.value = String(this.#value);
  }

  #updateButtons() {
    const dec = this.#shadow.querySelector('.qty-btn--dec');
    const inc = this.#shadow.querySelector('.qty-btn--inc');
    if (dec) dec.disabled = this.#disabled || this.#value <= this.#min;
    if (inc) inc.disabled = this.#disabled || this.#value >= this.#max;
  }

  #attachEvents() {
    this.#shadow.querySelector('.qty-btn--dec')?.addEventListener('click', () => {
      if (!this.#disabled) this.value = this.#value - this.#step;
    });
    this.#shadow.querySelector('.qty-btn--inc')?.addEventListener('click', () => {
      if (!this.#disabled) this.value = this.#value + this.#step;
    });
    this.#shadow.querySelector('.qty-display')?.addEventListener('keydown', (e) => {
      if (this.#disabled) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); this.value = this.#value + this.#step; }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.value = this.#value - this.#step; }
    });
  }

  #render() {
    const d = this.#disabled || this.#value <= this.#min;
    const i = this.#disabled || this.#value >= this.#max;
    this.#shadow.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --_sch: var(--surface-container-high, #2a2a2a);
          --_ov: var(--outline-variant, #3e4850);
          --_os: var(--on-surface, #e2e2e2);
          --_p: var(--primary, #82cfff);
          --_op: var(--on-primary, #00344b);
          --_bw: var(--border-width, 1px);
          --_br: var(--border-radius, 0px);
          --_fm: var(--font-mono, 'Space Mono', monospace);
        }
        .quantity-control { display: inline-flex; align-items: center; }
        .qty-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          background: var(--_sch); border: var(--_bw) solid var(--_ov); border-radius: var(--_br);
          color: var(--_os); cursor: pointer; font-size: 20px; font-family: var(--_fm);
          transition: all .15s ease; user-select: none; flex-shrink: 0;
        }
        .qty-btn:hover:not(:disabled) { background: var(--_p); border-color: var(--_p); color: var(--_op); }
        .qty-btn:active:not(:disabled) { transform: scale(.95); }
        .qty-btn:focus-visible { outline: 2px solid var(--_p); outline-offset: 2px; }
        .qty-btn:disabled { opacity: .3; cursor: not-allowed; }
        .qty-display {
          width: 52px; height: 40px; text-align: center;
          background: var(--_sch); color: var(--_os);
          border-top: var(--_bw) solid var(--_ov);
          border-bottom: var(--_bw) solid var(--_ov);
          border-left: none; border-right: none; border-radius: 0;
          font-family: var(--_fm); font-size: 15px; font-weight: 600;
          -moz-appearance: textfield; appearance: textfield;
        }
        .qty-display::-webkit-outer-spin-button,
        .qty-display::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-display:focus { outline: none; background: rgba(130, 207, 255, .08); }
        @media (max-width: 639px) {
          .qty-btn { width: 44px; height: 44px; font-size: 22px; }
          .qty-display { width: 48px; height: 44px; font-size: 16px; }
        }
      </style>
      <div class="quantity-control" part="control">
        <button class="qty-btn qty-btn--dec" type="button" aria-label="Disminuir" ${d ? 'disabled' : ''}>−</button>
        <input class="qty-display" type="number" value="${this.#value}" min="${this.#min}" max="${this.#max}" step="${this.#step}" ${this.#disabled ? 'disabled' : ''} aria-label="Cantidad" readonly />
        <button class="qty-btn qty-btn--inc" type="button" aria-label="Aumentar" ${i ? 'disabled' : ''}>+</button>
      </div>`;
  }
}

if (!customElements.get('number-input')) {
  customElements.define('number-input', NumberInput);
}
