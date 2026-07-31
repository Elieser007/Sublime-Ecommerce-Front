/**
 * modalHelper.js — Drop-in wrapper to add stack-aware open/close to any modal
 *
 * Usage:
 *   import { wrapModal } from '../lib/modalHelper.js';
 *   const { open, close } = wrapModal('modal-overlay');
 *
 *   openModal()  → shows overlay + annotates the current history entry
 *   closeModal() → hides overlay + strips the history annotation
 *
 * No history entries are pushed or popped: history.back()/go()/forward() are
 * never called, so Astro's ClientRouter never re-renders the page.
 */

import * as modalStack from './modalStack.js';

/**
 * Wrap a modal overlay element with stack-aware open/close.
 * @param {string} overlayId — DOM id of the overlay element
 * @param {Object} [options]
 * @param {Function} [options.onClose] — additional callback when modal is closed
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

    // Push to stack (push() annotates the current history entry)
    stackId = modalStack.push(() => {
      // This is called by closeTop() when ESC closes the modal
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

    // Remove from stack and strip the history annotation set by open()
    if (stackId) {
      modalStack.remove(stackId);
      stackId = null;
      modalStack.clearHistoryAnnotation();
      if (options.onClose) options.onClose();
    }
  }

  function isOpen() {
    return stackId !== null;
  }

  return { open, close, isOpen };
}
