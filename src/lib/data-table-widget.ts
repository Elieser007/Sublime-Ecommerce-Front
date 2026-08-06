import { paginateData, sortData, buildPageRange } from './data-table';
import type { SortDirection } from './data-table';
import { escapeHtml } from './escape-html';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface CreateDataTableOptions {
  container: HTMLElement;
  renderCell: (column: DataTableColumn, row: any) => string;
  rowClass?: (row: any) => string;
  renderRowSuffix?: (row: any) => string;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  emptyAction?: { label: string; onClick: () => void };
}

export interface DataTableMeta {
  total?: number;
  totalPages?: number;
}

export interface DataTableHandle {
  setRows: (rows: any[], meta?: DataTableMeta) => void;
  setLoading: (message?: string) => void;
  setError: (message: string) => void;
}

export function createDataTable(options: CreateDataTableOptions): DataTableHandle {
  const { container } = options;
  const tbody = container.querySelector<HTMLTableSectionElement>('tbody');
  const columns: DataTableColumn[] = Array.from(
    container.querySelectorAll<HTMLTableCellElement>('th')
  ).map((th) => ({
    key: (th.dataset.key as string) ?? (th.dataset.sortKey as string),
    label: (th.textContent || '').trim(),
    align: th.classList.contains('dt-th--right')
      ? 'right'
      : th.classList.contains('dt-th--center')
        ? 'center'
        : undefined,
    sortable: th.hasAttribute('data-sort-key'),
  }));
  const colCount = container.querySelectorAll('th').length || 1;
  const pageSizeSelect = container.querySelector<HTMLSelectElement>('[data-page-size]');
  const showingEl = container.querySelector<HTMLElement>('[data-showing]');
  const numbersEl = container.querySelector<HTMLElement>('[data-pages]');
  const prevBtn = container.querySelector<HTMLButtonElement>('[data-prev]');
  const nextBtn = container.querySelector<HTMLButtonElement>('[data-next]');
  const footerEl = container.querySelector<HTMLElement>('[data-table-footer]');

  let rows: any[] = [];
  let meta: DataTableMeta = {};
  let page = 1;
  let pageSize = pageSizeSelect ? parseInt(pageSizeSelect.value, 10) || 25 : 25;
  let sortKey: string | null = null;
  let sortDirection: SortDirection = 'asc';
  let stateType: 'loading' | 'error' | null = null;
  let stateMessage = '';

  const serverMode = typeof options.onPageChange === 'function';

  function resolveTotal(): number {
    return serverMode ? (meta.total ?? rows.length) : rows.length;
  }

  function resolveTotalPages(): number {
    if (serverMode) {
      if (meta.totalPages) return meta.totalPages;
      return Math.max(1, Math.ceil((meta.total ?? rows.length) / pageSize));
    }
    return Math.max(1, Math.ceil(rows.length / pageSize));
  }

  function updateAriaSort() {
    container.querySelectorAll<HTMLTableCellElement>('th[data-sort-key]').forEach((th) => {
      if (th.dataset.sortKey === sortKey) {
        th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
        const btn = th.querySelector<HTMLButtonElement>('.dt-sort-btn');
        if (btn) btn.dataset.dir = sortDirection;
      } else {
        th.removeAttribute('aria-sort');
        const btn = th.querySelector<HTMLButtonElement>('.dt-sort-btn');
        if (btn) delete btn.dataset.dir;
      }
    });
  }

  function renderFooter() {
    if (!footerEl) return;
    const total = resolveTotal();
    const totalPages = resolveTotalPages();
    if (stateType || rows.length === 0 || totalPages <= 1) {
      footerEl.hidden = true;
      return;
    }
    footerEl.hidden = false;
    const buttons = buildPageRange(page, totalPages)
      .map((item) =>
        item === 'ellipsis'
          ? '<span class="dt-page-ellipsis" aria-hidden="true">…</span>'
          : `<button type="button" class="dt-page-btn" data-page="${item}" aria-label="Página ${item}"${item === page ? ' aria-current="page"' : ''}>${item}</button>`
      )
      .join('');
    if (numbersEl) numbersEl.innerHTML = buttons;
    if (showingEl) {
      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      showingEl.textContent = `Mostrando ${start}–${end} de ${total}`;
    }
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  function renderStateRow() {
    const action =
      stateType === null && options.emptyAction
        ? `<button type="button" class="dt-empty-action btn btn--primary btn--sm">${escapeHtml(options.emptyAction.label)}</button>`
        : '';
    if (tbody) {
      tbody.innerHTML = `<tr class="dt-state-row"><td colspan="${colCount}" class="empty-cell">${escapeHtml(stateMessage)}${action}</td></tr>`;
    }
    renderFooter();
  }

  function render() {
    if (!tbody) return;
    if (stateType) {
      renderStateRow();
      return;
    }
    if (rows.length === 0) {
      stateMessage = options.emptyMessage ?? 'No hay datos';
      renderStateRow();
      return;
    }
    const working = sortKey ? sortData(rows, sortKey, sortDirection) : rows;
    let pageRows: any[];
    if (serverMode) {
      pageRows = working;
    } else {
      const paginated = paginateData(working, page, pageSize);
      pageRows = paginated.pageRows;
      page = Math.min(Math.max(1, page), paginated.totalPages);
    }
    tbody.innerHTML = pageRows
      .map((row) => {
        const cells = columns
          .map(
            (col) =>
              `<td data-label="${col.label}"${col.align ? ` class="dt-cell--${col.align}"` : ''}>${options.renderCell(col, row)}</td>`
          )
          .join('');
        const suffix = options.renderRowSuffix ? options.renderRowSuffix(row) : '';
        return `<tr${options.rowClass ? ` class="${options.rowClass(row)}"` : ''}>${cells}</tr>${suffix}`;
      })
      .join('');
    renderFooter();
  }

  function goTo(targetPage: number) {
    page = targetPage;
    if (serverMode) {
      options.onPageChange?.(page);
    } else {
      render();
    }
  }

  function applySort(key: string) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
    updateAriaSort();
    if (!serverMode) page = 1;
    render();
  }

  container.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const pageBtn = target.closest<HTMLButtonElement>('[data-page]');
    if (pageBtn) {
      const targetPage = parseInt(pageBtn.dataset.page || '0', 10);
      if (targetPage >= 1 && targetPage !== page) goTo(targetPage);
      return;
    }
    const sortBtn = target.closest<HTMLButtonElement>('.dt-sort-btn');
    if (sortBtn) {
      const th = sortBtn.closest<HTMLTableCellElement>('th[data-sort-key]');
      if (th?.dataset.sortKey) applySort(th.dataset.sortKey);
      return;
    }
    if (target.closest('.dt-empty-action')) options.emptyAction?.onClick();
  });

  pageSizeSelect?.addEventListener('change', () => {
    pageSize = parseInt(pageSizeSelect.value, 10) || 25;
    page = 1;
    if (serverMode) {
      options.onPageSizeChange?.(pageSize);
    } else {
      render();
    }
  });

  prevBtn?.addEventListener('click', () => {
    if (page > 1) goTo(page - 1);
  });

  nextBtn?.addEventListener('click', () => {
    if (page < resolveTotalPages()) goTo(page + 1);
  });

  return {
    setRows(newRows: any[], newMeta: DataTableMeta = {}) {
      rows = newRows;
      meta = newMeta;
      stateType = null;
      stateMessage = '';
      const totalPages = resolveTotalPages();
      if (page > totalPages) page = totalPages;
      render();
    },
    setLoading(message = 'Cargando...') {
      stateType = 'loading';
      stateMessage = message;
      render();
    },
    setError(message: string) {
      stateType = 'error';
      stateMessage = message;
      render();
    },
  };
}
