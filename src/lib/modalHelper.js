/**
 * modalHelper.js — Drop-in wrapper to add stack-aware open/close to any modal
 *
 * Usage:
 *   import { wrapModal } from '../lib/modalHelper.js';
 *   const { open, close } = wrapModal('modal-overlay');
 *
 *   openModal()  → shows overlay + pushes a back-addressable history entry
 *   closeModal() → hides overlay + pops exactly its own entry (guarded
 *                  history.back() absorbed by the suppress counter)
 *
 * Each open pushes a NEW history entry (pushState); each manual close pops it
 * so the browser back button behaves as if the overlay was never opened.
 * ESC/back closes go through modalStack.closeTop(), whose closeFn is a pure
 * hide — closeTop() owns the history pop, so there is never a double-pop.
 * show/hide overrides let class-toggled overlays (mobile drawers) reuse this
 * wrapper instead of a display-only implementation.
 */

import * as modalStack from './modalStack.js';

/**
 * Wrap a modal overlay element with stack-aware open/close.
 * @param {string} overlayId — DOM id of the overlay element
 * @param {Object} [options]
 * @param {Function} [options.onClose] — additional callback when modal is closed
 * @param {Function} [options.show] — custom show handler (default: style.display = '')
 * @param {Function} [options.hide] — custom hide handler (default: style.display = 'none')
 * @returns {{ open: Function, close: Function, isOpen: Function }}
 */
export function wrapModal(overlayId, options = {}) {
  let stackId = null;
  const { show, hide, onClose } = options;
  const getOverlay = () => document.getElementById(overlayId);

  function hideOverlay(overlay) {
    if (hide) hide(overlay);
    else overlay.style.display = 'none';
  }

  function showOverlay(overlay) {
    if (show) show(overlay);
    else overlay.style.display = '';
  }

  function open() {
    // Double-open guard: if already open, don't push another entry
    if (stackId !== null) return;

    const overlay = getOverlay();
    if (!overlay) return;
    showOverlay(overlay);

    // Push a PURE-HIDE closeFn: ESC/back close via closeTop(), which owns the
    // history pop — the closeFn must never call back() itself (D3)
    stackId = modalStack.push(() => {
      hideOverlay(overlay);
      stackId = null;
      if (onClose) onClose();
    });
  }

  function close() {
    // No-op when not open: ESC/back already closed it via closeTop()
    if (!stackId) return;

    const overlay = getOverlay();
    if (!overlay) return;

    hideOverlay(overlay);

    // Manual close (X/backdrop): remove from stack and pop exactly this
    // entry so back afterwards navigates normally (MOD-BACK-1)
    modalStack.remove(stackId);
    stackId = null;
    modalStack.popHistoryEntry();
    if (onClose) onClose();
  }

  function isOpen() {
    return stackId !== null;
  }

  return { open, close, isOpen };
}
