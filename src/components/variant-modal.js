import { addToCartWithOptions, updateCartBadge } from '../lib/cart.js';
import { escapeHtml, sanitizeUrl } from '../lib/escape-html';
import { formatPrice } from '../lib/format';
import { isSelectionComplete } from '../lib/variant-logic';
import { resolveAvailable, resolveFinalPrice } from '../lib/variant-filter';
import { resolveVariantUiState } from '../lib/variant-fallback';
import { getBestVolumeBadge, getTierPrice, getTierForQuantity, formatTierLabel } from '../lib/price-utils';
import * as modalStack from '../lib/modalStack.js';

class VariantModal extends HTMLElement {
  static get observedAttributes() {
    return ['product-id', 'product-name', 'product-price', 'product-image', 'price-tiers', 'variants', 'bake-failed'];
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._triggerElement = null;
    this._productId = '';
    this._productName = '';
    this._basePrice = 0;
    this._productImage = '';
    this._priceTiers = [];
    this._quantity = 1;
    this._modules = [];
    this._dependencies = [];
    this._bakedVariants = null;
    this._selectedAttributes = {};
    this._finalPrice = 0;
    this._selectorEl = null;
    this._stackId = null;
    this._trapActive = false;

    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    this._parseAttributes();
    this._renderShell();
  }

  disconnectedCallback() {
    if (this._isOpen) {
      this._cleanup();

      document.body.style.overflow = '';

      if (this._stackId) {
        modalStack.remove(this._stackId);
        this._stackId = null;
      }
    }
  }

  attributeChangedCallback(name, _old, newVal) {
    if (newVal !== null) {
      this._parseAttributes();
      if (this._isOpen) this._renderContent();
    }
  }

  get isOpen() {
    return this._isOpen;
  }

  open(trigger) {
    if (this._isOpen) return;
    this._triggerElement = trigger || document.activeElement;
    this._isOpen = true;
    this._quantity = 1;
    this._selectedAttributes = {};
    this._parseAttributes();

    // Variant data is baked into the page at build time (SSG). The modal
    // resolves availability + price purely client-side — no runtime fetch.
    const baked = this._bakedVariants;
    this._modules = baked?.modules || [];
    this._dependencies = baked?.dependencies || [];
    if (typeof baked?.basePrice === 'number') {
      this._basePrice = baked.basePrice;
    }

    this._renderContent();
    this._recalculatePrice();
    document.body.style.overflow = 'hidden';
    this._stackId = modalStack.push(() => {
      // Stack close (ESC/back): closeTop() owns the history pop — never pop here
      this.close(true);
    });
  }

  close(fromStack = false) {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._cleanup();
    this._renderShell();

    if (this._triggerElement && typeof this._triggerElement.focus === 'function') {
      this._triggerElement.focus();
    }

    document.body.style.overflow = '';

    if (this._stackId) {
      modalStack.remove(this._stackId);
      // Manual close pops exactly its own entry (back parity, MOD-BACK-1);
      // the stack path never pops — closeTop()/the browser already did (D3)
      if (!fromStack) modalStack.popHistoryEntry();
      this._stackId = null;
    }

    this.dispatchEvent(new CustomEvent('modal-closed', {
      bubbles: true,
      composed: true,
      detail: { productId: this._productId },
    }));
  }

  _parseAttributes() {
    this._productId = this.getAttribute('product-id') || '';
    this._productName = this.getAttribute('product-name') || '';
    const parsedPrice = Number(this.getAttribute('product-price'));
    this._basePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
    this._productImage = this.getAttribute('product-image') || '/placeholder-product.svg';
    try {
      this._priceTiers = JSON.parse(this.getAttribute('price-tiers') || '[]');
    } catch {
      this._priceTiers = [];
    }
    const bakedAttr = this.getAttribute('variants');
    this._bakedVariants = null;
    if (bakedAttr) {
      try {
        const parsed = JSON.parse(bakedAttr);
        this._bakedVariants = parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        this._bakedVariants = null;
      }
    }
    // Bake-outcome signal (see src/lib/variant-fallback.ts): forwarded by
    // <product-card> from the page-provided payload flag. true = the payload
    // said modules should exist but the graph is missing/corrupt.
    this._bakeFailed = this.getAttribute('bake-failed') === 'true';
  }

