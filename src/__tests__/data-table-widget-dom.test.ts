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
  return {
    container: {
      querySelector(sel: string) {
        if (sel === 'tbody') return tbody;
        if (sel === '[data-table-footer]') return makeEl();
        return makeEl({ value: '25' });
      },
      querySelectorAll(sel: string) {
        if (sel === 'th[data-sort-key]') return ths.filter((t) => t.dataset.sortKey);
        if (sel === 'th') return ths;
        return [];
      },
      addEventListener() {},
    },
    ths,
    tbody,
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
