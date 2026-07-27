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

import { addToCart, getCartCount, formatPrice } from '../lib/cart.js';
import { escapeHtml } from '../lib/escape-html';

class ProductCard extends HTMLElement {
  connectedCallback() {
    const raw = this.getAttribute('product');
    if (!raw) return;

    const product = JSON.parse(raw);
    const imageUrl = product.image || '/placeholder.webp';
    const category = product.category || '';
    const priceTiers = product.price_tiers || [];
    const bestTier = this._findBestTier(priceTiers);

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
          margin:0;
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
        }

        .volume-badge.visible {
          display: inline-flex;
        }

        .product-add-btn {
          width: 100%;
          border-radius: 0;
          padding: 12px var(--_space-md);
          background: var(--primary);
          color: var(--surface-container);
          font-family: var(--_font-body);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          border-top: var(--_border-width) solid var(--_outline-variant);
          text-align: center;
        }

        .product-add-btn:hover {
          color: var(--_surface-container);
          background: var(--secondary);
        }
      </style>

      <article class="product-card">
        <a href="/producto/${escapeHtml(product.slug)}" class="product-link">
          <div class="product-image-wrapper">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" class="product-image" loading="lazy" width="400" height="400" />
          </div>
          <div class="product-info">
            ${category ? `<span class="product-category">${escapeHtml(category)}</span>` : ''}
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="product-price-row">
              <p class="product-price">Gs. ${escapeHtml(formatPrice(product.price))}</p>
              ${bestTier ? `<span class="volume-badge visible">Desde ${escapeHtml(bestTier.min_quantity)} unds: Gs. ${escapeHtml(formatPrice(bestTier.price))}</span>` : '<span class="volume-badge"></span>'}
            </div>
          </div>
        </a>
        <button class="product-add-btn" aria-label="Agregar ${escapeHtml(product.name)} al carrito">
          Agregar al carrito
        </button>
      </article>
    `;

    this._bindCart(product);
  }

  _findBestTier(tiers) {
    if (!tiers || tiers.length === 0) return null;
    const volumeTiers = tiers.filter((t) => t.min_quantity > 1);
    if (volumeTiers.length === 0) return null;
    return volumeTiers.reduce((a, b) => (b.price < a.price ? b : a));
  }

  _bindCart(product) {
    const btn = this.shadowRoot.querySelector('.product-add-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });

      // Update header cart badge
      const badge = document.getElementById('cart-count');
      if (badge) {
        badge.textContent = getCartCount().toString();
        badge.style.display = '';
      }

      // Visual feedback
      btn.textContent = '¡Agregado!';
      setTimeout(() => {
        btn.textContent = 'Agregar al carrito';
      }, 1500);
    });
  }
}

customElements.define('product-card', ProductCard);
