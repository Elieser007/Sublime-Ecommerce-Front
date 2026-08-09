import { escapeHtml, sanitizePromoUrl } from "./escape-html";
import { resolvePromoImage } from "./promo-editor";
import { tilePlacement } from "./promo-grid";
import { renderPromoTileContent } from "./promo-tile";

export interface PromoPreview {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  localImageUrl?: string | null;
  link: string;
  position: number;
  posY: number;
  tileCols: number;
  tileRows: number;
}

function editAffordance(key: string): string {
  return `<button type="button" class="pv-edit" data-action="edit" data-local-key="${escapeHtml(key)}" aria-label="Editar anuncio" style="position:absolute;top:8px;right:8px;z-index:20;">✎</button>`;
}

function imageAttr(p: PromoPreview): string {
  return escapeHtml(resolvePromoImage(p));
}

function buildHero(first?: PromoPreview): string {
  if (!first) return "";
  return `<div class="hero-promo"><div class="hero-bg" style="background-image:url('${imageAttr(first)}')"></div><div class="hero-overlay"></div><div class="hero-content">${first.title ? `<h2 class="hero-title">${escapeHtml(first.title)}</h2>` : ""}${first.subtitle ? `<p class="hero-desc">${escapeHtml(first.subtitle)}</p>` : ""}<a href="${escapeHtml(sanitizePromoUrl(first.link))}" class="hero-btn">Ver más</a></div>${editAffordance(first.id)}</div>`;
}

function buildCarousel(promotions: PromoPreview[]): string {
  let html = `<div class="carousel-promo" data-carousel-id="preview"><div class="carousel-track">`;
  promotions.forEach((pt, i) => {
    const active = i === 0 ? " active" : "";
    html += `<div class="carousel-slide${active}" data-index="${i}"><div class="slide-bg" style="background-image:url('${imageAttr(pt)}')"></div><div class="slide-overlay"></div><div class="slide-content">${pt.title ? `<h3 class="slide-title">${escapeHtml(pt.title)}</h3>` : ""}${pt.subtitle ? `<p class="slide-desc">${escapeHtml(pt.subtitle)}</p>` : ""}</div><a href="${escapeHtml(sanitizePromoUrl(pt.link))}" class="slide-link" aria-label="${escapeHtml(pt.title || "Promocion")}"></a></div>`;
  });
  html += "</div>";
  if (promotions.length > 1) {
    html += `<div class="carousel-dots">`;
    promotions.forEach((_, i) => {
      const active = i === 0 ? " active" : "";
      html += `<button class="carousel-dot${active}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`;
    });
    html += `</div>`;
    html += `<button class="carousel-arrow carousel-arrow--left" aria-label="Anterior"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>`;
    html += `<button class="carousel-arrow carousel-arrow--right" aria-label="Siguiente"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>`;
  }
  html += `${editAffordance(promotions[0]?.id ?? "")}</div>`;
  return html;
}

function buildTiles(promotions: PromoPreview[], gridCols: number): string {
  const cols = gridCols > 0 ? gridCols : 4;
  let html = `<div class="tiles-promo" style="grid-template-columns:repeat(${cols},1fr);grid-auto-rows:160px;">`;
  promotions.forEach((pt) => {
    const { col, row } = tilePlacement({
      id: pt.id,
      posX: pt.position,
      posY: pt.posY || 0,
      width: pt.tileCols || 1,
      height: pt.tileRows || 1,
    });
    html += `<div class="tile" style="grid-column:${col}/span ${pt.tileCols || 1};grid-row:${row}/span ${pt.tileRows || 1};">${renderPromoTileContent(pt)}${editAffordance(pt.id)}</div>`;
  });
  html += "</div>";
  return html;
}

function buildSplit(promotions: PromoPreview[]): string {
  let html = `<div class="split-promo">`;
  promotions.forEach((pt, i) => {
    const rev = i % 2 === 1 ? " split-item--reverse" : "";
    html += `<a href="${escapeHtml(sanitizePromoUrl(pt.link))}" class="split-item${rev}"><div class="split-img"><img src="${imageAttr(pt)}" alt="${escapeHtml(pt.title || "")}" /></div><div class="split-text">${pt.title ? `<h3 class="split-title">${escapeHtml(pt.title)}</h3>` : ""}${pt.subtitle ? `<p class="split-desc">${escapeHtml(pt.subtitle)}</p>` : ""}<span class="split-link">Ver más →</span></div></a>`;
  });
  html += `${editAffordance(promotions[0]?.id ?? "")}</div>`;
  return html;
}

function buildBanner(promotions: PromoPreview[]): string {
  let html = `<div class="banner-promo">`;
  promotions.forEach((pt) => {
    html += `<div class="banner-item-wrap" style="position:relative;"><a href="${escapeHtml(sanitizePromoUrl(pt.link))}" class="banner-item">${pt.title ? `<span class="banner-title">${escapeHtml(pt.title)}</span>` : ""}${pt.subtitle ? `<span class="banner-desc">${escapeHtml(pt.subtitle)}</span>` : ""}</a>${editAffordance(pt.id)}</div>`;
  });
  html += `</div>`;
  return html;
}

function buildRibbon(promotions: PromoPreview[]): string {
  let html = `<div class="ribbon-promo">`;
  promotions.forEach((pt) => {
    html += `<a href="${escapeHtml(sanitizePromoUrl(pt.link))}" class="ribbon-item"><div class="ribbon-bg" style="background-image:url('${imageAttr(pt)}')"></div><div class="ribbon-overlay"></div><div class="ribbon-content">${pt.title ? `<span class="ribbon-title">${escapeHtml(pt.title)}</span>` : ""}${pt.subtitle ? `<span class="ribbon-desc">${escapeHtml(pt.subtitle)}</span>` : ""}</div></a>`;
  });
  html += `${editAffordance(promotions[0]?.id ?? "")}</div>`;
  return html;
}

export function buildPromoPreviewHtml(
  displayType: string,
  promotions: PromoPreview[],
  gridCols: number
): string {
  switch (displayType) {
    case "hero":
      return buildHero(promotions[0]);
    case "carousel":
      return buildCarousel(promotions);
    case "tiles":
      return buildTiles(promotions, gridCols);
    case "split":
      return buildSplit(promotions);
    case "banner":
      return buildBanner(promotions);
    case "ribbon":
      return buildRibbon(promotions);
    default:
      return "";
  }
}
