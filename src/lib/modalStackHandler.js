/**
 * modalStackHandler.js — Global popstate + ESC listener for modal stack
 *
 * Load ONCE in the root layout. Sets up:
 * - window popstate → close top modal (back button behavior)
 * - window keydown  → ESC closes top modal + undoes history entry
 *
 * Integrates with Astro ClientRouter via astro:page-load.
 */

import * as modalStack from './modalStack.js';

let _initialized = false;

function onPopState() {
  if (modalStack.size() > 0) {
    modalStack.closeTop();
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape' && modalStack.size() > 0) {
    e.preventDefault();
    e.stopPropagation();
    modalStack.closeTop();

    // ESC closes the modal but doesn't undo the history entry pushed by open().
    // Call history.back() with a guard so the resulting popstate is absorbed.
    modalStack.beginCloseGuard();
    try {
      history.back();
    } catch {
      // History API unavailable — modal closed, history entry may linger
    }
    setTimeout(() => modalStack.endCloseGuard(), 150);
  }
}

function init() {
  if (_initialized) return;
  _initialized = true;
  window.addEventListener('popstate', onPopState);
  window.addEventListener('keydown', onKeyDown, true);
}

// Auto-init on first load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Clear stale stack entries on Astro client-side navigation
  document.addEventListener('astro:page-load', () => {
    modalStack.clear();
    init();
  });
}

export default { init };
