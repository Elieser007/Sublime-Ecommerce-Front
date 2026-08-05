/**
 * modalStack.js — Vanilla JS Modal Stack Manager
 *
 * Stateful singleton (module-level stack) — intentionally exempt from the
 * no-mutation convention for pure lib data transforms.
 * Each open pushes a NEW back-addressable history entry via pushState; each
 * close pops it with a guarded history.back(). A suppress counter absorbs the
 * popstate fired by our own back() (anti-cycle: the interceptor never closes a
 * second modal). All History calls are try/catch-contained for WebViews, and
 * clear() resets the counter so a ClientRouter swap cannot leak suppression.
 */

const _entries = [];
let _idCounter = 0;
let _suppressNext = 0;

// Only pushState creates a back-addressable entry; replaceState alone makes back do nothing
function pushAnnotatedEntry(id) {
  try {
    history.pushState({ ...history.state, _modalOpen: true, _modalId: id }, '');
  } catch {
    // History API unavailable — modal still opens, just without the entry
  }
}

// Leftover-entry defense: strip the annotation so the interceptor consumes the dead back press
export function clearHistoryAnnotation() {
  try {
    const state = history.state;
    if (state && (state._modalOpen || state._modalId)) {
      history.replaceState({ ...state, _modalOpen: false, _modalId: undefined }, '');
    }
  } catch {
    // History API unavailable
  }
}

export function push(closeFn) {
  const id = `modal-${++_idCounter}`;
  _entries.push({ id, closeFn });
  pushAnnotatedEntry(id);
  return id;
}

export function remove(id) {
  const idx = _entries.findIndex((e) => e.id === id);
  if (idx !== -1) _entries.splice(idx, 1);
}

// skipPop: true when the browser already popped the entry (popstate-driven close)
export function closeTop({ skipPop = false } = {}) {
  if (_entries.length === 0) return false;

  const top = _entries.pop();

  // Wrap closeFn in try/catch so one broken closeFn doesn't break the stack
  try {
    top.closeFn();
  } catch {
    // closeFn error — stack is already consistent (entry was popped)
  }

  if (!skipPop) popHistoryEntry();
  return true;
}

// Guarded back: the counter absorbs the popstate of our own back() (anti-cycle)
export function popHistoryEntry() {
  _suppressNext++;
  try {
    history.back();
  } catch {
    // History API unavailable — no popstate will follow, undo the suppression
    _suppressNext--;
  }
}

export function consumeSuppress() {
  if (_suppressNext > 0) {
    _suppressNext--;
    return true;
  }
  return false;
}

export function size() {
  return _entries.length;
}

export function has(id) {
  return _entries.some((e) => e.id === id);
}

// Used on Astro client-side navigation; also resets the counter so suppression cannot leak across pages
export function clear() {
  _entries.length = 0;
  _suppressNext = 0;
}

export default {
  push,
  remove,
  closeTop,
  popHistoryEntry,
  consumeSuppress,
  clearHistoryAnnotation,
  size,
  has,
  clear,
};
