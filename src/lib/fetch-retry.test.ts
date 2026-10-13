/**
 * fetch-retry — bounded-retry JSON fetch.
 *
 * fetchJsonWithRetry fetches JSON with N attempts, a per-attempt
 * AbortController timeout, and a backoff delay between attempts. Every
 * attempt failure (network rejection, non-ok status, JSON parse error,
 * timeout abort) is retried until one succeeds or the budget is spent; on
 * exhaustion it throws an Error naming the endpoint and the attempt count.
 * The parsed body is returned untouched so the CALLER decides what an empty
 * payload means (the catalog tree treats empty as fail-loud, promotions
 * treat empty as degrade-with-warning).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchJsonWithRetry } from "./fetch-retry";

const URL = "https://api.example.com/api/public/categories/tree";

// Response-shaped stub — the helper checks res.ok before res.json().
const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const badResponse = (status: number) => ({
  ok: false,
  status,
  json: async () => ({ error: `status ${status}` }),
});

describe("fetchJsonWithRetry", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on the first attempt", async () => {
    const fetchFn = vi.fn(async () => okResponse({ tree: [{ slug: "a" }] }));
    const delayFn = vi.fn(async () => undefined);

    const body = await fetchJsonWithRetry<{ tree: unknown[] }>(URL, {
      attempts: 3,
      timeoutMs: 1000,
      backoffMs: 50,
      fetchFn: fetchFn as unknown as typeof fetch,
      delayFn,
    });

    expect(body).toEqual({ tree: [{ slug: "a" }] });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(delayFn).not.toHaveBeenCalled();
  });

  it("succeeds after a failure", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValueOnce(okResponse({ tree: [] }));
    const delayFn = vi.fn(async () => undefined);

    const body = await fetchJsonWithRetry(URL, {
      attempts: 3,
      timeoutMs: 1000,
      backoffMs: 50,
      fetchFn: fetchFn as unknown as typeof fetch,
      delayFn,
    });

    expect(body).toEqual({ tree: [] });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(delayFn).toHaveBeenCalledTimes(1);
  });

  it("throws with the endpoint in the message when attempts are exhausted", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("connection refused");
    });

    await expect(
      fetchJsonWithRetry(URL, {
        attempts: 3,
        timeoutMs: 1000,
        backoffMs: 0,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toThrow(/api\/public\/categories\/tree/);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("names the attempt count in the exhaustion message", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("boom");
    });

    const err = await fetchJsonWithRetry(URL, {
      attempts: 4,
      timeoutMs: 1000,
      backoffMs: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
    }).catch((e) => e as Error);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/4 attempts/);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it("retries non-ok responses and throws when they never succeed", async () => {
    const fetchFn = vi.fn(async () => badResponse(500));

    await expect(
      fetchJsonWithRetry(URL, {
        attempts: 3,
        timeoutMs: 1000,
        backoffMs: 0,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toThrow(/api\/public\/categories\/tree/);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("recovers when a non-ok response is followed by success", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(badResponse(500))
      .mockResolvedValueOnce(okResponse({ promotions: [] }));
    const delayFn = vi.fn(async () => undefined);

    const body = await fetchJsonWithRetry(URL, {
      attempts: 3,
      timeoutMs: 1000,
      backoffMs: 50,
      fetchFn: fetchFn as unknown as typeof fetch,
      delayFn,
    });

    expect(body).toEqual({ promotions: [] });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("times out a hung attempt via AbortController and exhausts loudly", async () => {
    // Never settles unless aborted — mirrors a hung backend; the helper's
    // per-attempt AbortController must abort it so the budget is spent
    // instead of hanging the build.
    const fetchFn = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );

    const err = await fetchJsonWithRetry(URL, {
      attempts: 2,
      timeoutMs: 20,
      backoffMs: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
    }).catch((e) => e as Error);

    expect(err.message).toMatch(/api\/public\/categories\/tree/);
    expect(err.message).toMatch(/2 attempts/);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("calls onRetry after each failed attempt that will be retried", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first fails"))
      .mockRejectedValueOnce(new Error("second fails"))
      .mockResolvedValueOnce(okResponse({ ok: true }));
    const onRetry = vi.fn();

    await fetchJsonWithRetry(URL, {
      attempts: 5,
      timeoutMs: 1000,
      backoffMs: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
      onRetry,
    });

    // Two failures before the success: one hook call per retried failure,
    // each naming the endpoint, the attempt, and the budget.
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, {
      url: URL,
      attempt: 1,
      attempts: 5,
      error: expect.any(Error),
    });
    expect(onRetry).toHaveBeenNthCalledWith(2, {
      url: URL,
      attempt: 2,
      attempts: 5,
      error: expect.any(Error),
    });
  });

  it("never calls onRetry when the first attempt succeeds", async () => {
    const fetchFn = vi.fn(async () => okResponse({ ok: true }));
    const onRetry = vi.fn();

    await fetchJsonWithRetry(URL, {
      attempts: 3,
      timeoutMs: 1000,
      backoffMs: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
      onRetry,
    });

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("a throwing onRetry never breaks the retry loop", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first fails"))
      .mockResolvedValueOnce(okResponse({ recovered: true }));

    const body = await fetchJsonWithRetry(URL, {
      attempts: 3,
      timeoutMs: 1000,
      backoffMs: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
      onRetry: () => {
        throw new Error("logging broke");
      },
    });

    expect(body).toEqual({ recovered: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("stops retrying as soon as one attempt succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first fails"))
      .mockRejectedValueOnce(new Error("second fails"))
      .mockResolvedValueOnce(okResponse({ ok: true }));
    const delayFn = vi.fn(async () => undefined);

    const body = await fetchJsonWithRetry(URL, {
      attempts: 5,
      timeoutMs: 1000,
      backoffMs: 10,
      fetchFn: fetchFn as unknown as typeof fetch,
      delayFn,
    });

    expect(body).toEqual({ ok: true });
    // Two failures then success: exactly 3 calls out of a budget of 5, and
    // one backoff delay per failed attempt (never after the success).
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(delayFn).toHaveBeenCalledTimes(2);
  });
});
