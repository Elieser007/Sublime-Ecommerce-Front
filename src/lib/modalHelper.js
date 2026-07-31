/**
 * modalHelper.js — Drop-in wrapper to add back-button support to any modal
 *
 * Usage:
 *   import { wrapModal } from '../lib/modalHelper.js';
 *   const { open, close } = wrapModal('modal-overlay');
 *
 *   openModal()  → shows overlay + pushes history entry
 *   closeModal() → hides overlay + pops history entry (with anti-cycle guard)
 *
 * The 150ms endCloseGuard timeout is a safety net: history.back() fires popstate
 * synchronously in modern browsers, so the guard is consumed before the timeout.
 * If popstate is delayed (heavy main-thread load), the timeout prevents permanent
 * guard lock that would block all subsequent modal closes.
 */

import * as modalStack from './modalStack.js';

/**
 * Wrap a modal overlay element with stack-aware open/close.
 * @param {string} overlayId — DOM id of the overlay element
 * @param {Object} [options]
 * @param {Function} [options.onClose] — additional callback when modal is closed (via back button or manually)
 * @returns {{ open: Function, close: Function, isOpen: Function }}
 */
export function wrapModal(overlayId, options = {}) {
  let stackId = null;
  const getOverlay = () => document.getElementById(overlayId);

  function open() {
    // Double-open guard: if already open, don't push another entry
    if (stackId !== null) return;

    const overlay = getOverlay();
    if (!overlay) return;
    overlay.style.display = '';

    // Push to stack (the push() already calls history.pushState)
    stackId = modalStack.push(() => {
      // This is called by closeTop() when back button is pressed
      overlay.style.display = 'none';
      stackId = null;
      if (options.onClose) options.onClose();
    });
  }

  function close() {
    const overlay = getOverlay();
    if (!overlay) return;

    // Hide overlay
    overlay.style.display = 'none';

    // Remove from stack and undo history entry
    if (stackId) {
      modalStack.remove(stackId);
      stackId = null;

      // Undo the history entry pushed by open()
      modalStack.beginCloseGuard();
      try {
        history.back();
      } catch {
        // History API unavailable — modal closed, history entry may linger
      }
      setTimeout(() => modalStack.endCloseGuard(), 150);
    }

    if (options.onClose) options.onClose();
  }

  function isOpen() {
    return stackId !== null;
  }

  return { open, close, isOpen };
}
