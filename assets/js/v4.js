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
     Waypoints are fractions of total scrollable distance (0–1).
     Position/scale are interpolated between the two nearest
     waypoints; "front" zones define when the orb passes in
     front of the headline text instead of staying behind it.
     Clustering waypoints tightly = a "still" moment; spacing
     them apart = a "cinematic" movement beat — this is what
     produces the motion/stillness rhythm without extra state.
  ──────────────────────────────────────────────────────────── */
  var orbStage = document.getElementById('orbStage');
  if (orbStage) {
    var waypoints = [
      { p: 0.00, x: 0,    y: 0,   scale: 1.00 },  // hero — original composition, behind headline
      { p: 0.06, x: 0,    y: 0,   scale: 1.00 },  // still: let the hero breathe before it moves
      { p: 0.14, x: -60,  y: -140, scale: 0.72 }, // cinematic: sweeps up and left, crosses in FRONT
      { p: 0.22, x: -340, y: -40,  scale: 0.55 }, // still: settles beside "LESS CHAOS. MORE CONTROL."
      { p: 0.33, x: -340, y: -40,  scale: 0.55 }, // still (hold)
      { p: 0.46, x: 260,  y: 60,   scale: 0.85 }, // cinematic: drifts right through services
      { p: 0.55, x: 260,  y: 60,   scale: 0.85 }, // still (hold)
      { p: 0.66, x: -200, y: 120,  scale: 0.95 }, // cinematic: crosses back left, crosses in FRONT
      { p: 0.74, x: -200, y: 120,  scale: 0.95 }, // still: beside the method steps
      { p: 0.88, x: 40,   y: 40,   scale: 1.25 }, // cinematic: grows toward the finale
      { p: 1.00, x: 40,   y: 80,   scale: 1.30 }, // still: settles behind "READY TO ELEVATE?"
    ];
    var frontZones = [[0.10, 0.18], [0.62, 0.70]];

    function inFrontZone(p) {
      for (var i = 0; i < frontZones.length; i++) {
        if (p >= frontZones[i][0] && p <= frontZones[i][1]) return true;
      }
      return false;
    }

    function interpolate(p) {
      for (var i = 0; i < waypoints.length - 1; i++) {
        var a = waypoints[i], b = waypoints[i + 1];
        if (p >= a.p && p <= b.p) {
          var span = b.p - a.p;
          var t = span === 0 ? 0 : (p - a.p) / span;
          // ease-in-out for a more cinematic, less mechanical sweep
          t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            scale: a.scale + (b.scale - a.scale) * t,
          };
        }
      }
      var last = waypoints[waypoints.length - 1];
      return { x: last.x, y: last.y, scale: last.scale };
    }

    // Continuous rAF lerp, not a CSS transition: a fixed-duration CSS
    // transition re-starts on every scroll event, so fast or uneven
    // scrolling produces visible stutter as it keeps interrupting itself.
    // Instead we read the target position every frame and ease the
    // orb's *current* position toward it by a constant fraction — this
    // tracks scroll speed smoothly whether the page glides or jumps.
    var current = null; // null until first frame, so there's no snap-in from (0,0)
    var EASE = 0.08;

    function frame() {
      requestAnimationFrame(frame);
      if (motionPaused || reducedMotionMQ.matches) return;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var p = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      var target = interpolate(p);
      if (!current) current = { x: target.x, y: target.y, scale: target.scale };
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      current.scale += (target.scale - current.scale) * EASE;
      orbStage.style.setProperty('--orb-x', current.x.toFixed(2));
      orbStage.style.setProperty('--orb-y', current.y.toFixed(2));
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
})();
