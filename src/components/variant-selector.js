/**
 * <variant-selector> Web Component
 *
 * Reusable variant selector with Shadow DOM.
 * Renders SizeSelector (radio pills), ColorSelector (hex circles),
 * and MaterialSelector (dropdown) based on module frontend_component type.
 *
 * Used by: variant-modal, product detail page refactor.
 *
 * Attributes:
 *   modules  (required) — JSON string of available_modules array from API
 *   selected (optional) — JSON string of current selections { moduleId: valueId }
 *
 * Events dispatched (bubbles, composed):
 *   variant-change — detail: { moduleId, valueId, priceModifier }
 */

import { escapeHtml } from '../lib/escape-html';
import { formatPrice } from '../lib/format';

class VariantSelector extends HTMLElement {
  static get observedAttributes() {
    return ['modules', 'selected'];
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._modules = [];
    this._selected = {};
    this._onKeyDownBound = this._onKeyDown.bind(this);
  }

  connectedCallback() {
    this._parseAttributes();
    this._render();
    this._attachEvents();
  }

  attributeChangedCallback(name, _old, newVal) {
    if (name === 'modules' && newVal !== null) {
      this._parseAttributes();
      this._render();
      this._attachEvents();
    } else if (name === 'selected' && newVal !== null) {
      this._parseAttributes();
      this._updateSelectedVisuals();
    }
  }

  // ─── Public API ──────────────────────────────────────────

  get selected() {
    return { ...this._selected };
  }

  set selected(val) {
    this._selected = val || {};
    this._updateSelectedVisuals();
  }

  get modules() {
    return this._modules;
  }

  set modules(arr) {
    this._modules = arr || [];
    this._render();
    this._attachEvents();
  }

  // ─── Internal ────────────────────────────────────────────

  _parseAttributes() {
    try {
      this._modules = JSON.parse(this.getAttribute('modules') || '[]');
    } catch {
      this._modules = [];
    }
    try {
      this._selected = JSON.parse(this.getAttribute('selected') || '{}');
    } catch {
      this._selected = {};
    }
  }

  _sortedModules() {
    return [...this._modules].sort((a, b) => a.sort_order - b.sort_order);
  }

  _formatModifier(mod) {
    if (mod === 0) return '';
    const sign = mod > 0 ? '+' : '';
    return `${sign}₲${mod.toLocaleString('es-PY')}`;
  }

  // ─── Rendering ───────────────────────────────────────────

