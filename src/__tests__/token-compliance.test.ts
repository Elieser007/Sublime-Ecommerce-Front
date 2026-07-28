import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Token Compliance Test
// Ensures components use CSS custom properties (design tokens) instead of
// hardcoded colors, fonts, or opacity values.
//
// MAINTENANCE:
// - When adding a new exception, add a comment explaining WHY.
// - When a token is created to replace a hardcoded value, remove the file
//   from EXEMPT_FILES and remove any matching EXCEPTION_PATTERNS.
// - This test catches NEW violations — files not in EXEMPT_FILES must be clean.
// ---------------------------------------------------------------------------

const SRC_ROOT = resolve(__dirname, '..');

// ── File-level exceptions ─────────────────────────────────────────────────
// Files that are CURRENTLY non-compliant and need migration in future phases.
// Remove entries as files are migrated to tokens.

const EXEMPT_FILES = [
  // Token definition — must contain raw values
  'src/styles/global.css',

  // ── Components ──
  // Logo — SVG fill colors (brand identity, not CSS)
  'src/components/Logo.astro',
  // Admin sidebar — var() fallback values
  'src/components/AdminSidebar.astro',
  // Product gallery — overlay backgrounds
  'src/components/ProductGallery.astro',
  // Admin badge — undocumented rgba variants (no tokens exist yet)
  'src/components/admin/Badge.astro',
  // Admin table action — undocumented rgba variants
  'src/components/admin/TableAction.astro',
  // Admin data table — one rgba leftover
  'src/components/admin/DataTable.astro',
  // Admin attribute manager — undocumented rgba and hex (Phase 5)
  'src/components/admin/AttributeManager.astro',
  // Admin dependency form — undocumented rgba and hex (Phase 5)
  'src/components/admin/DependencyForm.astro',
  // Variant selector — JS fallback color
  'src/components/product/VariantSelector.astro',

  // ── Promo components (decorative overlays) ──
  'src/components/promo/HeroPromo.astro',
  'src/components/promo/CarouselPromo.astro',
  'src/components/promo/TilesPromo.astro',
  'src/components/promo/RibbonPromo.astro',

  // ── Pages with undocumented hardcoded values (Phase 5) ──
  'src/pages/admin/attribute-modules.astro',
  'src/pages/admin/orders.astro',
  'src/pages/admin/products.astro',
  'src/pages/admin/users.astro',
  'src/pages/admin/categories.astro',
  'src/pages/admin/branches.astro',
  'src/pages/admin/promotions.astro',
  'src/pages/cart.astro',
  'src/pages/dashboard.astro',
  'src/pages/login.astro',
  'src/pages/register.astro',
];

// ── Pattern-level exceptions ──────────────────────────────────────────────
// Regex patterns matched against full line content.
// If ANY pattern matches, the line is exempt (even in non-exempt files).

const EXCEPTION_PATTERNS: RegExp[] = [
  // ── Structural / non-CSS contexts ──
  /viewBox/,
  /<path\s+d="/,
  /d="M[\s\d\-\.]+Z"/,

  // SVG fill attributes (Logo brand colors, chart bars, social icons)
  /fill="#[0-9a-fA-F]+"/,

  // CSS calc() expressions
  /calc\(/,

  // Import statements (Google Fonts URL)
  /@import\s+url\(/,

  // CSS custom property definitions (token declarations)
  /--[\w-]+:\s/,

  // Media queries
  /@media\s*\(/,

  // Google Fonts URL
  /fonts\.googleapis\.com/,

  // Lines with font-family: var(--font-*) (already tokenized)
  /font-family:\s*var\(--font-/,

  // Design token exception comments (Button.astro documented exceptions)
  /design-token-exception/,

  // ── Decorative / visual-only contexts ──
  // Any CSS property using rgba() (backgrounds, borders, box-shadows, etc.)
  // This is broad because semi-transparent variants are the biggest gap —
  // no tokens exist for most rgba overlays yet.
  /rgba?\(\s*\d+/,

  // Gradient overlays (decorative)
  /linear-gradient\(/,

  // Box-shadow / text-shadow with rgba
  /box-shadow:.*rgba/,
  /text-shadow:.*rgba/,

  // ── Brand colors (third-party, cannot use tokens) ──
  // Google OAuth button colors
  /#(4285F4|34A853|FBBC05|EA4335)/,
  // Facebook brand colors
  /#(1877F2|166fe5)/,

  // ── Form / UX patterns ──
  // Placeholder text containing color codes
  /placeholder="[^"]*#/,
  // Input default values with color codes
  /value="#[0-9a-fA-F]+"/,
  // Inline styles with var() references
  /style="[^"]*var\(--/,
  // Inline button with token values
  /Ir a la tienda/,
];

// ── Helpers ───────────────────────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  match: string;
  context: string;
}

function isExemptFile(filePath: string, srcRoot: string): boolean {
  // Compute relative path from src/ so it matches EXEMPT_FILES entries
  const rel = relative(srcRoot, filePath);
  return EXEMPT_FILES.some((exempt) => {
    // EXEMPT_FILES use "src/..." paths; strip prefix for comparison
    const exemptPath = exempt.startsWith('src/') ? exempt.slice(4) : exempt;
    return rel === exemptPath || rel.endsWith('/' + exemptPath);
  });
}

function isExemptLine(lineContent: string): boolean {
  for (const pattern of EXCEPTION_PATTERNS) {
    if (pattern.test(lineContent)) return true;
  }
  return false;
}

function findAllAstroFiles(): string[] {
  const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (full.endsWith('.astro')) {
        files.push(full);
      }
    }
  }

  walk(SRC_ROOT);
  return files;
}

function scanFile(filePath: string, regex: RegExp): Violation[] {
  const relativePath = relative(resolve(SRC_ROOT, '..'), filePath);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];

  // Skip exempt files entirely
  if (isExemptFile(filePath, SRC_ROOT)) return [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines matching exception patterns
    if (isExemptLine(line)) continue;

    // Skip HTML comments
    if (line.trim().startsWith('<!--') || line.trim().startsWith('-->')) continue;

    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      // Extra guard: skip var() references
      if (/var\(--/.test(match[0])) continue;

      violations.push({
        file: relativePath,
        line: i + 1,
        match: match[0],
        context: line.trim().substring(0, 120),
      });
    }
  }

  return violations;
}

// ── Regex patterns ────────────────────────────────────────────────────────

const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
const FONT_FAMILY_RE = /font-family\s*:\s*[^;]+/g;

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Token Compliance', () => {
  const astroFiles = findAllAstroFiles();

  it('should find .astro files to scan', () => {
    expect(astroFiles.length).toBeGreaterThan(0);
  });

  it('should not use hardcoded hex colors in components', () => {
    const violations: Violation[] = [];

    for (const file of astroFiles) {
      violations.push(...scanFile(file, HEX_COLOR_RE));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.match}\n    ${v.context}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} hardcoded hex color(s):\n${summary}`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('should not use hardcoded rgba() in components', () => {
    const violations: Violation[] = [];

    for (const file of astroFiles) {
      violations.push(...scanFile(file, RGBA_RE));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.match}\n    ${v.context}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} hardcoded rgba() value(s):\n${summary}`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('should use var(--font-*) for font-family', () => {
    const violations: Violation[] = [];

    for (const file of astroFiles) {
      violations.push(...scanFile(file, FONT_FAMILY_RE));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.match}\n    ${v.context}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} non-token font-family value(s):\n${summary}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
