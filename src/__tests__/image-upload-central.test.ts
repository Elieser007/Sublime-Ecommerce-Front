import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveApiUrl, uploadImageBlob, uploadAndAssociate, deleteUploadedFile } from "../lib/image-utils";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("centralized image upload", () => {
  it("resolveApiUrl prefers the explicit argument, else getApiUrl", () => {
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.stubEnv("PROD", false);
    expect(resolveApiUrl("https://api.example.com")).toBe("https://api.example.com");
    expect(resolveApiUrl(undefined)).toBe("http://localhost:8787");
  });

  it("uploadImageBlob uploads a WebP File to /api/upload and returns the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example.com/a.webp" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const blob = new Blob(["x"], { type: "image/webp" });
    const result = await uploadImageBlob(blob, "photo.JPG", "https://api.example.com");

    expect(result.url).toBe("https://cdn.example.com/a.webp");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.example.com/api/upload");
    const body = init.body as FormData;
    const file = body.get("image") as File;
    expect(file.name).toBe("photo.webp");
    expect(file.type).toBe("image/webp");
  });

  it("uploadAndAssociate uploads then associates with options", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: any) => {
      if (String(url).includes("/api/upload")) {
        return { ok: true, json: async () => ({ url: "https://cdn.example.com/x.webp" }) };
      }
      if (String(url).includes("/api/products/p1/images")) {
        return { ok: true, json: async () => ({ id: "img1", url: "https://cdn.example.com/x.webp" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const image = await uploadAndAssociate(
      "products",
      "p1",
      new Blob(["x"]),
      "a.png",
      "https://api.example.com",
      { is_primary: 0, sort_order: 3 }
    );

    expect(image.id).toBe("img1");
    const postBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(postBody.url).toBe("https://cdn.example.com/x.webp");
    expect(postBody.sort_order).toBe(3);
    expect(postBody.is_primary).toBe(0);
  });

  it("deleteUploadedFile is best-effort and does not throw on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(deleteUploadedFile("a.webp", "https://api.example.com")).resolves.toBeUndefined();
  });
});
