/**
 * modalStackHandler.js — Global popstate interceptor + ESC listener
 *
 * Exposes window.ModalStackHandler/ModalStack for is:inline scripts (they
 * cannot import modules). onPopState(e) → true = consumed: the BaseLayout head
 * hook calls stopImmediatePropagation so Astro's ClientRouter never re-renders.
 * ESC pops the top modal AND its history entry (back parity); astro:page-load
 * clears stack + annotation + suppress counter.
 */

import * as modalStack from './modalStack.js';

let _initialized = false;
let _pageLoadDoc = null;

export function onPopState(e) {
  // Our own history.back() in flight — absorb, do not close anything
  if (modalStack.consumeSuppress()) return true;

  // Browser back with an open overlay: close the topmost; the browser already
  // popped the entry, so no back()
  if (modalStack.size() > 0) {
    modalStack.closeTop({ skipPop: true });
    return true;
  }

  // Leftover annotated entry after a hard nav: consume (one dead back press
  // instead of a spurious same-URL ClientRouter transition)
  if (e && e.state && e.state._modalOpen) return true;

  return false;
}

function onKeyDown(e) {
  if (e.key === 'Escape' && modalStack.size() > 0) {
    e.preventDefault();
    e.stopPropagation();
    // closeTop() pops the entry too — ESC keeps back parity
    modalStack.closeTop();
  }
}

function onPageLoad() {
  modalStack.clear();
  modalStack.clearHistoryAnnotation();
  init();
}

function init() {
  // Globals for inline scripts; re-set on every init so a post-swap
  // re-registration re-targets the current window
  window.ModalStackHandler = { onPopState };
  window.ModalStack = {
    open: (name, closeFn) => modalStack.push(closeFn),
    remove: modalStack.remove,
    closeTop: modalStack.closeTop,
    popHistoryEntry: modalStack.popHistoryEntry,
    size: modalStack.size,
  };

  // Once per document (idempotent like addEventListener); re-targets a fresh
  // document after a swap even when the module instance is reused
  if (document !== _pageLoadDoc) {
    _pageLoadDoc = document;
    document.addEventListener('astro:page-load', onPageLoad);
  }

  if (_initialized) return;
  _initialized = true;

  window.addEventListener('keydown', onKeyDown, true);
}

// Auto-init on first load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export default { init, onPopState };
