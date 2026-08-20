/* ============================================
   LUCKY DIAGNOSTICS — PROMO AD + CALLBACK MODAL
   Desktop only • once per session
   ============================================ */
(function () {
  'use strict';

  function isDesktop() {
    return window.matchMedia('(min-width: 900px)').matches;
  }

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {

    /* ---------- 1) Promo side ad (shows after 5s) ---------- */
    var ad = document.getElementById('promoAd');
    var adClose = document.getElementById('promoClose');

    if (ad && adClose) {
      adClose.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        ad.classList.remove('show');
      });

      if (!sessionStorage.getItem('ld_promo_shown')) {
        setTimeout(function () {
          if (!isDesktop()) return;
          ad.classList.add('show');
          sessionStorage.setItem('ld_promo_shown', '1');
        }, 5000);
      }
    }

    /* ---------- 2) Callback modal (shows after 15s) ---------- */
    var cb = document.getElementById('callbackModal');
    var cbClose = document.getElementById('cbClose');

    if (cb && cbClose) {
      cbClose.addEventListener('click', function () {
        cb.classList.remove('show');
      });

      // Close when clicking outside the box
      cb.addEventListener('click', function (e) {
        if (e.target === cb) cb.classList.remove('show');
      });

      if (!sessionStorage.getItem('ld_callback_shown')) {
        setTimeout(function () {
          if (!isDesktop()) return;
          cb.classList.add('show');
          sessionStorage.setItem('ld_callback_shown', '1');
        }, 15000);
      }
    }
  });
})();