  _currentVariantUi() {
    return resolveVariantUiState({}, this._modules, this._dependencies, this._bakeFailed);
  }

  _renderShell() {
    this._shadow.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="overlay" aria-hidden="true"></div>
    `;
    this._attachOverlayEvents();
  }

  _renderContent() {
    this._shadow.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="overlay" ${this._isOpen ? '' : 'aria-hidden="true"'}>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="variant-modal-title">
          <button class="close-btn" aria-label="Cerrar modal">&times;</button>
          ${this._renderModalBody()}
        </div>
      </div>
    `;

    this._attachOverlayEvents();
    this._attachModalEvents();
    this._activateFocusTrap();
  }

  _renderTierInfo() {
    const badges = this._renderVolumeBadges();
    if (!badges) return '';

    return `
      <div class="volume-badges">
        ${badges}
      </div>`;
  }

  _renderVolumeBadges() {
    const bestTier = getBestVolumeBadge(this._priceTiers);
    if (!bestTier) return '';

    const volumeTiers = this._priceTiers
      .filter((t) => t.min_quantity > 1)
      .sort((a, b) => a.min_quantity - b.min_quantity);
    const orderedTiers = [bestTier, ...volumeTiers.filter((t) => t.id !== bestTier.id)];
    const activeTier = getTierForQuantity(this._priceTiers, this._quantity);

    return orderedTiers
      .map((tier) => {
        const isActive = activeTier?.id === tier.id;
        return `
      <span class="volume-badge"${isActive ? ' data-active="true"' : ''}>
        ${escapeHtml(formatTierLabel(tier))}
      </span>`;
      })
      .join('');
  }

  _renderModalBody() {
    const hasModules = this._modules.length > 0;
    const ui = this._currentVariantUi();
    let bodyMarkup;
    if (hasModules) {
      bodyMarkup = '<variant-selector></variant-selector>';
    } else if (ui.showFallbackNotice) {
      // Bake failed at build time for a product that expects variants: show a
      // visible notice and block confirm-to-cart (no options → no cart entry).
      bodyMarkup = '<p class="variant-fallback-notice" role="status">No se pudieron cargar las variantes. Consultanos por WhatsApp.</p>';
    } else {
      bodyMarkup = '<p class="no-variants-msg">Este producto no tiene variantes disponibles.</p>';
    }
    return `
      <div class="modal-header">
        <img class="modal-image"
             src="${escapeHtml(sanitizeUrl(this._productImage))}"
             alt="${escapeHtml(this._productName)}"
             width="80" height="80" />
        <div class="modal-info">
          <h2 id="variant-modal-title" class="modal-title">
            ${escapeHtml(this._productName)}
          </h2>
          <p class="modal-price">Gs. ${escapeHtml(formatPrice(this._finalPrice ?? this._basePrice))}</p>
          ${this._renderTierInfo()}
        </div>
      </div>

      <div class="modal-body">
        ${bodyMarkup}
      </div>

      <div class="modal-footer">
        <div class="quantity-row">
          <span class="qty-label">Cantidad</span>
          <div class="qty-controls">
            <button class="qty-btn qty-minus" aria-label="Reducir cantidad">−</button>
            <span class="qty-value">${this._quantity}</span>
            <button class="qty-btn qty-plus" aria-label="Aumentar cantidad">+</button>
          </div>
        </div>
        <button class="confirm-btn"${ui.showFallbackNotice ? ' disabled' : ''}>
          Confirmar
        </button>
      </div>`;
  }

