import { describe, it, expect } from "vitest";
import { escapeHtml, sanitizeUrl } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all special characters together", () => {
    expect(escapeHtml(`<img src="x" onerror="alert('&')">`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;&amp;&#39;)&quot;&gt;"
    );
  });

  it("returns empty string for null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("passes through safe strings unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles unicode correctly", () => {
    expect(escapeHtml("Ñoño café")).toBe("Ñoño café");
  });
});

describe("sanitizeUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("allows relative paths", () => {
    expect(sanitizeUrl("/products/producto-1")).toBe("/products/producto-1");
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBe("#");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert('xss')</script>")).toBe("#");
  });

  it("returns # for null", () => {
    expect(sanitizeUrl(null)).toBe("#");
  });

  it("returns # for empty string", () => {
    expect(sanitizeUrl("")).toBe("#");
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("blocks javascript: with internal spaces", () => {
    expect(sanitizeUrl("java script:alert('xss')")).toBe("#");
  });

  it("blocks javascript: with tabs", () => {
    expect(sanitizeUrl("java\tscript:alert('xss')")).toBe("#");
  });

  it("blocks javascript: with newlines", () => {
    expect(sanitizeUrl("java\nscript:alert('xss')")).toBe("#");
  });

  it("blocks j a v a s c r i p t: with mixed whitespace", () => {
    expect(sanitizeUrl("j a v a s c r i p t :alert('xss')")).toBe("#");
  });

  it("allows http with normal internal spaces in path", () => {
    expect(sanitizeUrl("https://example.com/path with spaces")).toBe("https://example.com/path with spaces");
  });
});
