/*
 * ATRIA visual comparison pilot.
 * Explicit URL opt-in only. No changes to chat delivery, clinical simulation,
 * player permissions or game state. Unknown query values leave baseline intact.
 */
(function () {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('atria-ui');
  if (requested !== 'immersive' && requested !== 'tactical') return;
  document.documentElement.setAttribute('data-atria-ui', requested);
  window.__ATRIA_VISUAL_LAB__ = Object.freeze({
    variant: requested,
    source: 'atria-4.8.7-ux-comparison'
  });
})();