  _attachOverlayEvents() {
    const overlay = this._shadow.querySelector('.overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }
  }

  _attachModalEvents() {
    const closeBtn = this._shadow.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const minusBtn = this._shadow.querySelector('.qty-minus');
    const plusBtn = this._shadow.querySelector('.qty-plus');
    if (minusBtn) minusBtn.addEventListener('click', () => this._adjustQuantity(-1));
    if (plusBtn) plusBtn.addEventListener('click', () => this._adjustQuantity(1));

    const confirmBtn = this._shadow.querySelector('.confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', () => this._handleConfirm());

    this._selectorEl = this._shadow.querySelector('variant-selector');
    if (this._selectorEl) {
      this._selectorEl.setAttribute('modules', JSON.stringify(this._modules));
      this._selectorEl.addEventListener('variant-change', (e) => {
        this._onVariantChange(e.detail);
      });
    }
  }

  _activateFocusTrap() {
    if (this._trapActive) return;
    this._trapActive = true;
    document.addEventListener('keydown', this._boundHandleKeyDown);
  }

  _cleanup() {
    this._trapActive = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown);
  }

  _handleKeyDown(e) {
    if (!this._isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = Array.from(
      this._shadow.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !this._shadow.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !this._shadow.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Variant availability + price are resolved entirely from the baked
  // dependency graph — no runtime /variants requests on catalog pages.

  _onVariantChange(detail) {
    if (detail.valueId) {
      this._selectedAttributes[detail.moduleId] = detail.valueId;
    } else {
      delete this._selectedAttributes[detail.moduleId];
    }
    this._applyAvailability();
    this._recalculatePrice();
  }

  _applyAvailability() {
    const resolved = resolveAvailable(this._modules, this._dependencies, this._selectedAttributes);

    // Drop selections that became unavailable under the current parents
    // (mirrors the backend filtering those values out entirely).
    for (const moduleId of Object.keys(this._selectedAttributes)) {
      const mod = resolved.find((m) => m.module_id === moduleId);
      const value = mod?.values.find((v) => v.value_id === this._selectedAttributes[moduleId]);
      if (!value || value.available === false) {
        delete this._selectedAttributes[moduleId];
      }
    }

    this._modules = resolved;
    if (this._selectorEl) {
      this._selectorEl.setAttribute('modules', JSON.stringify(resolved));
      this._selectorEl.setAttribute('selected', JSON.stringify(this._selectedAttributes));
    }
  }

  _recalculatePrice() {
    let basePrice = this._basePrice;
    if (this._priceTiers?.length > 0) {
      basePrice = getTierPrice(this._priceTiers, this._quantity, this._basePrice);
    }

    this._finalPrice = resolveFinalPrice(basePrice, this._modules, this._selectedAttributes);

    const priceEl = this._shadow.querySelector('.modal-price');
    if (priceEl) {
      priceEl.textContent = `Gs. ${formatPrice(this._finalPrice)}`;
    }
  }

  _adjustQuantity(delta) {
    const next = this._quantity + delta;
    if (next < 1 || next > 99) return;
    this._quantity = next;
    const qtyEl = this._shadow.querySelector('.qty-value');
    if (qtyEl) qtyEl.textContent = String(this._quantity);
    this._recalculatePrice();
    this._updateTierInfo();
  }

  _updateTierInfo() {
    const badgesEl = this._shadow.querySelector('.volume-badges');
    if (!badgesEl) return;

    badgesEl.innerHTML = this._renderVolumeBadges();
  }

  _handleConfirm() {
    // Bake-failure fallback: never add a variant product without options.
    if (this._currentVariantUi().showFallbackNotice) return;

    if (this._modules.length > 0) {
      const selectedMap = new Map(Object.entries(this._selectedAttributes));
      const allSelected = isSelectionComplete(this._modules, selectedMap);
      if (!allSelected) {
        const confirmBtn = this._shadow.querySelector('.confirm-btn');
        if (confirmBtn) {
          confirmBtn.textContent = 'Seleccioná todas las opciones';
          confirmBtn.classList.add('confirm-btn--error');
          setTimeout(() => {
            confirmBtn.textContent = 'Confirmar';
            confirmBtn.classList.remove('confirm-btn--error');
          }, 2000);
        }
        return;
      }
    }

    const selectedAttributes = {};
    for (const [modId, valId] of Object.entries(this._selectedAttributes)) {
      const mod = this._modules.find((m) => m.module_id === modId);
      if (!mod) continue;
      const val = mod.values.find((v) => v.value_id === valId);
      if (val) {
        selectedAttributes[modId] = {
          value_id: valId,
          label: val.label,
          raw_value: val.raw_value,
          price_modifier: val.price_modifier,
          type_name: mod.name,
        };
      }
    }

    const tier = getTierForQuantity(this._priceTiers, this._quantity);

    addToCartWithOptions({
      id: this._productId,
      name: this._productName,
      price: this._basePrice,
      image: this._productImage,
      quantity: this._quantity,
      price_tiers: this._priceTiers.length > 0 ? this._priceTiers : undefined,
      selected_tier_id: tier?.id,
      selected_tier_price: tier?.price,
      selected_tier_min_qty: tier?.min_quantity,
      selected_attributes: Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined,
    });

    this._updateBadge();

    this.dispatchEvent(new CustomEvent('variant-added', {
      bubbles: true,
      composed: true,
      detail: {
        productId: this._productId,
        selectedAttributes,
        finalPrice: this._finalPrice,
      },
    }));

    this.close();
  }

  _updateBadge() {
    updateCartBadge();
  }

  _getStyles() {
    return `
      :host {
        display: block;
        --_surface: var(--surface, #0a0a0a);
        --_surface-container: var(--surface-container, #1f1f1f);
        --_surface-container-high: var(--surface-container-high, #2a2a2a);
        --_surface-container-highest: var(--surface-container-highest, #353535);
        --_on-surface: var(--on-surface, #e2e2e2);
        --_on-surface-variant: var(--on-surface-variant, #bdc8d1);
        --_primary: var(--primary, #82cfff);
        --_on-primary: var(--on-primary, #00344b);
        --_error: var(--error, #ffb4ab);
        --_outline: var(--outline, #87929b);
        --_outline-variant: var(--outline-variant, #3e4850);
        --_border-width: var(--border-width, 1px);
        --_border-radius: var(--border-radius, 0px);
        --_space-xs: var(--space-xs, 4px);
        --_space-sm: var(--space-sm, 8px);
        --_space-md: var(--space-md, 16px);
        --_space-lg: var(--space-lg, 24px);
        --_space-xl: var(--space-xl, 32px);
        --_font-body: var(--font-body, 'Hanken Grotesk', sans-serif);
        --_font-mono: var(--font-mono, 'Space Mono', monospace);
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--_space-md);
        opacity: 1;
        transition: opacity 0.2s ease;
      }

      .overlay[aria-hidden="true"] {
        display: none;
      }

      .modal {
        position: relative;
        background: var(--_surface-container);
        border: var(--_border-width) solid var(--_outline-variant);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .close-btn {
        position: absolute;
        top: var(--_space-sm);
        right: var(--_space-sm);
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--_on-surface-variant);
        font-size: 24px;
        cursor: pointer;
        z-index: 1;
        line-height: 1;
      }

      .close-btn:hover { color: var(--_on-surface); }
      .close-btn:focus-visible {
        outline: 2px solid var(--_primary);
        outline-offset: 2px;
      }

      .modal-header {
        display: flex;
        gap: var(--_space-md);
        padding: var(--_space-lg);
        border-bottom: var(--_border-width) solid var(--_outline-variant);
        align-items: center;
      }

      .modal-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .modal-info {
        display: flex;
        flex-direction: column;
        gap: var(--_space-xs);
        min-width: 0;
      }

      .modal-title {
        font-family: var(--_font-body);
        font-size: 18px;
        font-weight: 600;
        color: var(--_on-surface);
        margin: 0;
      }

      .modal-price {
        font-family: var(--_font-body);
        font-size: 20px;
        font-weight: 600;
        color: var(--_primary);
        margin: 0;
      }

      .volume-badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--_space-xs);
        margin-top: var(--_space-sm);
      }

      .volume-badge {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 500;
        color: var(--_primary);
        background: color-mix(in srgb, var(--_primary) 10%, transparent);
        border: var(--_border-width) solid color-mix(in srgb, var(--_primary) 30%, transparent);
        padding: var(--_space-xs) var(--_space-sm);
        word-break: break-word;
      }

      .volume-badge[data-active="true"] {
        background: color-mix(in srgb, var(--_primary) 20%, transparent);
        border-color: var(--_primary);
      }

      .modal-body {
        padding: var(--_space-lg);
        overflow-y: auto;
        flex: 1;
        font-family: var(--_font-body);
      }

      .no-variants-msg {
        color: var(--_on-surface-variant);
        text-align: center;
        padding: var(--_space-lg) 0;
      }

      .variant-fallback-notice {
        color: var(--_on-surface-variant);
        text-align: center;
        padding: var(--_space-lg);
        border: var(--_border-width) dashed var(--_outline-variant);
      }

      .modal-footer {
        padding: var(--_space-md) var(--_space-lg);
        border-top: var(--_border-width) solid var(--_outline-variant);
        display: flex;
        flex-direction: column;
        gap: var(--_space-md);
        font-family: var(--_font-body);
      }

      .quantity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .qty-label {
        color: var(--_on-surface-variant);
        font-family: var(--_font-mono);
        font-size: 12px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .qty-controls {
        display: flex;
        align-items: center;
        gap: 0;
      }

      .qty-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--_surface-container-high);
        border: var(--_border-width) solid var(--_outline-variant);
        color: var(--_on-surface);
        font-size: 18px;
        cursor: pointer;
        font-family: var(--_font-body);
        transition: background-color 0.15s ease;
      }

      .qty-btn:hover { background: var(--_surface-container-highest); }
      .qty-btn:focus-visible {
        outline: 2px solid var(--_primary);
        outline-offset: -2px;
      }

      .qty-minus { border-right: none; }
      .qty-plus { border-left: none; }

      .qty-value {
        min-width: 48px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--_surface-container-high);
        border-top: var(--_border-width) solid var(--_outline-variant);
        border-bottom: var(--_border-width) solid var(--_outline-variant);
        color: var(--_on-surface);
        font-family: var(--_font-mono);
        font-size: 14px;
        font-weight: 500;
      }

      .confirm-btn {
        width: 100%;
        padding: 14px var(--_space-md);
        background-color: var(--_primary);
        color: var(--_on-primary);
        border: none;
        border-radius: var(--_border-radius);
        font-family: var(--_font-mono);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      .confirm-btn:hover { opacity: 0.9; }
      .confirm-btn:focus-visible {
        outline: 2px solid var(--_primary);
        outline-offset: 2px;
      }

      .confirm-btn--error {
        background-color: var(--_error);
        color: #000;
      }

      @media (max-width: 767px) {
        .overlay {
          padding: 0;
          align-items: stretch;
        }

        .modal {
          max-width: none;
          max-height: none;
          height: 100%;
          border: none;
        }

        .close-btn {
          width: 44px;
          height: 44px;
        }

        .qty-btn {
          width: 44px;
          height: 44px;
        }

        .qty-value {
          min-width: 52px;
          height: 44px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .overlay, .qty-btn, .confirm-btn {
          transition: none;
        }
      }
    `;
  }
}

if (!customElements.get('variant-modal')) {
  customElements.define('variant-modal', VariantModal);
}
