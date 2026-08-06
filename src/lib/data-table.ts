export type SortDirection = 'asc' | 'desc';
export type PageRangeItem = number | 'ellipsis';

export interface PaginateResult<T> {
  pageRows: T[];
  totalPages: number;
  start: number;
  end: number;
}

export function paginateData<T>(rows: T[], page: number, pageSize: number): PaginateResult<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);

  const startIndex = (current - 1) * size;
  const pageRows = rows.slice(startIndex, startIndex + size);
  const start = total === 0 ? 0 : startIndex + 1;
  const end = Math.min(startIndex + size, total);

  return { pageRows, totalPages, start, end };
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es');
}

export function sortData<T>(
  rows: T[],
  key: string,
  direction: SortDirection,
  getValue?: (row: T) => unknown
): T[] {
  const get = getValue ?? ((row: T) => (row as Record<string, unknown>)[key]);
  const factor = direction === 'asc' ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((a, b) => {
      const aNull = isNullish(a.value);
      const bNull = isNullish(b.value);
      if (aNull || bNull) return aNull && bNull ? a.index - b.index : aNull ? 1 : -1;
      const cmp = compareValues(a.value, b.value);
      return cmp !== 0 ? cmp * factor : a.index - b.index;
    })
    .map((entry) => entry.row);
}

export function buildPageRange(
  current: number,
  totalPages: number,
  maxButtons = 7
): PageRangeItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const currentPage = Math.min(Math.max(1, Math.floor(current)), total);
  const max = Math.max(5, Math.floor(maxButtons));

  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor((max - 4) / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > total) {
    start -= end - total;
    end = total;
    if (start < 1) start = 1;
  }

  const range: PageRangeItem[] = [];
  if (start > 1) range.push(1);
  if (start > 2) range.push('ellipsis');
  for (let i = start; i <= end; i++) range.push(i);
  if (end < total - 1) range.push('ellipsis');
  if (end < total) range.push(total);
  return range;
}
