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
    function ampScale(viewportWidth) {
      return Math.max(0.42, Math.min(1, viewportWidth / 1440));
    }

    // Cached layout reads, recomputed on resize/load — not on every rAF
    // frame. Traced this loop under a real scroll (Chrome's
    // UpdateLayoutTree / IntersectionObserverController::computeIntersections
    // events) and found a style-and-layout pass firing TWICE per animation
    // frame, not once: reading scrollHeight/innerHeight here every frame
    // means that whenever anything else in the same frame (the reveal
    // IntersectionObserver's own rendering-step check) leaves layout
    // dirty, this read forces a second, redundant layout pass — pure
    // wasted frame-budget on every single frame of scroll, which is
    // exactly the kind of cost that shows up as stutter under real load.
    // Caching removes that read from the hot path entirely. It also
    // closes a second, real issue specific to phones: window.innerHeight
    // tracks the VISUAL viewport, which shrinks and grows as the
    // browser's URL bar collapses mid-scroll — recomputing the scroll
    // fraction's denominator every frame against a moving target
    // produces exactly the kind of snap/jump she's describing. A cached
    // value, refreshed only on resize/orientation change, stays stable
    // for the duration of a scroll gesture.
    var cachedScrollable = 0;
    var cachedAmp = 1;
    function recomputeLayoutCache() {
      var doc = document.documentElement;
      cachedScrollable = doc.scrollHeight - window.innerHeight;
      cachedAmp = ampScale(window.innerWidth);
    }
    recomputeLayoutCache();
    window.addEventListener('resize', recomputeLayoutCache);
    window.addEventListener('orientationchange', recomputeLayoutCache);
    window.addEventListener('load', recomputeLayoutCache);
    // Redesigned path. The previous curve (two summed sines for x, a
    // 2-piece scale dip/rise) looked fine as a static plot but had a real,
    // measured problem: traced the actual rendered transform every frame
    // during a realistic momentum-scroll (MutationObserver on orbStage's
    // style attribute, not a synthetic linear scrollTo) and found single-
    // frame position jumps up to 16x the median frame-to-frame distance,
    // concentrated at one narrow scroll band. The cause, confirmed by
    // sampling dx/dp and dscale/dp by hand: a sine's steepest point is
    // always at its zero-crossing, so the old x(p) was moving fastest
    // exactly where it crossed center — and the scale dip/rise's own
    // steepest point (a smoothstep's max slope is at its transition's
    // midpoint, by construction) landed at almost the same scroll
    // fraction (~0.71) as that crossing AND as the is-front z-index
    // flip. Three compounding, simultaneous sharp changes in one narrow
    // band is what read as "abrupt" — not a performance problem (traced
    // frame timing separately: median 16.7ms/frame, 60fps, only a
    // handful of frames over budget even under a hard flick) and not an
    // easing-constant problem (the lerp was correctly smoothing toward a
    // target that itself was moving in a burst).
    //
    // This version: a single smoothstep-based sweep for x (not summed
    // sines), so there's one broad, legible right-to-left traverse
    // across most of the page's sections with a gentler curve-back near
    // the finale — per the brief: start right, sweep left over several
    // sections, curve back naturally. Scale's dip and rise are
    // retimed so their steepest points (~p=0.14 and ~p=0.56-0.66) fall
    // well clear of x's two peaks (~p=0.37 and ~p=0.85), instead of
    // stacking on top of them.
    function xAt(p, amp) {
      var sweep = smoothstep(0.05, 0.70, p);
      var curveBack = smoothstep(0.70, 1, p);
      return amp * (280 - 540 * sweep + 320 * curveBack);
    }
    function yAt(p, amp) {
      return amp * (-70 * Math.sin(2 * Math.PI * 0.55 * p) + 24 * Math.sin(2 * Math.PI * 1.3 * p));
    }
    function scaleAt(p) {
      if (p <= 0.28) return 1.0 - 0.36 * smoothstep(0, 0.28, p);
      return 0.64 + 0.66 * smoothstep(0.28, 0.85, p);
    }
    // Where x actually crosses center (~p=0.38 for this curve) — the
    // only point the orb would visually cross over centered headline
    // text. Narrower than the old zone, and no longer coincides with
    // scale's steepest point (see above).
    function inFrontZone(p) {
      return p >= 0.33 && p <= 0.45;
    }

    // Continuous rAF lerp, not a CSS transition: a fixed-duration CSS
    // transition re-starts on every scroll event, so fast or uneven
    // scrolling produces visible stutter as it keeps interrupting itself.
    // Instead we read the target position every frame and ease the
    // orb's *current* position toward it.
    //
    // Two fixes from the first pass, both found by inspecting this loop
    // rather than by adding easing:
    //
    // 1. The catch-up used a fixed fraction *per frame* (current +=
    //    (target-current)*EASE). That's frame-rate dependent: the same
    //    constant converges roughly twice as fast on a 120Hz phone as on
    //    a 60Hz one, and if the browser drops frames under load (the
    //    scroll-reveal IntersectionObserver firing, a section painting),
    //    the catch-up visibly speeds and slows with the frame rate
    //    instead of gliding at a constant real-world pace. Replaced with
    //    exponential smoothing on a real half-life in seconds
    //    (1 - 0.5^(dt/HALF_LIFE)), which converges at the same rate
    //    regardless of refresh rate or dropped frames.
    // 2. The position was written to --orb-x/--orb-y/--orb-scale, CSS
    //    custom properties. Custom properties inherit, so updating them
    //    forces a style recalculation on every descendant of orbStage
    //    (orb-pointer, orb-idle, orb, orb::after) every single frame —
    //    not just a cheap compositor-only transform update. Writing
    //    el.style.transform directly only touches this element.
    var current = null; // null until first frame, so there's no snap-in from (0,0)
    // Brought back down from 0.3s: that half-life made the orb keep
    // drifting for over a second after scrolling stopped, which read as
    // a prolonged catch-up rather than a graceful settle. 0.16s still
    // smooths out per-frame scroll jitter (no 1:1 scroll-locked snap)
    // but resolves to target quickly enough that stopping reads as a
    // stop, not a lingering drift — and it retraces identically on the
    // way back up, since position is a pure function of scroll fraction.
    var HALF_LIFE = 0.16;
    var lastTime = null;
    var idleClock = 0;

    function frame(now) {
      requestAnimationFrame(frame);
      if (motionPaused || reducedMotionMQ.matches) { lastTime = null; return; }
      if (lastTime === null) lastTime = now; // avoids a huge dt on resume/first frame
      var dt = Math.min((now - lastTime) / 1000, 0.1); // clamp: tab switches, long tasks
      lastTime = now;
      var p = cachedScrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / cachedScrollable)) : 0;
      var target = { x: xAt(p, cachedAmp), y: yAt(p, cachedAmp), scale: scaleAt(p) };
      if (!current) current = { x: target.x, y: target.y, scale: target.scale };
      var k = 1 - Math.pow(0.5, dt / HALF_LIFE);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      current.scale += (target.scale - current.scale) * k;

      // Idle drift: a small, slow wobble layered on top of the settled
      // scroll position — same loop, same output, so it's always in sync
      // with the scroll motion instead of being a separate CSS keyframe
      // running on its own clock. Driven by elapsed time, not scroll, so
      // it continues while the page is still; secondary in amplitude to
      // the main sweep (~10px vs. a sweep spanning hundreds of px).
      idleClock += dt;
      var idleX = 9 * Math.sin(idleClock * 0.52);
      var idleY = 6 * Math.sin(idleClock * 0.37 + 1.1);

      orbStage.style.transform =
        'translate3d(' + (current.x + idleX).toFixed(2) + 'px,' +
        (current.y + idleY).toFixed(2) + 'px,0) scale(' + current.scale.toFixed(3) + ')';
      orbStage.classList.toggle('is-front', inFrontZone(p));
    }
    requestAnimationFrame(frame);
  }

  /* Pointer parallax (desktop only, subtle, respects pause/reduced-motion).
     Independent of the scroll choreography above so pages that want a
     calmer, non-scroll-driven orb (e.g. About) can still get the subtle
     mouse response without opting into the full homepage waypoint sweep.
     Writes transform directly (not a custom property) for the same
     reason as the scroll loop above — this element has its own
     descendants (orb-idle, orb) that would otherwise recalc on every
     pointermove. The easing itself stays in CSS (.orb-pointer's existing
     transition), since this is a sparse event handler, not a per-frame
     loop — no frame-rate-dependence concern here. */
  var orbPointer = document.getElementById('orbPointer');
  if (orbPointer && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      if (motionPaused || reducedMotionMQ.matches) return;
      var x = (e.clientX / window.innerWidth - 0.5) * 70;
      var y = (e.clientY / window.innerHeight - 0.5) * 55;
      orbPointer.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
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
