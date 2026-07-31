/**
 * modalStackHandler.js — Global ESC listener for the modal stack
 *
 * Load ONCE in the root layout. Sets up:
 * - window keydown → ESC closes top modal
 *
 * No popstate listener: modals annotate the current history entry instead of
 * pushing new ones, so no popstate fires and Astro's ClientRouter never
 * re-renders. The browser back button keeps its normal navigation behavior.
 *
 * Integrates with Astro ClientRouter via astro:page-load.
 */

import * as modalStack from './modalStack.js';

let _initialized = false;

function onKeyDown(e) {
  if (e.key === 'Escape' && modalStack.size() > 0) {
    e.preventDefault();
    e.stopPropagation();
    modalStack.closeTop();
  }
}

function init() {
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

  // Clear stale stack entries on Astro client-side navigation
  document.addEventListener('astro:page-load', () => {
    modalStack.clear();
    modalStack.clearHistoryAnnotation();
    init();
  });
}

export default { init };
