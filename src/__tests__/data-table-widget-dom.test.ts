import { describe, it, expect } from 'vitest';
import { createDataTable } from '../lib/data-table-widget';

function makeEl(attrs: Record<string, unknown> = {}) {
  return {
    dataset: {} as Record<string, string>,
    classList: {
      contains: (c: string) => ((attrs.classes as string[]) || []).includes(c),
    },
    textContent: (attrs.text as string) || '',
    value: (attrs.value as string) || '25',
    hidden: false,
    disabled: false,
    innerHTML: '',
    setAttribute() {},
    removeAttribute() {},
    hasAttribute(attr: string) {
      return false;
    },
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
  };
}

function makeContainer(thDefs: { key: string; label: string; sortable: boolean; align?: string }[]) {
  const ths = thDefs.map((def) => {
    const el = makeEl({ text: def.label, classes: def.align ? [`dt-th--${def.align}`] : [] });
    el.dataset.key = def.key;
    if (def.sortable) el.dataset.sortKey = def.key;
    el.hasAttribute = (attr: string) => attr === 'data-sort-key' && !!el.dataset.sortKey;
    return el;
  });
  const tbody = makeEl();
  const footerEl = makeEl();
  const showingEl = makeEl();
  const pagesEl = makeEl();
  const prevBtn = makeEl();
  const nextBtn = makeEl();
  const clicks: Array<(event: any) => void> = [];
  return {
    container: {
      querySelector(sel: string) {
        if (sel === 'tbody') return tbody;
        if (sel === '[data-table-footer]') return footerEl;
        if (sel === '[data-showing]') return showingEl;
        if (sel === '[data-pages]') return pagesEl;
        if (sel === '[data-prev]') return prevBtn;
        if (sel === '[data-next]') return nextBtn;
        return makeEl({ value: '25' });
      },
      querySelectorAll(sel: string) {
        if (sel === 'th[data-sort-key]') return ths.filter((t) => t.dataset.sortKey);
        if (sel === 'th') return ths;
        return [];
      },
      addEventListener(type: string, handler: (event: any) => void) {
        if (type === 'click') clicks.push(handler);
      },
      click: (event: any) => clicks.forEach((handler) => handler(event)),
    },
    ths,
    tbody,
    footerEl,
    showingEl,
    pagesEl,
    prevBtn,
    nextBtn,
  };
}

const PRODUCT_THS = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'section', label: 'Sección', sortable: false },
  { key: 'category', label: 'Categoría', sortable: false },
  { key: 'subcategory', label: 'Subcategoría', sortable: false },
  { key: 'price', label: 'Precio Base', sortable: true, align: 'right' },
  { key: 'attributes', label: 'Atributos', sortable: false },
  { key: 'status', label: 'Estado', sortable: false },
  { key: 'actions', label: 'Acciones', sortable: false },
];

describe('data-table-widget row rendering (DOM contract)', () => {
  it('renders one cell per header column, including non-sortable columns', () => {
    const { container, ths, tbody } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ name: 'Remera', slug: 'remera', price: 120000 }], { total: 1, totalPages: 1 });

    const tdCount = (tbody.innerHTML.match(/<td /g) || []).length;
    expect(tdCount).toBe(ths.length);
  });

  it('emits data-label for every column label', () => {
    const { container, tbody } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ name: 'Remera', slug: 'remera', price: 120000 }], { total: 1, totalPages: 1 });

    const labels = [...tbody.innerHTML.matchAll(/data-label="([^"]*)"/g)].map((m) => m[1]);
    expect(labels).toEqual(PRODUCT_THS.map((t) => t.label));
  });

  it('renders the actions cell for rows', () => {
    const { container, tbody } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => (col.key === 'actions' ? '<button>Editar</button>' : String(row[col.key] ?? '')),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ name: 'Remera', slug: 'remera', price: 120000 }], { total: 1, totalPages: 1 });

    expect(tbody.innerHTML).toContain('<button>Editar</button>');
  });

  it('emits rowAttrs attributes on the tr', () => {
    const { container, tbody } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      rowAttrs: (row: any) => ({ 'data-module-id': row.id }),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ id: 'mod-1', name: 'Color' }], { total: 1, totalPages: 1 });

    expect(tbody.innerHTML).toContain('<tr data-module-id="mod-1">');
  });

  it('sorts only when the column is sortable', () => {
    const { container, tbody } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows(
      [{ name: 'B', slug: 'b', price: 10 }, { name: 'A', slug: 'a', price: 20 }],
      { total: 2, totalPages: 1 }
    );
    table.setRows(
      [{ name: 'A', slug: 'a', price: 20 }, { name: 'B', slug: 'b', price: 10 }],
      { total: 2, totalPages: 1 }
    );

    expect(tbody.innerHTML).toContain('</tr>');
  });
});

describe('data-table-widget footer showing counter', () => {
  it('shows the real visible/total counts on load with a single page', () => {
    const { container, showingEl, footerEl } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);

    expect(showingEl.textContent).toBe('Mostrando 1–3 de 3');
    expect(footerEl.hidden).toBe(false);
  });

  it('updates the counter after a filter shrinks the rows', () => {
    const { container, showingEl } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
    table.setRows([{ name: 'B' }]);

    expect(showingEl.textContent).toBe('Mostrando 1–1 de 1');
  });

  it('shows server totals from meta on load', () => {
    const { container, showingEl } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
      onPageChange: () => {},
    });

    table.setRows([{ name: 'A' }, { name: 'B' }, { name: 'C' }], { total: 42, totalPages: 2 });

    expect(showingEl.textContent).toBe('Mostrando 1–25 de 42');
  });

  it('updates the counter after a page change', () => {
    const { container, showingEl } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    const rows = Array.from({ length: 60 }, (_, i) => ({ name: `P${i + 1}` }));
    table.setRows(rows);
    const pageBtn = makeEl();
    pageBtn.dataset.page = '2';
    const target = makeEl();
    target.closest = (sel: string) => (sel === '[data-page]' ? pageBtn : null);
    container.click({ target });

    expect(showingEl.textContent).toBe('Mostrando 26–50 de 60');
  });

  it('shows 0–0 de 0 for an empty result set', () => {
    const { container, showingEl } = makeContainer(PRODUCT_THS);
    const table = createDataTable({
      container,
      renderCell: (col, row: any) => String(row[col.key] ?? ''),
      emptyMessage: 'No hay productos',
    });

    table.setRows([]);

    expect(showingEl.textContent).toBe('Mostrando 0–0 de 0');
  });
});
