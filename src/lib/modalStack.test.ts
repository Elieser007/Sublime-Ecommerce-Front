/**
 * Modal Stack Tests
 *
 * Unit tests for the vanilla JS modal stack: pushState-per-open history
 * entries (back-addressable), guarded history.back() on close with a suppress
 * counter, WebView containment, the popstate interceptor consumed-event
 * matrix, and head-hook ordering vs a ClientRouter-like listener. No jsdom —
 * history/window/document are mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as modalStack from "./modalStack";
import { wrapModal } from "./modalHelper";
import modalStackHandler from "./modalStackHandler";

let historyState: Record<string, unknown>;
let replaceState: ReturnType<typeof vi.fn>;
let pushState: ReturnType<typeof vi.fn>;
let back: ReturnType<typeof vi.fn>;

beforeEach(() => {
  historyState = { page: "admin" };
  replaceState = vi.fn((state: Record<string, unknown>) => {
    historyState = { ...state };
  });
  pushState = vi.fn();
  back = vi.fn();
  vi.stubGlobal("history", {
    get state() {
      return historyState;
    },
    get length() {
      return 3;
    },
    replaceState,
    pushState,
    back,
  });
  modalStack.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── push() ────────────────────────────────────────────────

describe("push()", () => {
  it("pushes a new history entry per open with the modal annotation", () => {
    const closeFn = vi.fn();
    const id = modalStack.push(closeFn);

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(
      expect.objectContaining({ _modalOpen: true, _modalId: id, page: "admin" }),
      ""
    );
    // pushState adds an entry; replaceState must not be used for opening
    expect(replaceState).not.toHaveBeenCalled();
    expect(modalStack.size()).toBe(1);
  });

  it("increments the stack size and returns a unique id", () => {
    const a = modalStack.push(vi.fn());
    const b = modalStack.push(vi.fn());

    expect(a).not.toBe(b);
    expect(pushState).toHaveBeenCalledTimes(2);
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

  it("pops the pushed history entry via a guarded history.back()", () => {
    modalStack.push(vi.fn());
    expect(back).not.toHaveBeenCalled();

    const closed = modalStack.closeTop();

    expect(closed).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("skips history.back() when skipPop is set (browser already popped)", () => {
    modalStack.push(vi.fn());

    const closed = modalStack.closeTop({ skipPop: true });

    expect(closed).toBe(true);
    expect(back).not.toHaveBeenCalled();
    expect(modalStack.size()).toBe(0);
  });

  it("returns false when the stack is empty", () => {
    expect(modalStack.closeTop()).toBe(false);
    expect(back).not.toHaveBeenCalled();
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
    historyState = { page: "admin", _modalOpen: true, _modalId: "modal-1" };

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

// ─── popHistoryEntry() / consumeSuppress() ─────────────────

describe("popHistoryEntry() / consumeSuppress()", () => {
  it("marks exactly one popstate as suppressible per popped entry", () => {
    modalStack.popHistoryEntry();
    expect(back).toHaveBeenCalledTimes(1);

    expect(modalStack.consumeSuppress()).toBe(true);
    expect(modalStack.consumeSuppress()).toBe(false);
  });

  it("accumulates for multiple in-flight pops and consumes them one by one", () => {
    modalStack.popHistoryEntry();
    modalStack.popHistoryEntry();
    expect(back).toHaveBeenCalledTimes(2);

    expect(modalStack.consumeSuppress()).toBe(true);
    expect(modalStack.consumeSuppress()).toBe(true);
    expect(modalStack.consumeSuppress()).toBe(false);
  });
});

// ─── WebView containment (MOD-BACK-6) ──────────────────────

describe("WebView containment (MOD-BACK-6)", () => {
  it("keeps the modal open when pushState throws", () => {
    pushState.mockImplementation(() => {
      throw new Error("pushState blocked");
    });

    expect(() => modalStack.push(vi.fn())).not.toThrow();
    // pushState was attempted — only its failure is contained
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(modalStack.size()).toBe(1);
  });

  it("keeps history.back() failures contained and does not leak suppression", () => {
    back.mockImplementation(() => {
      throw new Error("back blocked");
    });

    expect(() => modalStack.popHistoryEntry()).not.toThrow();
    // No popstate will follow a failed back() — nothing may be suppressed
    expect(modalStack.consumeSuppress()).toBe(false);
  });
});

// ─── ESC integration (modalStackHandler) ───────────────────

describe("modalStackHandler ESC", () => {
  it("closes the top modal and pops its history entry on Escape keydown", () => {
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
    expect(back).toHaveBeenCalledTimes(1);
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

// ─── modalStackHandler onPopState (MOD-BACK-3) ─────────────

describe("modalStackHandler onPopState", () => {
  it("closes the top modal and returns true when the stack is non-empty", () => {
    const closeFn = vi.fn();
    modalStack.push(closeFn);

    const consumed = modalStackHandler.onPopState({ state: {} });

    expect(consumed).toBe(true);
    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(modalStack.size()).toBe(0);
    // The browser already popped the entry — closeTop must not back() again
    expect(back).not.toHaveBeenCalled();
  });

  it("absorbs the popstate of an in-flight ESC close without closing anything extra", () => {
    const bottom = vi.fn();
    const top = vi.fn();
    modalStack.push(bottom);
    modalStack.push(top);

    // ESC path: closeTop() pops the top entry, runs its closeFn, and starts a
    // suppressed history.back() whose popstate has not arrived yet
    const closed = modalStack.closeTop();
    expect(closed).toBe(true);
    expect(top).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);

    // The delayed popstate from our own back() must be absorbed, not re-close
    const consumed = modalStackHandler.onPopState({ state: {} });

    expect(consumed).toBe(true);
    expect(bottom).not.toHaveBeenCalled();
    expect(modalStack.size()).toBe(1);
  });

  it("returns true for a leftover modal annotation with an empty stack", () => {
    const consumed = modalStackHandler.onPopState({
      state: { _modalOpen: true, _modalId: "modal-7" },
    });

    expect(consumed).toBe(true);
    expect(back).not.toHaveBeenCalled();
  });

  it("returns false when nothing is open and no annotation is present", () => {
    expect(modalStackHandler.onPopState({ state: { index: 0 } })).toBe(false);
    expect(modalStackHandler.onPopState({ state: null })).toBe(false);
  });
});

// ─── Head interceptor ordering + globals (MOD-BACK-3, D6) ──

/**
 * Dispatch a popstate to a listener list the way the browser does: a
 * stopImmediatePropagation() call prevents every LATER listener on the same
 * target from running.
 */
