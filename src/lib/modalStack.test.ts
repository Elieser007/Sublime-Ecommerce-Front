/**
 * Modal Stack Tests
 *
 * Unit tests for the vanilla JS modal stack: history annotation via
 * replaceState (no new history entry), push/pop/remove semantics, and the
 * ESC-close integration. No jsdom — history/window/document are mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as modalStack from "./modalStack";
import { wrapModal } from "./modalHelper";
import modalStackHandler from "./modalStackHandler";

let historyState: Record<string, unknown>;
let historyLength: number;
let replaceState: ReturnType<typeof vi.fn>;
let pushState: ReturnType<typeof vi.fn>;

beforeEach(() => {
  historyState = { page: "admin" };
  historyLength = 3;
  replaceState = vi.fn((state: Record<string, unknown>) => {
    historyState = { ...state };
  });
  pushState = vi.fn();
  vi.stubGlobal("history", {
    get state() {
      return historyState;
    },
    get length() {
      return historyLength;
    },
    replaceState,
    pushState,
  });
  modalStack.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── push() ────────────────────────────────────────────────

describe("push()", () => {
  it("annotates the current history entry without adding a new one", () => {
    const closeFn = vi.fn();
    const id = modalStack.push(closeFn);

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(historyState).toEqual(
      expect.objectContaining({ _modalOpen: true, _modalId: id, page: "admin" })
    );
    expect(pushState).not.toHaveBeenCalled();
    expect(historyLength).toBe(3);
  });

  it("increments the stack size and returns a unique id", () => {
    const a = modalStack.push(vi.fn());
    const b = modalStack.push(vi.fn());

    expect(a).not.toBe(b);
    expect(modalStack.size()).toBe(2);
    expect(modalStack.has(a)).toBe(true);
    expect(modalStack.has(b)).toBe(true);
  });
});

// ─── closeTop() ────────────────────────────────────────────

describe("closeTop()", () => {
  it("pops the top entry and calls its closeFn", () => {
    const first = vi.fn();
    const top = vi.fn();
    modalStack.push(first);
    modalStack.push(top);

    const closed = modalStack.closeTop();

    expect(closed).toBe(true);
    expect(top).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(modalStack.size()).toBe(1);
  });

  it("strips the modal annotation from history", () => {
    modalStack.push(vi.fn());
    expect(historyState._modalOpen).toBe(true);

    modalStack.closeTop();

    expect(historyState._modalOpen).toBe(false);
    expect(historyState._modalId).toBeUndefined();
  });

  it("returns false when the stack is empty", () => {
    expect(modalStack.closeTop()).toBe(false);
  });
});

// ─── remove() ──────────────────────────────────────────────

describe("remove()", () => {
  it("removes the entry from the stack by id", () => {
    const id = modalStack.push(vi.fn());
    modalStack.push(vi.fn());

    modalStack.remove(id);

    expect(modalStack.size()).toBe(1);
    expect(modalStack.has(id)).toBe(false);
  });

  it("is a no-op for unknown ids", () => {
    modalStack.push(vi.fn());
    modalStack.remove("nope");
    expect(modalStack.size()).toBe(1);
  });
});

// ─── clearHistoryAnnotation() ──────────────────────────────

describe("clearHistoryAnnotation()", () => {
  it("strips the annotation when present", () => {
    modalStack.push(vi.fn());
    modalStack.clear();
    expect(historyState._modalOpen).toBe(true);

    modalStack.clearHistoryAnnotation();

    expect(replaceState).toHaveBeenLastCalledWith(
      expect.objectContaining({ _modalOpen: false, _modalId: undefined }),
      ""
    );
    expect(historyState._modalOpen).toBe(false);
  });

  it("is a no-op when no annotation is present", () => {
    historyState = { page: "admin" };
    const callsBefore = replaceState.mock.calls.length;

    modalStack.clearHistoryAnnotation();

    expect(replaceState.mock.calls.length).toBe(callsBefore);
  });
});

// ─── ESC integration (modalStackHandler) ───────────────────

describe("modalStackHandler ESC", () => {
  it("closes the top modal on Escape keydown", () => {
    const listeners: Record<string, (e: any) => void> = {};
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: (e: any) => void) => {
        listeners[name] = fn;
      },
    });
    vi.stubGlobal("document", {
      readyState: "complete",
      addEventListener: vi.fn(),
    });

    modalStackHandler.init();

    const closeFn = vi.fn();
    modalStack.push(closeFn);
    expect(modalStack.size()).toBe(1);

    listeners["keydown"]({
      key: "Escape",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(modalStack.size()).toBe(0);
  });
});

// ─── wrapModal close() ─────────────────────────────────────

describe("wrapModal close()", () => {
  const overlay = { style: {} as Record<string, string> };

  beforeEach(() => {
    overlay.style = {};
    vi.stubGlobal("document", {
      getElementById: (id: string) => (id === "modal-overlay" ? overlay : null),
    });
  });

  it("fires onClose exactly once on a normal close", () => {
    const onClose = vi.fn();
    const modal = wrapModal("modal-overlay", { onClose });

    modal.open();
    modal.close();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(modal.isOpen()).toBe(false);
  });

  it("does not fire onClose twice when closed again after ESC", () => {
    const onClose = vi.fn();
    const modal = wrapModal("modal-overlay", { onClose });

    modal.open();
    expect(modal.isOpen()).toBe(true);

    // ESC path: closeTop() invokes the wrapped closeFn directly
    modalStack.closeTop();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(modal.isOpen()).toBe(false);

    // Manual close after ESC must not re-fire onClose
    modal.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
