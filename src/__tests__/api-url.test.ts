import { describe, it, expect, vi, afterEach } from "vitest";
import { getApiUrl } from "../lib/api-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiUrl", () => {
  it("falls back to localhost in development when PUBLIC_API_URL is missing", () => {
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.stubEnv("PROD", false);
    expect(getApiUrl()).toBe("http://localhost:8787");
  });

  it("returns the configured PUBLIC_API_URL and strips trailing slashes", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.sublimepy.store/");
    vi.stubEnv("PROD", true);
    expect(getApiUrl()).toBe("https://api.sublimepy.store");
  });

  it("throws in production when PUBLIC_API_URL is missing", () => {
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.stubEnv("PROD", true);
    expect(() => getApiUrl()).toThrow(/PUBLIC_API_URL/);
  });
});
