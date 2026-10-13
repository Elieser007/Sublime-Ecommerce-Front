export interface FetchRetryOptions {
  attempts?: number;
  timeoutMs?: number;
  backoffMs?: number;
  onRetry?: (info: {
    url: string;
    attempt: number;
    attempts: number;
    error: unknown;
  }) => void;
  fetchFn?: (url: string, init?: RequestInit) => Promise<Response>;
  delayFn?: (ms: number) => Promise<void>;
}

const defaultDelay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJsonWithRetry<T>(
  url: string,
  opts: FetchRetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, Math.floor(opts.attempts ?? 3));
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const backoffMs = opts.backoffMs ?? 500;
  const fetchFn =
    opts.fetchFn ?? ((u: string, init?: RequestInit) => globalThis.fetch(u, init));
  const delayFn = opts.delayFn ?? defaultDelay;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(
          `request to ${url} responded with status ${res.status}`
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        try {
          opts.onRetry?.({ url, attempt, attempts, error: err });
        } catch {
          void 0;
        }
        if (backoffMs > 0) {
          await delayFn(backoffMs * 2 ** (attempt - 1));
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const cause = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Failed to fetch ${url} after ${attempts} attempts: ${cause}`
  );
}
