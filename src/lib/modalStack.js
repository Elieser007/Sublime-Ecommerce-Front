/**
 * modalStack.js — Vanilla JS Modal Stack Manager
 *
 * Manages a stack of open modals with History API integration.
 * When a modal opens, it pushes a history entry so the browser back button
 * closes the modal instead of navigating away.
 *
 * Anti-cycle guard: prevents the popstate fired by manual history.back()
 * from closing another modal in the stack.
 */

const _entries = [];
let _idCounter = 0;
let _closeGuardCount = 0;

/**
 * Push a new modal onto the stack.
 * @param {Function} closeFn — callback to close this modal (called by back button)
 * @returns {string} modal ID
 */
export function push(closeFn) {
  const id = `modal-${++_idCounter}`;
  _entries.push({ id, closeFn });

  // Add a history entry so back button triggers popstate
  // Wrapped in try/catch for restricted environments (sandboxed iframes, private browsing)
  try {
    history.pushState({ _modalOpen: true, _modalId: id }, '');
  } catch {
    // History API unavailable — modal opens but back-button support is degraded
  }

  return id;
}

/**
 * Remove a modal from the stack by ID (used when closing manually).
 * Does NOT call history.back() — the caller handles that.
 * @param {string} id
 */
export function remove(id) {
  const idx = _entries.findIndex((e) => e.id === id);
  if (idx !== -1) _entries.splice(idx, 1);
}

/**
 * Close the topmost modal (called by popstate handler or ESC key).
 * @param {Object} [options]
 * @param {boolean} [options.fromPopState=true] — true when called from popstate (back button)
 * @returns {boolean} true if a modal was closed
 */
export function closeTop({ fromPopState = true } = {}) {
  if (_closeGuardCount > 0) {
    _closeGuardCount--;
    return false;
  }

  if (_entries.length === 0) return false;

  const top = _entries.pop();

  // Wrap closeFn in try/catch so one broken closeFn doesn't break the stack
  try {
    top.closeFn();
  } catch {
    // closeFn error — stack is already consistent (entry was popped)
  }

  return true;
}

/**
 * Begin a close guard — prevents the next popstate from closing a modal.
 * Used before manual history.back() to avoid double-close.
 * Protocol: call beginCloseGuard() → history.back() → setTimeout(endCloseGuard, 150)
 */
export function beginCloseGuard() {
  _closeGuardCount++;
}

/**
 * End a close guard (safety net timeout).
 * The 150ms value is a safety net: history.back() fires popstate synchronously
 * in modern browsers, so the guard is consumed before this timeout fires.
 * If popstate is delayed (heavy main-thread load), this prevents permanent guard lock.
 */
export function endCloseGuard() {
  if (_closeGuardCount > 0) _closeGuardCount--;
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
  _closeGuardCount = 0;
}

export default { push, remove, closeTop, beginCloseGuard, endCloseGuard, size, has, clear };
