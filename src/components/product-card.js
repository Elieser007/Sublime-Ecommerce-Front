/**
 * <product-card> Web Component
 *
 * Encapsulated product card with Shadow DOM.
 * Used in catalog, home, search results, wishlist, etc.
 *
 * Usage:
 *   <product-card product='{"id":"1","slug":"remera","name":"Remera","price":135000,"image":"img.webp","category":"Indumentaria","price_tiers":[]}'></product-card>
 *
 * Attributes:
 *   product (required) — JSON string with product data
 */

import { formatPrice } from '../lib/format';
import { escapeHtml } from '../lib/escape-html';
import { getBestVolumeBadge, getVolumeTierCount } from '../lib/price-utils';

class ProductCard extends HTMLElement {
  connectedCallback() {
    const raw = this.getAttribute('product');
    if (!raw) return;

    const product = JSON.parse(raw);
    const imageUrl = product.image || '/placeholder.webp';
    const category = product.category || '';
    const priceTiers = product.price_tiers || [];
    const bestTier = getBestVolumeBadge(priceTiers);
    const volumeTierCount = getVolumeTierCount(priceTiers);
    const extraVolumeTiers = bestTier && volumeTierCount > 1 ? volumeTierCount - 1 : 0;

    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          --_surface-container: var(--surface-container, #1f1f1f);
          --_on-surface: var(--on-surface, #e2e2e2);
          --_on-surface-variant: var(--on-surface-variant, #bdc8d1);
          --_primary: var(--primary, #82cfff);
          --_secondary: var(--secondary, #ffb0cc);
          --_outline: var(--outline, #87929b);
          --_outline-variant: var(--outline-variant, #3e4850);
          --_border-width: var(--border-width, 1px);
          --_space-xs: var(--space-xs, 4px);
          --_space-sm: var(--space-sm, 8px);
          --_space-md: var(--space-md, 16px);
          --_font-body: var(--font-body, 'Hanken Grotesk', sans-serif);
          --_font-mono: var(--font-mono, 'Space Mono', monospace);

        }

        .product-card {
          display: flex;
          flex-direction: column;
          border: var(--_border-width) solid var(--_outline);
          transition: border-color 0.2s ease;
          gap: 0;
          font-family: var(--_font-body);
        }

        .product-card:hover {
          border-color: var(--_primary);
        }

        .product-link {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-link:hover {
          text-decoration: none;
        }

        .product-image-wrapper {
          aspect-ratio: 1;
          overflow: hidden;
          background-color: var(--_surface-container);
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.05);
        }

        .product-info {
          padding: var(--_space-md);
          display: flex;
          flex-direction: column;
          gap: var(--_space-xs);
          flex: 1;
        }

        .product-category {
          color: var(--_secondary);
          font-family: var(--_font-mono);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .product-name {
          color: var(--_on-surface);
          font-family: var(--_font-body);
          font-size: 18px;
          font-weight: 400;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
          min-height: calc(18px * 1.4 * 2);
          max-height: calc(18px * 1.4 * 2);
        }

        .product-price-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--_space-sm);
        }

        .product-price {
          color: var(--_primary);
          font-family: var(--_font-body);
          font-size: 18px;
          font-weight: 400;
          line-height: 28px;
          margin-y: var(--_space-xs);
        }

        .volume-badge {
          display: none;
          font-size: 11px;
          font-weight: 500;
          color: var(--_primary);
          background: color-mix(in srgb, var(--_primary) 10%, transparent);
          border: var(--_border-width) solid color-mix(in srgb, var(--_primary) 30%, transparent);
          padding: var(--_space-xs) var(--_space-sm);
          word-break: break-word;
          cursor: default;
        }

        .volume-badge.visible {
          display: inline-flex;
        }

        .volume-badge-extra {
          display: none;
          font-size: 11px;
          font-weight: 500;
          color: var(--_on-surface-variant);
          background: color-mix(in srgb, var(--_outline) 12%, transparent);
          border: var(--_border-width) solid var(--_outline-variant);
          padding: var(--_space-xs) var(--_space-sm);
          word-break: break-word;
          cursor: default;
        }

        .volume-badge-extra.visible {
          display: inline-flex;
        }

        .product-add-btn {
          width: 100%;
          border-radius: 0;
          padding: 12px var(--_space-md);
          background-color: rgba(130, 207, 255, 0.1);
          color: #ffffff;
          font-family: var(--_font-mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(130, 207, 255, 0.5);
          border-top: var(--_border-width) solid var(--_outline-variant);
          text-align: center;
          backdrop-filter: blur(8px);
        }

        .product-add-btn:hover {
          background-color: rgba(130, 207, 255, 0.2);
          border-color: var(--primary);
          transform: scale(1.02);
        }

        .product-add-btn:active {
          transform: scale(0.98);
        }

        .product-add-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      </style>

      <article class="product-card">
        <a href="/products/${escapeHtml(product.slug)}" class="product-link">
          <div class="product-image-wrapper">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" class="product-image" loading="lazy" width="400" height="400" />
          </div>
          <div class="product-info">
            ${category ? `<span class="product-category">${escapeHtml(category)}</span>` : ''}
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="product-price-row">
              <p class="product-price">Gs. ${escapeHtml(formatPrice(product.price))}</p>
              ${bestTier ? `<span class="volume-badge visible">Desde ${escapeHtml(bestTier.min_quantity)} unds: Gs. ${escapeHtml(formatPrice(bestTier.price))}</span>` : '<span class="volume-badge"></span>'}
              ${extraVolumeTiers > 0 ? `<span class="volume-badge-extra visible">+${escapeHtml(extraVolumeTiers)}</span>` : ''}
            </div>
          </div>
        </a>
        <button class="product-add-btn" aria-label="Agregar ${escapeHtml(product.name)} al carrito">
          Agregar al carrito
        </button>
      </article>
    `;

    this._bindCart(product);
    this._makeBadgeInert();
  }

  // Badge and extra chip sit inside the card anchor; preventDefault stops their click from navigating.
  _makeBadgeInert() {
    this.shadowRoot.querySelectorAll('.volume-badge, .volume-badge-extra').forEach((el) => {
      el.addEventListener('click', (event) => event.preventDefault());
    });
  }

  _bindCart(product) {
    const btn = this.shadowRoot.querySelector('.product-add-btn');
    if (!btn) return;

    let modal = null;

    btn.addEventListener('click', () => {
      if (!modal) {
        modal = document.createElement('variant-modal');
        modal.setAttribute('product-id', product.id);
        modal.setAttribute('product-name', product.name);
        modal.setAttribute('product-price', String(product.price));
        modal.setAttribute('product-image', product.image || '/placeholder.webp');
        if (product.price_tiers && product.price_tiers.length > 0) {
          modal.setAttribute('price-tiers', JSON.stringify(product.price_tiers));
        }
        // Baked at build time (SSG): the modal resolves availability + price
        // client-side and never fetches /variants at runtime.
        const variantsAttr = this.getAttribute('variants');
        if (variantsAttr) {
          modal.setAttribute('variants', variantsAttr);
        }
        // Forward the bake-outcome flag so the modal can distinguish a
        // failed bake (payload said modules should exist, graph
        // missing/corrupt → notice + blocked) from a product that genuinely
        // has no variants (purchasable). See src/lib/variant-fallback.ts.
        modal.setAttribute('bake-failed', product.bakeFailed ? 'true' : 'false');
        document.body.appendChild(modal);
      }
      modal.open(btn);
    });
  }
}

customElements.define('product-card', ProductCard);
