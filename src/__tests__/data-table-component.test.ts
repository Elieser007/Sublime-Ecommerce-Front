/**
 * Standard DataTable component + widget contract tests (RED)
 *
 * Source-marker tests per repo pattern (TableAction.test.ts):
 * - DataTable.astro: static shell structure (headers, sort buttons, states)
 * - data-table-widget.ts: client controller API (setRows/setLoading/setError,
 *   server/client modes, pagination + sort rendering, a11y attributes)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const dataTableSource = readFileSync(resolve(__dirname, '../components/admin/DataTable.astro'), 'utf-8');
const widgetSource = readFileSync(resolve(__dirname, '../lib/data-table-widget.ts'), 'utf-8');

describe('DataTable.astro — Source Structure', () => {
  describe('Props Interface', () => {
    it('defines a DataTableColumn type with key/label/width/sortable/align', () => {
      expect(dataTableSource).toMatch(/interface DataTableColumn\s*\{/);
      expect(dataTableSource).toContain('key: string;');
      expect(dataTableSource).toContain('label: string;');
      expect(dataTableSource).toContain('width?: string;');
      expect(dataTableSource).toContain('sortable?: boolean;');
      expect(dataTableSource).toContain("align?: 'left' | 'center' | 'right';");
    });

    it('requires an id prop for element scoping', () => {
      expect(dataTableSource).toContain('id: string;');
    });

    it('accepts emptyMessage, pageSize, pageSizeOptions and ariaLabel', () => {
      expect(dataTableSource).toContain('emptyMessage?: string;');
      expect(dataTableSource).toContain('pageSize?: number;');
      expect(dataTableSource).toContain('pageSizeOptions?: number[];');
      expect(dataTableSource).toContain('ariaLabel?: string;');
    });
  });

  describe('Table Shell', () => {
    it('renders a scrollable wrapper with the table id', () => {
      expect(dataTableSource).toMatch(/class="dt-scroll"[^>]*id=\{id\}/);
      expect(dataTableSource).toContain('class="dt-table"');
    });

    it('renders th with scope="col"', () => {
      expect(dataTableSource).toContain('scope="col"');
    });

    it('marks sortable columns with data-sort-key and aria-sort', () => {
      expect(dataTableSource).toContain('data-sort-key');
      expect(dataTableSource).toContain('aria-sort');
    });

    it('renders a sort button inside sortable headers', () => {
      expect(dataTableSource).toContain('class="dt-sort-btn"');
    });

    it('applies column width and alignment classes', () => {
      expect(dataTableSource).toContain('width');
      expect(dataTableSource).toContain('dt-th--center');
      expect(dataTableSource).toContain('dt-th--right');
    });

    it('renders a tbody with a loading placeholder row', () => {
      expect(dataTableSource).toContain('-body"');
      expect(dataTableSource).toContain('Cargando...');
    });
  });

  describe('Pagination Footer', () => {
    it('renders a page-size select with options', () => {
      expect(dataTableSource).toContain('-page-size"');
      expect(dataTableSource).toContain('pageSizeOptions.map');
    });

    it('renders a showing indicator', () => {
      expect(dataTableSource).toContain('-showing"');
    });

    it('renders a pagination nav with prev/next buttons', () => {
      expect(dataTableSource).toContain('class="page-nav"');
      expect(dataTableSource).toContain('-prev"');
      expect(dataTableSource).toContain('-next"');
      expect(dataTableSource).toContain('aria-label="Página anterior"');
      expect(dataTableSource).toContain('aria-label="Página siguiente"');
    });

    it('reuses the shared pagination-bar layout classes', () => {
      expect(dataTableSource).toContain('pagination-bar');
    });
  });
});

describe('data-table-widget.ts — Client Controller Contract', () => {
  describe('Exports', () => {
    it('exports createDataTable and its handle types', () => {
      expect(widgetSource).toMatch(/export function createDataTable/);
      expect(widgetSource).toMatch(/export interface DataTableHandle/);
      expect(widgetSource).toMatch(/export interface CreateDataTableOptions/);
    });

    it('imports the pure lib functions', () => {
      expect(widgetSource).toContain("from './data-table'");
      expect(widgetSource).toContain('paginateData');
      expect(widgetSource).toContain('sortData');
      expect(widgetSource).toContain('buildPageRange');
    });
  });

  describe('Options Contract', () => {
    it('requires container and renderCell', () => {
      expect(widgetSource).toContain('container: HTMLElement;');
      expect(widgetSource).toContain('renderCell:');
    });

    it('supports rowClass, renderRowSuffix and emptyMessage', () => {
      expect(widgetSource).toContain('rowClass?:');
      expect(widgetSource).toContain('renderRowSuffix?:');
      expect(widgetSource).toContain('emptyMessage?:');
    });

    it('supports server-mode pagination callbacks', () => {
      expect(widgetSource).toContain('onPageChange?: (page: number) => void;');
      expect(widgetSource).toContain('onPageSizeChange?: (pageSize: number) => void;');
    });

    it('supports an empty-state action', () => {
      expect(widgetSource).toContain('emptyAction?:');
    });
  });

  describe('Handle Contract', () => {
    it('exposes setRows with optional server pagination meta', () => {
      expect(widgetSource).toMatch(/setRows\(rows: any\[\], meta\??:/);
    });

    it('exposes setLoading and setError', () => {
      expect(widgetSource).toContain('setLoading(');
      expect(widgetSource).toContain('setError(');
    });
  });

  describe('Rendering Contract', () => {
    it('reads columns from the rendered thead', () => {
      expect(widgetSource).toContain('th[data-sort-key]');
    });

    it('emits data-label on every data cell', () => {
      expect(widgetSource).toContain('data-label=');
    });

    it('renders empty and error state rows with the shared empty-cell class', () => {
      expect(widgetSource).toContain('empty-cell');
    });

    it('renders page buttons from buildPageRange with ellipsis and aria-current', () => {
      expect(widgetSource).toContain('ellipsis');
      expect(widgetSource).toContain('aria-current');
      expect(widgetSource).toContain('aria-label');
    });

    it('updates aria-sort when a column is sorted', () => {
      expect(widgetSource).toContain('aria-sort');
      expect(widgetSource).toContain('ascending');
      expect(widgetSource).toContain('descending');
    });

    it('disables prev/next at the range edges', () => {
      expect(widgetSource).toContain('disabled');
    });
  });
});
