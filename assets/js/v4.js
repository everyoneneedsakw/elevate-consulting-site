/* ════════════════════════════════════════════════════════════
   ELEVATE CONSULTING — V4 CINEMATIC DESIGN SYSTEM (behavior)
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Footer year ─────────────────────────────────────────── */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Mobile nav drawer ───────────────────────────────────── */
  var burger = document.getElementById('v4NavBurger');
  var drawer = document.getElementById('v4MobileDrawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        drawer.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Reveal-on-scroll ────────────────────────────────────── */
  var revealEls = document.querySelectorAll('.v4-reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ── Pause Motion control ────────────────────────────────── */
  var pauseBtn = document.getElementById('v4PauseMotion');
  var appRoot = document.querySelector('.v4');
  var motionPaused = false;

  function syncMotionState() {
    var paused = motionPaused || reducedMotionMQ.matches;
    if (appRoot) appRoot.classList.toggle('is-motion-paused', paused);
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-pressed', String(motionPaused));
      var label = pauseBtn.querySelector('.label');
      if (label) label.textContent = motionPaused ? 'Motion Paused' : 'Pause Motion';
    }
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      motionPaused = !motionPaused;
      syncMotionState();
    });
  }
  reducedMotionMQ.addEventListener('change', syncMotionState);
  syncMotionState();

  /* ── Orb choreography ────────────────────────────────────
     A single continuous path through the page, parameterized by
     scroll fraction p (0–1) — not discrete waypoints. Each of
     x(p), y(p), scale(p) is a smooth function (sine blends for
     position, a smoothstep dip-then-rise for scale), so there are
     no segment boundaries for direction to kink at and nothing to
     "restart" between sections. x sweeps once, generously, from
     one side to the other (verified: a single direction reversal,
     not a zigzag); y carries a smaller, differently-phased sweep
     so the combined path curves instead of traveling in a straight
     diagonal; scale dips mid-page and grows toward the finale,
     preserving the original composition's dramatic arc.
  ──────────────────────────────────────────────────────────── */
  var orbStage = document.getElementById('orbStage');
  if (orbStage) {
    function smoothstep(a, b, p) {
      var t = Math.max(0, Math.min(1, (p - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    // Scales sweep amplitude down on narrow viewports so the drift stays
    // balanced on mobile instead of spending most of the scroll off-screen.
    // body already has overflow-x:hidden, so this is about visual balance,
    // not preventing horizontal scroll (that's already structurally safe).
    function ampScale() {
      return Math.max(0.42, Math.min(1, window.innerWidth / 1440));
    }
    function xAt(p, amp) {
      return amp * (340 * Math.sin(2 * Math.PI * 0.68 * p) + 65 * Math.sin(2 * Math.PI * 1.8 * p));
    }
    function yAt(p, amp) {
      return amp * (-110 * Math.sin(2 * Math.PI * 0.52 * p) + 45 * Math.sin(2 * Math.PI * 1.35 * p));
    }
    function scaleAt(p) {
      if (p <= 0.42) return 1.0 - 0.42 * smoothstep(0, 0.42, p);
      return 0.58 + 0.72 * smoothstep(0.42, 1, p);
    }
    // The one place in the new curve where x crosses back near center —
    // the only point it'd visually cross over centered headline text.
    function inFrontZone(p) {
      return p >= 0.68 && p <= 0.84;
    }

    // Continuous rAF lerp, not a CSS transition: a fixed-duration CSS
    // transition re-starts on every scroll event, so fast or uneven
    // scrolling produces visible stutter as it keeps interrupting itself.
    // Instead we read the target position every frame and ease the
    // orb's *current* position toward it by a constant fraction — this
    // tracks scroll speed smoothly whether the page glides or jumps.
    var current = null; // null until first frame, so there's no snap-in from (0,0)
    var EASE = 0.065;
    var startTime = null;

    function frame(now) {
      requestAnimationFrame(frame);
      if (motionPaused || reducedMotionMQ.matches) return;
      if (startTime === null) startTime = now;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var p = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      var amp = ampScale();
      var target = { x: xAt(p, amp), y: yAt(p, amp), scale: scaleAt(p) };
      if (!current) current = { x: target.x, y: target.y, scale: target.scale };
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      current.scale += (target.scale - current.scale) * EASE;

      // Idle drift: a small, slow wobble layered on top of the settled
      // scroll position — same rAF loop and same output properties as
      // the scroll motion, so it's always in sync with it instead of
      // being a separate CSS keyframe running on its own clock. Driven
      // by elapsed time, not scroll, so it continues while the page is
      // still; secondary in amplitude to the main sweep (~10px vs. a
      // sweep spanning hundreds of px).
      var t = (now - startTime) / 1000;
      var idleX = 9 * Math.sin(t * 0.52);
      var idleY = 6 * Math.sin(t * 0.37 + 1.1);

      orbStage.style.setProperty('--orb-x', (current.x + idleX).toFixed(2));
      orbStage.style.setProperty('--orb-y', (current.y + idleY).toFixed(2));
      orbStage.style.setProperty('--orb-scale', current.scale.toFixed(3));
      orbStage.classList.toggle('is-front', inFrontZone(p));
    }
    requestAnimationFrame(frame);
  }

  /* Pointer parallax (desktop only, subtle, respects pause/reduced-motion).
     Independent of the scroll choreography above so pages that want a
     calmer, non-scroll-driven orb (e.g. About) can still get the subtle
     mouse response without opting into the full homepage waypoint sweep. */
  var orbPointer = document.getElementById('orbPointer');
  if (orbPointer && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      if (motionPaused || reducedMotionMQ.matches) return;
      var x = (e.clientX / window.innerWidth - 0.5) * 70;
      var y = (e.clientY / window.innerHeight - 0.5) * 55;
      orbPointer.style.setProperty('--ptr-x', x.toFixed(1));
      orbPointer.style.setProperty('--ptr-y', y.toFixed(1));
    }, { passive: true });
  }

  /* ── Work With Me inquiry form (Netlify Forms, AJAX) ─────────
     Static-site Netlify Forms needs no backend: POST the encoded
     body to "/" and Netlify's build-time form detection handles the
     rest. Submitting via fetch instead of a full page load lets us
     swap in an inline confirmation without a separate thank-you page. */
  var inquiryForm = document.getElementById('inquiry');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = inquiryForm.querySelector('button[type="submit"]');
      var status = document.getElementById('inquiryFormStatus');
      var confirmation = document.getElementById('inquiryFormConfirmation');
      var formData = new FormData(inquiryForm);

      submitBtn.disabled = true;
      submitBtn.textContent = submitBtn.getAttribute('data-label-sending') || 'Sending…';
      if (status) { status.textContent = ''; status.classList.remove('is-error'); }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      })
        .then(function (resp) {
          if (!resp.ok) throw new Error('Submission failed: ' + resp.status);
          inquiryForm.hidden = true;
          if (confirmation) confirmation.hidden = false;
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.getAttribute('data-label') || 'Send Inquiry';
          if (status) {
            status.textContent = 'Something went wrong — please try again, or email katie@everyoneneedsakatiewest.com directly.';
            status.classList.add('is-error');
          }
        });
    });
  }
})();
