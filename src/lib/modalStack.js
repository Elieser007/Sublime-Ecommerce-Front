/**
 * modalStack.js — Vanilla JS Modal Stack Manager
 *
 * Manages a stack of open modals.
 * Opening a modal annotates the CURRENT history entry via replaceState — no new
 * entry is added, so no popstate fires and Astro's ClientRouter never re-renders.
 */

const _entries = [];
let _idCounter = 0;

/**
 * Annotate the current history entry with the modal-open marker.
 * replaceState does not add an entry, so no popstate event is fired.
 * @param {string} id
 */
function annotateHistory(id) {
  try {
    history.replaceState({ ...history.state, _modalOpen: true, _modalId: id }, '');
  } catch {
    // History API unavailable — modal still opens, just without the annotation
  }
}

/**
 * Strip the modal-open annotation from the current history entry.
 * No-op if the annotation is absent.
 */
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

/**
 * Push a new modal onto the stack.
 * @param {Function} closeFn — callback to close this modal (called by ESC key)
 * @returns {string} modal ID
 */
export function push(closeFn) {
  const id = `modal-${++_idCounter}`;
  _entries.push({ id, closeFn });
  annotateHistory(id);
  return id;
}

/**
 * Remove a modal from the stack by ID (used when closing manually).
 * @param {string} id
 */
export function remove(id) {
  const idx = _entries.findIndex((e) => e.id === id);
  if (idx !== -1) _entries.splice(idx, 1);
}

/**
 * Close the topmost modal (called by ESC key handler).
 * @returns {boolean} true if a modal was closed
 */
export function closeTop() {
  if (_entries.length === 0) return false;

  const top = _entries.pop();
  clearHistoryAnnotation();

  // Wrap closeFn in try/catch so one broken closeFn doesn't break the stack
  try {
    top.closeFn();
  } catch {
    // closeFn error — stack is already consistent (entry was popped)
  }

  return true;
}

/**
 * Number of modals currently in the stack.
 */
export function size() {
  return _entries.length;
}

/**
 * Check if a specific modal is in the stack.
 * @param {string} id
 */
export function has(id) {
  return _entries.some((e) => e.id === id);
}

/**
 * Clear all entries. Used on Astro client-side navigation to prevent
 * stale entries from previous pages.
 */
export function clear() {
  _entries.length = 0;
}

export default { push, remove, closeTop, clearHistoryAnnotation, size, has, clear };