  _render() {
    const sorted = this._sortedModules();

    let sectionsHtml = '';
    for (const mod of sorted) {
      switch (mod.frontend_component) {
        case 'SizeSelector':
          sectionsHtml += this._renderSizeSelector(mod);
          break;
        case 'ColorSelector':
          sectionsHtml += this._renderColorSelector(mod);
          break;
        case 'MaterialSelector':
          sectionsHtml += this._renderMaterialSelector(mod);
          break;
        default:
          break;
      }
    }

    this._shadow.innerHTML = `
      <style>
        :host {
          display: block;
          --_surface-container: var(--surface-container, #1a1a1a);
          --_surface-container-high: var(--surface-container-high, #2a2a2a);
          --_on-surface: var(--on-surface, #e2e2e2);
          --_on-surface-variant: var(--on-surface-variant, #bdc8d1);
          --_primary: var(--primary, #82cfff);
          --_on-primary: var(--on-primary, #00344b);
          --_primary-container: var(--primary-container, rgba(130,207,255,0.12));
          --_outline: var(--outline, #87929b);
          --_outline-variant: var(--outline-variant, #3e4850);
          --_tertiary: var(--tertiary, #d5ca00);
          --_border-width: var(--border-width, 1px);
          --_border-radius: var(--border-radius, 0px);
          --_space-xs: var(--space-xs, 4px);
          --_space-sm: var(--space-sm, 8px);
          --_space-md: var(--space-md, 16px);
          --_space-lg: var(--space-lg, 24px);
          --_font-body: var(--font-body, 'Hanken Grotesk', sans-serif);
          --_font-mono: var(--font-mono, 'Space Mono', monospace);
        }

        .variant-selector {
          display: flex;
          flex-direction: column;
          gap: var(--_space-lg);
          font-family: var(--_font-body);
        }

        /* ── Size Selector ──────────────────────────────── */

        .size-selector {
          display: flex;
          flex-direction: column;
          gap: var(--_space-sm);
        }

        .size-selector__label {
          color: var(--_on-surface-variant);
          font-family: var(--_font-mono);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .size-selector__options {
          display: flex;
          flex-wrap: wrap;
          gap: var(--_space-sm);
        }

        .size-selector__btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
          padding: var(--_space-sm) var(--_space-md);
          background-color: var(--_surface-container-high);
          border: var(--_border-width) solid var(--_outline-variant);
          border-radius: var(--_border-radius);
          color: var(--_on-surface);
          cursor: pointer;
          font-family: var(--_font-body);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .size-selector__btn:hover:not(:disabled) {
          border-color: var(--_primary);
          background-color: var(--_primary-container);
        }

        .size-selector__btn:focus-visible {
          outline: 2px solid var(--_primary);
          outline-offset: 2px;
        }

        .size-selector__btn--selected {
          background-color: var(--_primary);
          border-color: var(--_primary);
          color: var(--_on-primary);
        }

        .size-selector__btn--disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .size-selector__label-text {
          line-height: 1;
        }

        .size-selector__modifier {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 2px;
        }

        /* ── Color Selector ─────────────────────────────── */

        .color-selector {
          display: flex;
          flex-direction: column;
          gap: var(--_space-sm);
        }

        .color-selector__label {
          color: var(--_on-surface-variant);
          font-family: var(--_font-mono);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .color-selector__options {
          display: flex;
          flex-wrap: wrap;
          gap: var(--_space-sm);
        }

        .color-selector__circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          width: 44px;
          padding: 4px 0;
          background: transparent;
          border: 2px solid transparent;
          border-radius: var(--_border-radius);
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .color-selector__circle:hover:not(:disabled) {
          border-color: var(--_outline);
        }

        .color-selector__circle:focus-visible {
          outline: 2px solid var(--_primary);
          outline-offset: 2px;
        }

        .color-selector__circle--selected {
          border-color: var(--_primary);
        }

        .color-selector__circle--disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .color-selector__swatch {
          display: block;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: var(--_border-width) solid var(--_outline-variant);
        }

        .color-selector__price-modifier {
          font-family: var(--_font-mono);
          font-size: 9px;
          color: var(--_tertiary);
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        /* ── Material Selector ──────────────────────────── */

        .material-selector {
          display: flex;
          flex-direction: column;
          gap: var(--_space-sm);
        }

        .material-selector__label {
          color: var(--_on-surface-variant);
          font-family: var(--_font-mono);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .material-selector__select {
          width: 100%;
          padding: var(--_space-md);
          background-color: var(--_surface-container-high);
          border: var(--_border-width) solid var(--_outline-variant);
          border-radius: var(--_border-radius);
          color: var(--_on-surface);
          font-family: var(--_font-body);
          font-size: 16px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2382cfff' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right var(--_space-md) center;
          background-size: 20px;
          padding-right: var(--_space-lg);
        }

        .material-selector__select:focus {
          outline: none;
          border-color: var(--_primary);
          box-shadow: 0 0 0 2px var(--_primary-container);
        }

        .material-selector__select:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Touch targets: 44px minimum on mobile ──────── */

        @media (max-width: 639px) {
          .size-selector__btn {
            min-width: 44px;
            min-height: 44px;
          }
          .color-selector__circle {
            width: 44px;
          }
          .material-selector__select {
            min-height: 44px;
            font-size: 16px;
          }
        }
      </style>

      <div class="variant-selector" role="group" aria-label="Selección de variantes">
        ${sectionsHtml}
      </div>
    `;

    this._updateSelectedVisuals();
  }

  _renderSizeSelector(mod) {
    const isSelected = (val) => this._selected[mod.module_id] === val.value_id;
    const disabledAttr = (val) => val.available === false ? 'disabled' : '';
    const ariaChecked = (val) => isSelected(val) ? 'true' : 'false';
    const selectedClass = (val) => isSelected(val) ? 'size-selector__btn--selected' : '';
    const disabledClass = (val) => val.available === false ? 'size-selector__btn--disabled' : '';

    const optionsHtml = mod.values.map((val) => {
      const modifier = val.price_modifier !== 0
        ? `<span class="size-selector__modifier">${escapeHtml(this._formatModifier(val.price_modifier))}</span>`
        : '';
      return `
        <button type="button"
          class="size-selector__btn ${disabledClass(val)} ${selectedClass(val)}"
          data-module-id="${escapeHtml(mod.module_id)}"
          data-value-id="${escapeHtml(val.value_id)}"
          data-price-modifier="${val.price_modifier}"
          role="radio"
          aria-checked="${ariaChecked(val)}"
          aria-disabled="${val.available === false}"
          ${disabledAttr(val)}>
          <span class="size-selector__label-text">${escapeHtml(val.label)}</span>${modifier}
        </button>`;
    }).join('');

    return `
      <div class="size-selector" role="radiogroup" aria-label="${escapeHtml(mod.name)}">
        <span class="size-selector__label">${escapeHtml(mod.name)}</span>
        <div class="size-selector__options">
          ${optionsHtml}
        </div>
      </div>`;
  }

