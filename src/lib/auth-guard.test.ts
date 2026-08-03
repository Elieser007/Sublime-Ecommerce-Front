/**
 * Auth Guard Tests — requireAuth (existing behavior) + requireAdminAuth (D10).
 *
 * requireAuth: redirects to /login only on 401 or network failure.
 * requireAdminAuth: additionally redirects non-admin sessions to /login.
 * UI polish only — SSG HTML is public; the API enforces the real boundary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

function stubBrowser() {
  const location = { href: "" };
  vi.stubGlobal("window", { location });
  vi.stubGlobal("fetch", mockFetch);
  return location;
}

function meResponse(status: number, body: unknown) {
  return { status, json: async () => body };
}

import { requireAuth, requireAdminAuth } from "./auth-guard";

describe("requireAuth (existing behavior, approval)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("redirects to /login and fails when /api/me answers 401", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(401, { error: "Unauthorized" }));

    const ok = await requireAuth();

    expect(ok).toBe(false);
    expect(location.href).toBe("/login");
  });

  it("passes when /api/me answers 200 regardless of role", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(200, { user: { role: "client" } }));

    const ok = await requireAuth();

    expect(ok).toBe(true);
    expect(location.href).toBe("");
  });
});

describe("requireAdminAuth", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls GET /api/me with credentials", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(200, { user: { role: "admin" } }));

    await requireAdminAuth();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/me"),
      expect.objectContaining({ credentials: "include" })
    );
    expect(location.href).toBe("");
  });

  it("redirects to /login and fails when the session role is client", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(200, { user: { role: "client" } }));

    const ok = await requireAdminAuth();

    expect(ok).toBe(false);
    expect(location.href).toBe("/login");
  });

  it("redirects to /login and fails when /api/me answers 401 (no session)", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(401, { error: "Unauthorized" }));

    const ok = await requireAdminAuth();

    expect(ok).toBe(false);
    expect(location.href).toBe("/login");
  });

  it("passes when the session role is admin", async () => {
    const location = stubBrowser();
    mockFetch.mockResolvedValueOnce(meResponse(200, { user: { role: "admin" } }));

    const ok = await requireAdminAuth();

    expect(ok).toBe(true);
    expect(location.href).toBe("");
  });

  it("redirects to /login and fails on network error", async () => {
    const location = stubBrowser();
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const ok = await requireAdminAuth();

    expect(ok).toBe(false);
    expect(location.href).toBe("/login");
  });
});