function dispatchPopstate(
  listeners: Array<(e: any) => void>,
  event: { state: unknown; stopImmediatePropagation: ReturnType<typeof vi.fn> }
) {
  for (const fn of listeners) {
    fn(event);
    if (event.stopImmediatePropagation.mock.calls.length > 0) break;
  }
}

/** Mirrors the BaseLayout head hook: delegate to ModalStackHandler, stop if consumed. */
function headHook(e: any) {
  const h = (window as any).ModalStackHandler;
  if (h && h.onPopState(e)) e.stopImmediatePropagation();
}

describe("head interceptor ordering (MOD-BACK-3)", () => {
  function stubWindowAndDocument() {
    const listeners: Record<string, Array<(e: any) => void>> = {};
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: (e: any) => void) => {
        (listeners[name] ??= []).push(fn);
      },
    });
    vi.stubGlobal("document", {
      readyState: "complete",
      addEventListener: (name: string, fn: (e: any) => void) => {
        (listeners[name] ??= []).push(fn);
      },
    });
    return listeners;
  }

  it("silences a ClientRouter-like listener when the popstate is consumed", () => {
    const listeners = stubWindowAndDocument();
    modalStackHandler.init();

    // The head hook registers FIRST (parse time, before the ClientRouter module)
    (listeners["popstate"] ??= []).unshift(headHook);
    const routerListener = vi.fn();
    listeners["popstate"].push(routerListener);

    const closeFn = vi.fn();
    modalStack.push(closeFn);
    const stopImmediatePropagation = vi.fn();

    dispatchPopstate(listeners["popstate"], { state: {}, stopImmediatePropagation });

    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(routerListener).not.toHaveBeenCalled();
  });

  it("lets the ClientRouter-like listener run when the popstate is not consumed", () => {
    const listeners = stubWindowAndDocument();
    modalStackHandler.init();

    (listeners["popstate"] ??= []).unshift(headHook);
    const routerListener = vi.fn();
    listeners["popstate"].push(routerListener);
    const stopImmediatePropagation = vi.fn();

    dispatchPopstate(listeners["popstate"], { state: { index: 0 }, stopImmediatePropagation });

    expect(routerListener).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).not.toHaveBeenCalled();
  });
});

// ─── window.ModalStack delegation + lifecycle (D6, MOD-BACK-6)

describe("window.ModalStack delegation and lifecycle", () => {
  it("exposes the stack API on window for inline scripts", () => {
    const listeners: Record<string, Array<(e: any) => void>> = {};
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: (e: any) => void) => {
        (listeners[name] ??= []).push(fn);
      },
    });
    vi.stubGlobal("document", { readyState: "complete", addEventListener: vi.fn() });

    modalStackHandler.init();

    const w = window as any;
    expect(typeof w.ModalStackHandler.onPopState).toBe("function");
    expect(w.ModalStackHandler.onPopState).toBe(modalStackHandler.onPopState);

    const closeFn = vi.fn();
    const id = w.ModalStack.open("filters", closeFn);
    expect(w.ModalStack.size()).toBe(1);
    expect(modalStack.has(id)).toBe(true);

    w.ModalStack.remove(id);
    expect(w.ModalStack.size()).toBe(0);

    w.ModalStack.open("category", closeFn);
    w.ModalStack.closeTop();
    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
    expect(w.ModalStack.size()).toBe(0);
  });

  it("clears stack, annotation, and suppress counter on astro:page-load", () => {
    const listeners: Record<string, Array<(e?: any) => void>> = {};
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: (e?: any) => void) => {
        (listeners[name] ??= []).push(fn);
      },
    });
    vi.stubGlobal("document", {
      readyState: "complete",
      addEventListener: (name: string, fn: (e?: any) => void) => {
        (listeners[name] ??= []).push(fn);
      },
    });

    modalStackHandler.init();

    modalStack.push(vi.fn());
    modalStack.popHistoryEntry(); // in-flight suppression must not leak across pages
    historyState = { page: "admin", _modalOpen: true, _modalId: "modal-1" };

    for (const fn of listeners["astro:page-load"] ?? []) fn();

    expect(modalStack.size()).toBe(0);
    expect(modalStack.consumeSuppress()).toBe(false);
    expect(historyState._modalOpen).toBe(false);
  });
});
