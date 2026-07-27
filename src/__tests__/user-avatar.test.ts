/**
 * User Avatar Helpers Tests — TDD
 *
 * Tests for user-avatar.ts pure functions:
 * - State creation and manipulation
 * - Avatar state transitions (empty → blob, empty → url, clear)
 * - Preview URL generation
 */

import { describe, it, expect } from "vitest";
import {
  createEmptyAvatarState,
  hasAvatar,
  setAvatarFromBlob,
  setAvatarFromUrl,
  clearAvatar,
  getAvatarPreviewUrl,
  type AvatarState,
} from "../lib/user-avatar";

describe("createEmptyAvatarState", () => {
  it("returns empty state with all nulls", () => {
    const state = createEmptyAvatarState();
    expect(state.blob).toBeNull();
    expect(state.url).toBeNull();
    expect(state.isNew).toBe(false);
  });
});

describe("hasAvatar", () => {
  it("returns false for empty state", () => {
    expect(hasAvatar(createEmptyAvatarState())).toBe(false);
  });

  it("returns true when blob is set", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setAvatarFromBlob(createEmptyAvatarState(), blob);
    expect(hasAvatar(state)).toBe(true);
  });

  it("returns true when url is set", () => {
    const state = setAvatarFromUrl(createEmptyAvatarState(), "https://cdn.example.com/avatar.webp");
    expect(hasAvatar(state)).toBe(true);
  });
});

describe("setAvatarFromBlob", () => {
  it("sets blob and marks as new", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setAvatarFromBlob(createEmptyAvatarState(), blob);
    expect(state.blob).toBe(blob);
    expect(state.url).toBeNull();
    expect(state.isNew).toBe(true);
  });
});

describe("setAvatarFromUrl", () => {
  it("sets url, marks as not new", () => {
    const state = setAvatarFromUrl(createEmptyAvatarState(), "https://cdn.example.com/avatar.webp");
    expect(state.url).toBe("https://cdn.example.com/avatar.webp");
    expect(state.blob).toBeNull();
    expect(state.isNew).toBe(false);
  });
});

describe("clearAvatar", () => {
  it("resets to empty state", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    let state = setAvatarFromBlob(createEmptyAvatarState(), blob);
    state = setAvatarFromUrl(state, "https://cdn.webp");
    const cleared = clearAvatar(state);
    expect(cleared.blob).toBeNull();
    expect(cleared.url).toBeNull();
    expect(cleared.isNew).toBe(false);
  });
});

describe("getAvatarPreviewUrl", () => {
  it("returns null for empty state", () => {
    expect(getAvatarPreviewUrl(createEmptyAvatarState())).toBeNull();
  });

  it("returns object URL for blob state", () => {
    const blob = new Blob(["test"], { type: "image/webp" });
    const state = setAvatarFromBlob(createEmptyAvatarState(), blob);
    const url = getAvatarPreviewUrl(state);
    expect(url).toBeTruthy();
    expect(url?.startsWith("blob:")).toBe(true);
  });

  it("returns stored URL for existing avatar", () => {
    const state = setAvatarFromUrl(createEmptyAvatarState(), "https://cdn.example.com/avatar.webp");
    expect(getAvatarPreviewUrl(state)).toBe("https://cdn.example.com/avatar.webp");
  });
});
