/**
 * HTML Escape Utility — XSS Prevention
 *
 * Escapes special characters to prevent injection when interpolating
 * user-controlled strings into HTML via innerHTML or template literals.
 *
 * Used by PromotionWall and any component that renders dynamic content.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escape HTML special characters in a string.
 * Returns empty string for null/undefined.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

/**
 * Sanitize a URL for use in href or src attributes.
 * Only allows http/https protocols and relative paths.
 * Returns "#" for invalid/suspicious URLs.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  // Block protocol bypass attempts with internal whitespace (e.g. "java script:", "java\tscript:")
  // by checking the protocol portion with whitespace removed
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 0) {
    const protocol = trimmed.substring(0, colonIndex).replace(/\s+/g, "").toLowerCase();
    // Only allow http/https protocols
    if (protocol !== "http" && protocol !== "https") return "#";
  }
  // Allow relative paths and http/https
  if (/^(https?:\/\/|\/)/.test(trimmed)) return trimmed;
  return "#";
}

/**
 * Sanitize a promotion link for use in an href attribute.
 * Promotions are campaign links, so only absolute http/https URLs
 * are valid; bare domains ("google.com"), relative paths and other
 * protocols are dropped (returns "#").
 */
export function sanitizePromoUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\/\S+$/.test(trimmed)) return trimmed;
  return "#";
}