  _renderColorSelector(mod) {
    const isSelected = (val) => this._selected[mod.module_id] === val.value_id;
    const disabledAttr = (val) => val.available === false ? 'disabled' : '';
    const ariaChecked = (val) => isSelected(val) ? 'true' : 'false';
    const selectedClass = (val) => isSelected(val) ? 'color-selector__circle--selected' : '';
    const disabledClass = (val) => val.available === false ? 'color-selector__circle--disabled' : '';

    const optionsHtml = mod.values.map((val) => {
      const hex = val.hex_color || val.raw_value;
      const modifierLabel = val.price_modifier > 0 ? ` +₲${val.price_modifier}` : '';
      const modifierInline = val.price_modifier > 0 ? ` (+₲${val.price_modifier})` : '';
      return `
        <button type="button"
          class="color-selector__circle ${disabledClass(val)} ${selectedClass(val)}"
          data-module-id="${escapeHtml(mod.module_id)}"
          data-value-id="${escapeHtml(val.value_id)}"
          data-price-modifier="${val.price_modifier}"
          role="radio"
          aria-checked="${ariaChecked(val)}"
          aria-disabled="${val.available === false}"
          ${disabledAttr(val)}
          aria-label="${escapeHtml(val.label)}${escapeHtml(modifierLabel)}"
          title="${escapeHtml(val.label)}${escapeHtml(modifierInline)}">
          <span class="color-selector__swatch" style="background-color: ${escapeHtml(hex)};"></span>
          <span class="color-selector__price-modifier">${val.price_modifier > 0 ? `+₲${val.price_modifier.toLocaleString('es-PY')}` : '\u00A0'}</span>
        </button>`;
    }).join('');

    return `
      <div class="color-selector" role="radiogroup" aria-label="${escapeHtml(mod.name)}">
        <span class="color-selector__label">${escapeHtml(mod.name)}</span>
        <div class="color-selector__options">
          ${optionsHtml}
        </div>
      </div>`;
  }

  _renderMaterialSelector(mod) {
    const isSelected = (val) => this._selected[mod.module_id] === val.value_id;

    const optionsHtml = mod.values.map((val) => {
      const modifier = val.price_modifier !== 0
        ? ` (${this._formatModifier(val.price_modifier)})`
        : '';
      const selectedAttr = isSelected(val) ? 'selected' : '';
      const disabledAttr = val.available === false ? 'disabled' : '';
      return `<option value="${escapeHtml(val.value_id)}" ${disabledAttr} ${selectedAttr} data-price-modifier="${val.price_modifier}">${escapeHtml(val.label)}${escapeHtml(modifier)}</option>`;
    }).join('');

    return `
      <div class="material-selector">
        <label class="material-selector__label" for="material-${escapeHtml(mod.module_id)}">${escapeHtml(mod.name)}</label>
        <select id="material-${escapeHtml(mod.module_id)}" class="material-selector__select" data-module-id="${escapeHtml(mod.module_id)}">
          <option value="">Seleccionar ${escapeHtml(mod.name.toLowerCase())}...</option>
          ${optionsHtml}
        </select>
      </div>`;
  }

  // ─── Events ──────────────────────────────────────────────

  _attachEvents() {
    const root = this._shadow;
    const selector = root.querySelector('.variant-selector');
    if (!selector) return;

    selector.removeEventListener('click', this._onClick);
    selector.addEventListener('click', (e) => this._onClick(e));

    selector.removeEventListener('change', this._onChange);
    selector.addEventListener('change', (e) => this._onChange(e));

    selector.removeEventListener('keydown', this._onKeyDownBound);
    selector.addEventListener('keydown', this._onKeyDownBound);
  }

  _onClick(e) {
    const target = e.target;

    // Size buttons
    const sizeBtn = target.closest('.size-selector__btn');
    if (sizeBtn && !sizeBtn.disabled) {
      this._selectSize(sizeBtn);
      return;
    }

    // Color circles
    const colorBtn = target.closest('.color-selector__circle');
    if (colorBtn && !colorBtn.disabled) {
      this._selectColor(colorBtn);
      return;
    }
  }

