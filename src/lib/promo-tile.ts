import { escapeHtml, sanitizePromoUrl } from "./escape-html";
import { resolvePromoImage } from "./promo-editor";

export interface PromoTileContent {
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  localImageUrl?: string | null;
  link?: string;
}

export function renderPromoTileContent(
  tile: PromoTileContent,
  options: { inertLink?: boolean } = {}
): string {
  const image = escapeHtml(resolvePromoImage(tile));
  const title = escapeHtml(tile.title ?? "");
  const subtitle = escapeHtml(tile.subtitle ?? "");
  const href = escapeHtml(sanitizePromoUrl(tile.link));
  const label = title || "Promocion";
  const linkStyle = options.inertLink ? ' style="pointer-events:none"' : "";
  return `<div class="tile-bg" style="background-image:url('${image}')"></div><div class="tile-overlay"></div><div class="tile-content">${title ? `<h3 class="tile-title">${title}</h3>` : ""}${subtitle ? `<p class="tile-desc">${subtitle}</p>` : ""}</div><a href="${href}" class="tile-link" aria-label="${label}"${linkStyle}></a>`;
}
