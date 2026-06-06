/* ============================================================
   ELEVATE CONSULTING — script.js
   Production JS for GitHub Pages deployment
   Version: 1.0 | Build: Phase 1
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   1. NAV — Sticky scroll shadow + mobile hamburger
   ──────────────────────────────────────────────────────────── */
(function initNav() {
  const nav       = document.getElementById('site-nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');
  const body      = document.body;

  if (!nav) return;

  // Scroll shadow
  let lastScroll = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 60);
    lastScroll = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  // Hamburger toggle
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      body.style.overflow = isOpen ? 'hidden' : '';
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (
        mobileNav.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on mobile link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        body.style.overflow = '';
      });
    });
  }
})();

/* ────────────────────────────────────────────────────────────
   2. ECOSYSTEM HUB TABS
   ──────────────────────────────────────────────────────────── */
(function initEcoTabs() {
  const tabs    = document.querySelectorAll('.eco__tab:not(.eco__tab--disabled)');
  const panels  = document.querySelectorAll('.eco__panel');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.hidden = true);
      tab.classList.add('active');
      const panel = document.getElementById('eco-panel-' + target);
      if (panel) panel.hidden = false;
    });
  });
})();

/* ────────────────────────────────────────────────────────────
   3. SCROLL-TRIGGERED FADE-IN (lightweight, no deps)
   ──────────────────────────────────────────────────────────── */
(function initScrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  els.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${i * 0.07}s`);
    observer.observe(el);
  });
})();