  _onChange(e) {
    const target = e.target;
    if (target.classList.contains('material-selector__select')) {
      this._selectMaterial(target);
    }
  }

  _onKeyDown(e) {
    const target = e.target;
    if (
      !target.classList.contains('size-selector__btn') &&
      !target.classList.contains('color-selector__circle')
    ) return;

    const group = target.closest('[role="radiogroup"]');
    if (!group) return;

    const radios = Array.from(group.querySelectorAll('[role="radio"]:not([disabled])'));
    const currentIndex = radios.indexOf(target);

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % radios.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + radios.length) % radios.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      target.click();
      return;
    } else {
      return;
    }

    e.preventDefault();
    radios[nextIndex].focus();
    radios[nextIndex].click();
  }

  // ─── Selection Logic ─────────────────────────────────────

  _selectSize(btn) {
    const moduleId = btn.dataset.moduleId;
    const valueId = btn.dataset.valueId;
    const priceModifier = parseInt(btn.dataset.priceModifier || '0', 10);

    // Deselect siblings
    const group = btn.closest('.size-selector__options');
    group.querySelectorAll('.size-selector__btn').forEach((b) => {
      b.classList.remove('size-selector__btn--selected');
      b.setAttribute('aria-checked', 'false');
    });

    btn.classList.add('size-selector__btn--selected');
    btn.setAttribute('aria-checked', 'true');

    this._selected[moduleId] = valueId;
    this._dispatchChange(moduleId, valueId, priceModifier);
  }

  _selectColor(btn) {
    const moduleId = btn.dataset.moduleId;
    const valueId = btn.dataset.valueId;
    const priceModifier = parseInt(btn.dataset.priceModifier || '0', 10);

    // Deselect siblings
    const group = btn.closest('.color-selector__options');
    group.querySelectorAll('.color-selector__circle').forEach((b) => {
      b.classList.remove('color-selector__circle--selected');
      b.setAttribute('aria-checked', 'false');
    });

    btn.classList.add('color-selector__circle--selected');
    btn.setAttribute('aria-checked', 'true');

    this._selected[moduleId] = valueId;
    this._dispatchChange(moduleId, valueId, priceModifier);
  }

  _selectMaterial(select) {
    const moduleId = select.dataset.moduleId;
    const valueId = select.value;

    if (!valueId) {
      delete this._selected[moduleId];
      this._dispatchChange(moduleId, '', 0);
      return;
    }

    const option = select.options[select.selectedIndex];
    const priceModifier = parseInt(option?.dataset.priceModifier || '0', 10);

    this._selected[moduleId] = valueId;
    this._dispatchChange(moduleId, valueId, priceModifier);
  }

  _dispatchChange(moduleId, valueId, priceModifier) {
    this.dispatchEvent(new CustomEvent('variant-change', {
      bubbles: true,
      composed: true,
      detail: { moduleId, valueId, priceModifier },
    }));
  }

  // ─── Visual Sync ─────────────────────────────────────────

  _updateSelectedVisuals() {
    const root = this._shadow;

    for (const [moduleId, valueId] of Object.entries(this._selected)) {
      // Size
      const sizeBtn = root.querySelector(
        `.size-selector__btn[data-module-id="${moduleId}"][data-value-id="${valueId}"]`
      );
      if (sizeBtn) {
        if (sizeBtn.disabled) {
          delete this._selected[moduleId];
        } else {
          sizeBtn.classList.add('size-selector__btn--selected');
          sizeBtn.setAttribute('aria-checked', 'true');
        }
        continue;
      }

      // Color
      const colorBtn = root.querySelector(
        `.color-selector__circle[data-module-id="${moduleId}"][data-value-id="${valueId}"]`
      );
      if (colorBtn) {
        if (colorBtn.disabled) {
          delete this._selected[moduleId];
        } else {
          colorBtn.classList.add('color-selector__circle--selected');
          colorBtn.setAttribute('aria-checked', 'true');
        }
        continue;
      }

      // Material
      const select = root.querySelector(
        `.material-selector__select[data-module-id="${moduleId}"]`
      );
      if (select) {
        const opt = Array.from(select.options).find((o) => o.value === valueId);
        if (opt && !opt.disabled) {
          select.value = valueId;
        } else {
          delete this._selected[moduleId];
        }
      }
    }
  }
}

customElements.define('variant-selector', VariantSelector);
