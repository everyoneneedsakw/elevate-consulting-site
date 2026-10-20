/* ════════════════════════════════════════════════════════════
   ELEVATE — CLIENT DISCOVERY APPLICATION
   /discovery/ — direct-link only, not in nav, noindex.

   The 27 questions (copy, type, required/optional, options) are
   defined here as data rather than in content/pages/discovery.yml
   like the rest of the site's copy. Two reasons: they're structural
   (each has a type, validation rule, and — for 11 of them — a fixed
   option list) in a way flat YAML->token substitution doesn't model
   well, and the brief is explicit that this copy needs sign-off
   before changing, which a hand-reviewed JS block makes easier to
   diff than a template with 27 interdependent {{tokens}}. The
   welcome/confirmation screens ARE plain YAML-editable copy (see
   content/pages/discovery.yml + the JSON island in the template)
   since those are ordinary prose with no structure to encode.

   RENDERING MODEL — why text fields never trigger a full re-render:
   the previous version re-rendered the whole screen's innerHTML on
   every keystroke (the 'input' event), including text/email fields.
   That destroyed and recreated the live DOM node on every character,
   which broke typing in practice: the email field is autocomplete-
   tagged, so the browser re-evaluates autofill against the freshly
   created node on every keystroke, and the manual cursor-restore
   logic always snapped the caret to the end of the value, breaking
   mid-string edits. The fix is architectural, not a patch: typing
   into a text/email/tel/textarea field now ONLY updates state and a
   few small, targeted chrome elements (progress bar, Continue
   enablement) directly — it never touches the input's own DOM node,
   so native browser behavior (cursor, selection, undo, autofill,
   IME composition, paste, dictation) is preserved for free, because
   the node is simply never destroyed. A full screen re-render still
   happens for checkbox/radio changes (discrete clicks, not typing),
   where it's needed to keep max-selection disabling, exclusive-
   option disabling, and "Other" write-in reveal all correct.

   PHASE 1 (this build): full visual app, client-side validation,
   same-device localStorage draft saving, draft migration from the
   prior 22-question schema. Submission is a disabled preview — see
   handleSubmit() — until backend delivery is approved, connected,
   and tested end to end on a real deploy).
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var FORM_VERSION = '2.0.0';
  var STORAGE_KEY = 'elevate_discovery_draft_v1';
  var AUTOSAVE_DEBOUNCE_MS = 600;
  var BACKEND_CONNECTED = true; // wired to netlify/functions/discovery-submit.mjs — see handleSubmit()

  var reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Question schema ─────────────────────────────────────── */
  // type: 'text' | 'email' | 'tel' | 'textarea' | 'single' | 'multi'
  // multi options may include the literal string 'Other' at the exact
  // position it should render — picking it reveals a write-in input
  // right there, keyed to otherField. exclusiveOptions: picking one of
  // these clears every other selection in the same question (and vice
  // versa); max: caps how many may be selected at once, independent of
  // exclusiveOptions (no question in this schema uses both).
  var SCREENS = [
    {
      title: 'About You',
      questions: [
        { id: 'applicant_name', qNum: 1, type: 'text', required: true,
          label: "What's your first and last name?" },
        { id: 'applicant_email', qNum: 2, type: 'email', required: true,
          label: 'What’s your email address?',
          helper: 'So we can stay in touch about your application. No newsletters or marketing emails.' },
        { id: 'applicant_phone', qNum: 3, type: 'tel', required: false,
          label: "What's the best phone number to reach you?" }
      ]
    },
    {
      title: 'Your Business',
      questions: [
        { id: 'business_name', qNum: 4, type: 'text', required: true,
          label: "What's your business or brand name?",
          helper: "If you're still developing it, share your ideas, or let us know you're still working on it." },
        { id: 'business_description', qNum: 5, type: 'textarea', required: true,
          label: 'Tell us about your business. What do you do, and who do you help?',
          helper: "Do you provide a service, sell products, or have something you'd like to offer? Share how you'd describe it when someone asks what you do." },
        { id: 'industry_types', qNum: 6, type: 'multi', required: true,
          label: 'What industry or type of work best describes your business?',
          helperNote: 'Select all that apply.',
          options: [
            'Real Estate', 'Roofing & Home Services', 'Beauty & Wellness',
            'Professional Services', 'Coaching & Consulting',
            'Content & Creative Work', 'Retail & Products', 'Other',
            'Still Figuring It Out'
          ],
          allowOther: true, otherField: 'industry_types_other' }
      ]
    },
    {
      title: 'How Things Run Today',
      questions: [
        { id: 'business_support', qNum: 7, type: 'multi', required: true,
          label: 'Who currently supports the day-to-day work in your business?',
          helperNote: 'Select all that apply.',
          options: [
            'I Manage Everything Myself', 'An Assistant', 'A Team of 2–5 People',
            'A Team of 6 or More People', 'Contractors or Outside Specialists', 'Other'
          ],
          allowOther: true, otherField: 'business_support_other',
          exclusiveOptions: ['I Manage Everything Myself'] },
        { id: 'online_presence', qNum: 8, type: 'textarea', required: false,
          label: 'Where can we find you online?',
          helper: "Share your website, social media profiles, or booking link. If you haven't created them yet, tell us what you'd like to put in place." }
      ]
    },
    {
      title: 'The Vision',
      questions: [
        { id: 'vision_6_12_months', qNum: 9, type: 'textarea', required: true,
          label: 'What would you love to create or accomplish in your business over the next 6–12 months?',
          helper: 'Think about growth, income, more freedom, or a day-to-day that feels calm. What would that look like for you? Be specific.' },
        { id: 'vision_ideas', qNum: 10, type: 'textarea', required: false,
          label: "Is there something you've been wanting to create, offer, or do differently in your business?",
          helper: "Share what you have in mind, even if you're still working through the details." }
      ]
    },
    {
      title: 'What We Can Build On',
      questions: [
        { id: 'goals_90_days', qNum: 11, type: 'textarea', required: true,
          label: 'What are your top three priorities for the next 90 days?',
          helper: "What would you most like to move forward or get into place? If there's only one priority, start there." },
        { id: 'strengths', qNum: 12, type: 'textarea', required: false,
          label: 'What do you consider your greatest strengths, and what’s working well in your business today?',
          helper: "Think about what comes naturally to you, what people seek your help with, or what you're proud of." }
      ]
    },
    {
      title: 'What Needs Attention',
      questions: [
        { id: 'challenges_time_energy', qNum: 13, type: 'textarea', required: true,
          label: "What's taking up too much of your time, energy, or headspace in your business?",
          helper: 'Think about a recent day. What felt harder than it should? Where did you get stuck, repeat a task, or have to keep track of too many details?' },
        { id: 'challenges_one_fix', qNum: 14, type: 'textarea', required: true,
          label: 'If we could focus on one improvement first, what would make the biggest difference in your business?',
          helper: "What would that allow you to do that you're struggling to do today?" }
      ]
    },
    {
      title: 'Behind the Scenes',
      questions: [
        { id: 'sales_process', qNum: 15, type: 'textarea', required: true,
          label: 'How does someone go from finding your business to becoming a client or customer?',
          helper: "Walk us through how they contact you, book a service or make a purchase, and pay. If you're still putting this together, share what you have in place so far." },
        { id: 'client_tracking', qNum: 16, type: 'textarea', required: true,
          label: 'How do you currently keep track of your clients, their preferences, and your follow-up?',
          helper: "Do you use your iPhone, notes, a CRM, an email contact list, or something else to store contact information, service or purchase history, and details you want to remember? If you don't have a system yet, no worries. We'll figure that out." },
        { id: 'tools_in_use', qNum: 17, type: 'textarea', required: false,
          label: 'What tools or apps do you currently use to manage your business?',
          helper: 'Include anything you use for scheduling, payments, email, client records, content, or daily tasks. If you don’t use any yet, simply write "none yet."' }
      ]
    },
    {
      title: "What's Missing",
      questions: [
        { id: 'info_gaps', qNum: 18, type: 'textarea', required: false,
          label: 'What information do you find yourself searching for, trying to remember, or asking for again?',
          helper: 'What would you like to have organized and easy to find?' },
        { id: 'client_experience_goal', qNum: 19, type: 'textarea', required: false,
          label: 'What would you love your clients or customers to experience when they work with you?',
          helper: "From the first conversation to what happens afterward, what would you like to be known for? Use your words." }
      ]
    },
    {
      title: "Where You'd Like Support",
      questions: [
        { id: 'support_areas', qNum: 20, type: 'multi', required: true, max: 3,
          label: 'Which areas of your business would you like support with?',
          helperNote: 'Choose up to three priorities.',
          options: [
            'Business Direction & Priorities', 'Developing or Launching an Offer',
            'Marketing, Content & Visibility', 'Inquiries, Booking & Follow-Up',
            'Client Information & Organization', 'Client Experience & Retention',
            'Daily Operations & Processes', 'Delegation & Team Support',
            'Tools & Technology', 'Automation & AI', 'Accountability & Follow-Through',
            "I'd Like Your Recommendation", 'Other'
          ],
          allowOther: true, otherField: 'support_areas_other' },
        { id: 'support_preference_detail', qNum: 21, type: 'textarea', required: true,
          label: "What would you most value having support with that you don't have today?",
          helper: "Think about the decisions, ideas, or responsibilities you'd like help navigating. What would that support make possible for you?" }
      ]
    },
    {
      title: 'Before We Move Forward',
      questions: [
        { id: 'barriers', qNum: 22, type: 'multi', required: false,
          label: 'Is there anything that might make it difficult to move forward with support right now?',
          helperNote: 'Select all that apply.',
          options: [
            'Budget or Financial Priorities', 'Time or Current Commitments',
            'Uncertainty About What I Need', 'Understanding the Value Before Investing',
            "A Previous Experience That Didn't Meet My Expectations",
            'Involving Someone Else in the Decision', "Nothing Right Now, I'm Ready to Explore",
            'Other', "I'd Prefer to Discuss This Together"
          ],
          allowOther: true, otherField: 'barriers_other',
          exclusiveOptions: ["Nothing Right Now, I'm Ready to Explore"] },
        { id: 'budget_thoughts', qNum: 23, type: 'textarea', required: false,
          label: 'Have you considered a budget for the support or improvements you’re looking for?',
          helper: "Share a range you're comfortable considering, or let us know if you'd like to understand the options and pricing first." }
      ]
    },
    {
      title: 'Working Together',
      questions: [
        { id: 'follow_through_style', qNum: 24, type: 'textarea', required: false,
          label: 'When you have an idea or goals you want to move forward, what helps you follow through?',
          helper: 'Talking it out, seeing examples, mapping out a timeline and a clear plan, or someone checking in? Tell us what works for you.' },
        { id: 'timeline', qNum: 25, type: 'multi', required: true,
          label: 'What timeline do you have in mind for getting started?',
          helperNote: "Select all that apply. If we've already discussed a start date or you have a specific deadline, share it below.",
          options: [
            "We've Already Spoken, and I'm Completing This Before We Get Started",
            'Today, if Available', 'Within the Next Two Weeks', 'Within the Next Month',
            'Within the Next Three Months', 'My Timing Is Flexible'
          ] },
        { id: 'timeline_context', qNum: 25, type: 'textarea', required: false,
          label: 'Any specific date or context you’d like to share about your timing?',
          isFollowUp: true },
        { id: 'reach_out_reason', qNum: 26, type: 'textarea', required: false,
          label: 'What prompted you to reach out?',
          helper: "Something you're excited to pursue, a change coming up, or a challenge you're ready to address? Tell us what brought you here." }
      ]
    },
    {
      title: 'Anything Else?',
      questions: [
        { id: 'anything_else', qNum: 27, type: 'textarea', required: false,
          label: 'What else would you like us to know?',
          helper: "About your business, your ideas, or anything happening in your life that you'd like us to understand. You're welcome to share what's on your mind, just as it comes to you." }
      ]
    }
  ];

  var ALL_QUESTIONS = [];
  SCREENS.forEach(function (s) { s.questions.forEach(function (q) { ALL_QUESTIONS.push(q); }); });
  var QUESTIONS_BY_ID = {};
  ALL_QUESTIONS.forEach(function (q) { QUESTIONS_BY_ID[q.id] = q; });

  var TOTAL_CONTENT_SCREENS = SCREENS.length; // 12

  /* ── Draft migration from the prior 22-question schema (v1) ──
     Only field IDs with an unchanged question meaning are carried
     forward automatically. Fields whose question changed meaning,
     type, or option set are deliberately left for the person to
     re-answer, with a plain-language notice rather than a silent
     guess. See the comments beside each dropped field below. */
  var FIELD_MIGRATION_MAP = {
    applicant_name: 'applicant_name',
    applicant_email: 'applicant_email',
    applicant_phone: 'applicant_phone',
    business_name: 'business_name',
    business_description: 'business_description',
    industry_types: 'industry_types',
    industry_types_other: 'industry_types_other',
    online_presence: 'online_presence',
    vision_6_12_months: 'vision_6_12_months',
    vision_ideas: 'vision_ideas',
    goals_90_days: 'goals_90_days',
    strengths: 'strengths',
    challenges_time_energy: 'challenges_time_energy',
    challenges_one_fix: 'challenges_one_fix',
    sales_process: 'sales_process',
    client_tracking: 'client_tracking',
    tools_in_use: 'tools_in_use',
    // "what helps it click and keeps you going" -> "what helps you follow
    // through": same underlying intent, re-worded. A judgment call, not a
    // verbatim match -- surfaced in the migration notice for review.
    motivation_style: 'follow_through_style',
    // the old optional "is there something making this feel like the
    // right time" maps onto the new timeline free-text context field.
    timeline_reason: 'timeline_context'
    // Deliberately NOT migrated:
    //   team_structure    -- became business_support: different question,
    //                         different type (single -> multi), different
    //                         option set. No safe automatic mapping.
    //   support_areas     -- same field id kept, but see below: old values
    //                         are filtered against the NEW option list,
    //                         since the categories were renamed.
    //   support_style     -- explicitly replaced in meaning by Q21
    //                         (support_preference_detail). Per instruction,
    //                         never mapped onto the new question.
    //   timeline           -- option set and single->multi changed; no
    //                         safe automatic mapping.
  };

  function migrateDraft(oldDraft) {
    var oldAnswers = oldDraft.answers || {};
    var newAnswers = {};
    var notes = [];

    Object.keys(FIELD_MIGRATION_MAP).forEach(function (oldId) {
      var v = oldAnswers[oldId];
      if (v !== undefined && !answerIsBlank(v)) {
        newAnswers[FIELD_MIGRATION_MAP[oldId]] = v;
      }
    });

    if (Array.isArray(oldAnswers.industry_types) && oldAnswers.industry_types.length) {
      var industryQ = QUESTIONS_BY_ID.industry_types;
      var validOptions = industryQ.options.concat(industryQ.extraOptions || []);
      var kept = oldAnswers.industry_types.filter(function (v) { return validOptions.indexOf(v) !== -1; });
      if (kept.length) newAnswers.industry_types = kept;
      if (kept.length !== oldAnswers.industry_types.length) {
        notes.push('Your business-type selections used our previous category names — please double-check "Your Business."');
      }
    }

    if (oldAnswers.team_structure) {
      notes.push('The question about who supports your day-to-day work has changed — please answer it again in "How Things Run Today."');
    }
    if (oldAnswers.support_areas) {
      notes.push('The support-area categories have changed — please re-check "Where You\'d Like Support."');
    }
    if (oldAnswers.support_style) {
      notes.push('The question about what support looks like for you has changed — please answer it again in "Where You\'d Like Support."');
    }
    if (oldAnswers.timeline) {
      notes.push('The timeline choices have changed — please re-select your timing in "Working Together."');
    }

    return {
      applicationId: oldDraft.applicationId,
      createdAt: oldDraft.createdAt,
      formVersion: FORM_VERSION,
      status: 'draft',
      answers: newAnswers,
      currentScreen: 1,
      furthestScreenReached: 0,
      savedAt: oldDraft.savedAt,
      migrationNotes: notes
    };
  }

  /* ── Copy (YAML-editable, via the template's JSON island) ───── */
  var COPY = (function () {
    var fallback = {
      welcome: {
        title: "Let's Talk About Your Business",
        intro1: "Tell us about your business, the ideas you're excited about, and where you could use some support. We want to understand what you're working toward and what would make a difference for you.",
        intro2: "You don't need to have everything figured out. Share your thoughts in your own words, whether you have a clear vision or are still exploring what's next. This gives us a place to begin our conversation.",
        savingNote: 'Your answers save automatically on this device as you go, so you can step away and come back later on this same browser.',
        startButton: "Let's Get Into It"
      },
      confirmation: {
        title: "Thank you. We've received your application.",
        body: "We appreciate you sharing your ideas, goals, and where you could use support. Our team will review your answers and follow up with you about next steps."
      }
    };
    var el = document.getElementById('discoveryCopy');
    if (!el) return fallback;
    try {
      var parsed = JSON.parse(el.textContent);
      if (!parsed.welcome || !parsed.confirmation) return fallback;
      return parsed;
    } catch (e) {
      return fallback;
    }
  })();

  /* ── State ──────────────────────────────────────────────── */
  var state = {
    applicationId: null,
    createdAt: null,
    formVersion: FORM_VERSION,
    status: 'draft',
    answers: {},
    currentScreen: 0,
    furthestScreenReached: 0,
    cameFromReview: false,
    migrationNotes: null,
    submitting: false
  };

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /* ── Storage (try/catch everywhere — private browsing, disabled
     storage, and quota limits all throw rather than silently no-op) ── */
  var storageAvailable = (function () {
    try {
      var k = '__elevate_storage_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function loadDraft() {
    if (!storageAvailable) return null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.answers) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeDraft() {
    if (!storageAvailable) return false;
    try {
      var payload = {
        applicationId: state.applicationId,
        createdAt: state.createdAt,
        formVersion: state.formVersion,
        status: state.status,
        answers: state.answers,
        currentScreen: state.currentScreen,
        furthestScreenReached: state.furthestScreenReached,
        savedAt: new Date().toISOString()
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearDraft() {
    if (storageAvailable) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }
  }

  var saveTimer = null;
  function scheduleSave() {
    setSavingStatus('saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var ok = writeDraft();
      setSavingStatus(ok ? 'saved' : 'error');
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function setSavingStatus(kind) {
    var el = document.getElementById('discoverySaveStatus');
    if (!el) return;
    var text = {
      saving: 'Saving…',
      saved: 'Saved on this device',
      error: "Couldn't save—please try again"
    }[kind] || '';
    el.textContent = text;
    el.className = 'discovery-save-status discovery-save-status--' + kind;
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  function answerIsBlank(v) {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return String(v).trim() === '';
  }

  function questionAnswered(q) {
    var v = state.answers[q.id];
    if (q.type === 'multi') {
      if (!answerIsBlank(v)) return true;
      if (q.allowOther && !answerIsBlank(state.answers[q.otherField])) return true;
      return false;
    }
    return !answerIsBlank(v);
  }

  function screenComplete(screenIndex) {
    var screen = SCREENS[screenIndex - 1];
    if (!screen) return true;
    return screen.questions.every(function (q) {
      return !q.required || questionAnswered(q);
    });
  }

  // Progress reflects completed SCREENS the person has actually reached,
  // not a live check of which screens are currently valid. A screen with
  // only optional questions is technically "complete" the instant the
  // app loads (nothing required to fill in) -- counting that as progress
  // before someone has even seen it would be wrong, so progress is tied
  // to furthestScreenReached (updated on navigation in goToScreen), not
  // to screenComplete() directly. Skipped optional questions still never
  // count against you, since reaching a screen is enough regardless of
  // what's filled in on it. 100% is reserved for a real accepted
  // submission and is never reached by navigation alone.
  function computeProgress() {
    if (state.status === 'submitted') return 100;
    var reached = state.furthestScreenReached || 0;
    var pct = Math.round((reached / TOTAL_CONTENT_SCREENS) * 99);
    return Math.max(0, Math.min(99, pct));
  }

  /* ── Rendering ──────────────────────────────────────────── */
  var root = document.querySelector('[data-discovery-root]');

  function render(direction) {
    if (state.currentScreen === 0) {
      root.innerHTML = renderWelcomeHtml();
    } else if (state.currentScreen === 'confirmation') {
      root.innerHTML = renderConfirmationHtml();
    } else {
      root.innerHTML = renderScreenHtml(state.currentScreen);
    }
    animateEntrance(direction);
    bindScreenEvents();
    focusScreenHeading();
    renderChrome();
  }

  function animateEntrance(direction) {
    if (reducedMotionMQ.matches || !direction) return;
    var panel = root.querySelector('.discovery-panel');
    if (!panel) return;
    panel.classList.add(direction === 'back' ? 'is-entering-from-left' : 'is-entering-from-right');
    requestAnimationFrame(function () {
      panel.classList.add('is-entered');
    });
  }

  function focusScreenHeading() {
    var h = root.querySelector('[data-screen-heading]');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function renderWelcomeHtml() {
    var draft = loadDraft();
    var hasDraft = !!(draft && draft.answers && Object.keys(draft.answers).length && draft.status !== 'submitted');
    var needsMigration = hasDraft && draft.formVersion !== FORM_VERSION;
    return (
      '<div class="discovery-panel discovery-panel--welcome">' +
        '<p class="discovery-eyebrow">Client Discovery Application</p>' +
        '<h1 class="discovery-title" data-screen-heading>' + escapeHtml(COPY.welcome.title) + '</h1>' +
        '<p class="discovery-copy">' + escapeHtml(COPY.welcome.intro1) + '</p>' +
        '<p class="discovery-copy">' + escapeHtml(COPY.welcome.intro2) + '</p>' +
        '<p class="discovery-saving-note">' + escapeHtml(COPY.welcome.savingNote) + '</p>' +
        (hasDraft
          ? '<div class="discovery-draft-notice">' +
              '<p>We found a saved draft on this device from ' + escapeHtml(formatSavedAt(draft.savedAt)) + '.' +
              (needsMigration ? ' We’ve updated a few questions since then — a couple of answers may need a fresh look once you continue.' : '') +
              '</p>' +
              '<div class="discovery-draft-notice__actions">' +
                '<button type="button" class="discovery-btn discovery-btn--primary" data-action="resume-draft">Continue your draft</button>' +
                '<button type="button" class="discovery-btn discovery-btn--ghost" data-action="discard-draft">Start over</button>' +
              '</div>' +
            '</div>'
          : '<button type="button" class="discovery-btn discovery-btn--primary discovery-btn--start" data-action="start">' + escapeHtml(COPY.welcome.startButton) + '</button>'
        ) +
      '</div>'
    );
  }

  function formatSavedAt(iso) {
    if (!iso) return 'earlier';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return 'earlier'; }
  }

  function renderConfirmationHtml() {
    return (
      '<div class="discovery-panel discovery-confirmation">' +
        '<h2 data-screen-heading tabindex="-1">' + escapeHtml(COPY.confirmation.title) + '</h2>' +
        '<p class="discovery-copy">' + escapeHtml(COPY.confirmation.body) + '</p>' +
      '</div>'
    );
  }

  function renderScreenHtml(screenNum) {
    var screen = SCREENS[screenNum - 1];
    var isLast = screenNum === TOTAL_CONTENT_SCREENS;
    var html = '<div class="discovery-panel">' +
      '<p class="discovery-eyebrow">Screen ' + screenNum + ' of ' + TOTAL_CONTENT_SCREENS + '</p>' +
      '<h2 class="discovery-screen-title" data-screen-heading>' + escapeHtml(screen.title) + '</h2>';

    if (screenNum === 1 && state.migrationNotes && state.migrationNotes.length) {
      html += '<div class="discovery-draft-notice discovery-draft-notice--migration">' +
        '<p>A quick heads up before you continue:</p>' +
        '<ul>' + state.migrationNotes.map(function (n) { return '<li>' + escapeHtml(n) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    }

    html += '<div class="discovery-questions">';
    screen.questions.forEach(function (q) { html += renderQuestionHtml(q); });
    html += '</div>';

    if (isLast) html += renderReviewSummaryHtml();

    html += '</div>';
    return html;
  }

  function renderQuestionHtml(q) {
    var val = state.answers[q.id];
    var fieldId = 'df_' + q.id;
    var helperId = q.helper ? fieldId + '_helper' : null;
    var describedBy = helperId ? ' aria-describedby="' + helperId + '"' : '';
    var labelHtml =
      '<label class="discovery-field__label" for="' + fieldId + '">' +
        escapeHtml(q.label) +
        (q.required ? '' : ' <span class="discovery-optional-tag">Optional</span>') +
      '</label>';
    var helperHtml = q.helper ? '<p class="discovery-field__helper" id="' + helperId + '">' + escapeHtml(q.helper) + '</p>' : '';

    var controlHtml = '';
    if (q.type === 'text' || q.type === 'email' || q.type === 'tel') {
      controlHtml = '<input class="discovery-input" type="' + q.type + '" id="' + fieldId + '" name="' + q.id + '"' +
        ' value="' + escapeHtml(val || '') + '"' + describedBy +
        (q.required ? ' required' : '') +
        (q.type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : '') +
        (q.type === 'email' ? ' autocomplete="email"' : '') +
        ' data-field="' + q.id + '">';
    } else if (q.type === 'textarea') {
      controlHtml = '<textarea class="discovery-textarea' + (q.isFollowUp ? ' discovery-textarea--followup' : '') + '" id="' + fieldId + '" name="' + q.id + '" rows="3"' +
        describedBy + (q.required ? ' required' : '') +
        ' data-field="' + q.id + '" data-autogrow="1">' + escapeHtml(val || '') + '</textarea>';
    } else if (q.type === 'single') {
      controlHtml = '<div class="discovery-options" role="radiogroup" aria-labelledby="' + fieldId + '_legend"' + describedBy + '>' +
        q.options.map(function (opt, i) {
          var optId = fieldId + '_' + i;
          var checked = val === opt;
          return '<label class="discovery-option' + (checked ? ' is-checked' : '') + '" for="' + optId + '">' +
            '<input type="radio" id="' + optId + '" name="' + q.id + '" value="' + escapeHtml(opt) + '"' +
            (checked ? ' checked' : '') + (q.required ? ' required' : '') + ' data-field="' + q.id + '">' +
            '<span>' + escapeHtml(opt) + '</span></label>';
        }).join('') + '</div>';
      labelHtml = '<p class="discovery-field__label" id="' + fieldId + '_legend">' + escapeHtml(q.label) +
        (q.required ? '' : ' <span class="discovery-optional-tag">Optional</span>') + '</p>';
    } else if (q.type === 'multi') {
      var selected = Array.isArray(val) ? val : [];
      var atMax = q.max && selected.length >= q.max;
      var exclusiveActive = q.exclusiveOptions && selected.some(function (v) { return q.exclusiveOptions.indexOf(v) !== -1; });
      controlHtml = '<div class="discovery-options" role="group" aria-labelledby="' + fieldId + '_legend"' + describedBy + '>' +
        q.options.map(function (opt, i) {
          if (opt === 'Other' && q.allowOther) {
            var otherChecked = selected.indexOf('Other') !== -1;
            var otherId = fieldId + '_other';
            var otherDisable = (atMax || exclusiveActive) && !otherChecked;
            return '<label class="discovery-option discovery-option--other' + (otherChecked ? ' is-checked' : '') + (otherDisable ? ' is-disabled' : '') + '" for="' + otherId + '_cb">' +
              '<input type="checkbox" id="' + otherId + '_cb" name="' + q.id + '" value="Other"' +
              (otherChecked ? ' checked' : '') + (otherDisable ? ' disabled' : '') +
              ' data-field="' + q.id + '" data-multi-max="1">' +
              '<span>Other</span></label>' +
              (otherChecked ? '<input class="discovery-input discovery-input--other" type="text" aria-label="Please specify" placeholder="Please specify" value="' +
                escapeHtml(state.answers[q.otherField] || '') + '" data-field="' + q.otherField + '">' : '');
          }
          var optId = fieldId + '_' + i;
          var checked = selected.indexOf(opt) !== -1;
          var disable = (atMax || exclusiveActive) && !checked;
          return '<label class="discovery-option' + (checked ? ' is-checked' : '') + (disable ? ' is-disabled' : '') + '" for="' + optId + '">' +
            '<input type="checkbox" id="' + optId + '" name="' + q.id + '" value="' + escapeHtml(opt) + '"' +
            (checked ? ' checked' : '') + (disable ? ' disabled' : '') +
            ' data-field="' + q.id + '" data-multi-max="1">' +
            '<span>' + escapeHtml(opt) + '</span></label>';
        }).join('') +
      '</div>';
      labelHtml = '<p class="discovery-field__label" id="' + fieldId + '_legend">' + escapeHtml(q.label) +
        (q.required ? '' : ' <span class="discovery-optional-tag">Optional</span>') + '</p>';
      var noteText = q.helperNote || '';
      if (q.max) noteText += (noteText ? ' ' : '') + '(' + selected.length + ' of ' + q.max + ' selected)';
      var noteHtmlMulti = noteText ? '<p class="discovery-field__note">' + escapeHtml(noteText) + '</p>' : '';
      return '<div class="discovery-field' + (q.isFollowUp ? ' discovery-field--followup' : '') + '" data-question="' + q.id + '">' + labelHtml + noteHtmlMulti + helperHtml + controlHtml + '</div>';
    }

    var noteHtml = q.helperNote ? '<p class="discovery-field__note">' + escapeHtml(q.helperNote) + '</p>' : '';
    return '<div class="discovery-field' + (q.isFollowUp ? ' discovery-field--followup' : '') + '" data-question="' + q.id + '">' + labelHtml + noteHtml + helperHtml + controlHtml + '</div>';
  }

  function renderReviewSummaryHtml() {
    var html = '<div class="discovery-review">' +
      '<h3 class="discovery-review__title">Review your answers</h3>' +
      '<p class="discovery-review__hint">Everything below is editable — tap any screen to make a change, then return here to submit.</p>';
    SCREENS.forEach(function (screen, i) {
      var num = i + 1;
      html += '<div class="discovery-review__screen">' +
        '<div class="discovery-review__screen-head">' +
          '<span>' + escapeHtml(screen.title) + '</span>' +
          '<button type="button" class="discovery-review__edit" data-action="edit-screen" data-screen="' + num + '">Edit</button>' +
        '</div>' +
        screen.questions.map(function (q) { return renderReviewAnswerHtml(q); }).join('') +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderReviewAnswerHtml(q) {
    var v = state.answers[q.id];
    var display;
    if (q.type === 'multi') {
      var arr = Array.isArray(v) ? v.slice() : [];
      if (q.allowOther && arr.indexOf('Other') !== -1 && state.answers[q.otherField]) {
        arr = arr.map(function (x) { return x === 'Other' ? 'Other: ' + state.answers[q.otherField] : x; });
      }
      display = arr.length ? arr.join(', ') : '—';
    } else {
      display = answerIsBlank(v) ? '—' : String(v);
    }
    return '<div class="discovery-review__answer">' +
      '<p class="discovery-review__q">' + escapeHtml(q.label) + '</p>' +
      '<p class="discovery-review__a' + (display === '—' ? ' is-blank' : '') + '">' + nl2br(display) + '</p>' +
    '</div>';
  }

  /* ── Chrome: progress bar + back/continue — rendered as the LAST
     child of the current .discovery-panel (not a fixed viewport-edge
     bar), so it sits inside the same padded card, directly beneath the
     questions, at the card's own content width. ──────────────────── */
  function renderChrome() {
    var oldChrome = document.getElementById('discoveryChrome');
    if (oldChrome) oldChrome.remove();
    if (state.currentScreen === 0 || state.currentScreen === 'confirmation') return;

    var panel = root.querySelector('.discovery-panel');
    if (!panel) return;

    var chrome = document.createElement('div');
    chrome.id = 'discoveryChrome';
    chrome.className = 'discovery-chrome';

    var pct = computeProgress();
    var isLast = state.currentScreen === TOTAL_CONTENT_SCREENS;
    var canContinue = screenComplete(state.currentScreen);

    chrome.innerHTML =
      '<div class="discovery-chrome__status" id="discoverySaveStatus" role="status" aria-live="polite"></div>' +
      '<p class="discovery-submit-error" id="discoverySubmitError" role="alert" hidden></p>' +
      '<div class="discovery-progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Application progress">' +
        '<div class="discovery-progress__bar" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="discovery-chrome__row">' +
        '<span class="discovery-progress__pct">' + pct + '%</span>' +
        '<div class="discovery-chrome__buttons">' +
          '<button type="button" class="discovery-btn discovery-btn--ghost" data-action="back">Back</button>' +
          (isLast
            ? '<button type="button" class="discovery-btn discovery-btn--primary" data-action="submit">Send to Elevate</button>'
            : '<button type="button" class="discovery-btn discovery-btn--primary" data-action="continue"' + (canContinue ? '' : ' aria-disabled="true"') + '>Continue</button>'
          ) +
        '</div>' +
      '</div>';
    panel.appendChild(chrome);
    setSavingStatus(storageAvailable ? 'saved' : 'error');
    if (state.submitting) setSubmitButtonBusy(true);
  }

  /* ── Events ─────────────────────────────────────────────── */
  function bindScreenEvents() {
    root.querySelectorAll('[data-field]').forEach(function (el) {
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.addEventListener('change', onSelectionFieldChange);
      } else {
        el.addEventListener('input', onTextFieldInput);
      }
    });
    root.querySelectorAll('[data-autogrow]').forEach(autogrow);

    var startBtn = root.querySelector('[data-action="start"]');
    if (startBtn) startBtn.addEventListener('click', function () { goToScreen(1, 'fwd'); });
    var resumeBtn = root.querySelector('[data-action="resume-draft"]');
    if (resumeBtn) resumeBtn.addEventListener('click', onResumeDraft);
    var discardBtn = root.querySelector('[data-action="discard-draft"]');
    if (discardBtn) discardBtn.addEventListener('click', onDiscardDraft);

    root.querySelectorAll('[data-action="edit-screen"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cameFromReview = true;
        goToScreen(parseInt(btn.getAttribute('data-screen'), 10), 'fwd');
      });
    });
  }

  // Text/email/tel/textarea input: update state + a couple of small,
  // directly-targeted chrome elements only. Never touches the input's
  // own DOM node — see the file header comment for why that matters.
  function onTextFieldInput(e) {
    var el = e.target;
    var field = el.getAttribute('data-field');
    state.answers[field] = el.value;
    var fieldWrap = el.closest('.discovery-field');
    if (fieldWrap) fieldWrap.classList.remove('is-flagged');
    updateChromeLiveState();
    scheduleSave();
  }

  function updateChromeLiveState() {
    var pct = computeProgress();
    var bar = document.querySelector('#discoveryChrome .discovery-progress__bar');
    var pctEl = document.querySelector('#discoveryChrome .discovery-progress__pct');
    var progressWrap = document.querySelector('#discoveryChrome .discovery-progress');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (progressWrap) progressWrap.setAttribute('aria-valuenow', String(pct));
    var btn = document.querySelector('#discoveryChrome [data-action="continue"]');
    if (btn) {
      if (screenComplete(state.currentScreen)) btn.removeAttribute('aria-disabled');
      else btn.setAttribute('aria-disabled', 'true');
    }
  }

  // Checkbox/radio change: a discrete click, not continuous typing, so
  // a full screen re-render is safe here and is what keeps max-selection
  // disabling, exclusive-option disabling, and "Other" reveal in sync.
  function onSelectionFieldChange(e) {
    var el = e.target;
    var field = el.getAttribute('data-field');
    if (el.type === 'checkbox' && el.hasAttribute('data-multi-max')) {
      var qId = el.name;
      var q = QUESTIONS_BY_ID[qId];
      var cur = Array.isArray(state.answers[qId]) ? state.answers[qId].slice() : [];
      if (el.checked) {
        if (q.exclusiveOptions && q.exclusiveOptions.indexOf(el.value) !== -1) {
          cur = [el.value];
        } else {
          if (q.exclusiveOptions) cur = cur.filter(function (v) { return q.exclusiveOptions.indexOf(v) === -1; });
          if (cur.indexOf(el.value) === -1) cur.push(el.value);
        }
      } else {
        cur = cur.filter(function (v) { return v !== el.value; });
        if (el.value === 'Other') delete state.answers[field + '_other'];
      }
      state.answers[qId] = cur;
    } else if (el.type === 'radio') {
      state.answers[field] = el.value;
    }
    rerenderCurrentScreenPreservingFocus(el);
    scheduleSave();
  }

  function rerenderCurrentScreenPreservingFocus(changedEl) {
    var screenNum = state.currentScreen;
    var activeName = changedEl ? changedEl.getAttribute('data-field') : null;
    root.innerHTML = renderScreenHtml(screenNum);
    bindScreenEvents();
    renderChrome();
    if (activeName) {
      var toFocus = root.querySelector('[data-field="' + activeName + '"]');
      if (toFocus && document.activeElement !== toFocus) {
        toFocus.focus({ preventScroll: true });
      }
    }
  }

  function autogrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 1) + 'px';
    el.addEventListener('input', function () {
      el.style.height = 'auto';
      el.style.height = Math.max(el.scrollHeight, 1) + 'px';
    });
  }

  function onResumeDraft() {
    var draft = loadDraft();
    if (!draft) { goToScreen(1, 'fwd'); return; }
    if (draft.formVersion !== FORM_VERSION) {
      draft = migrateDraft(draft);
      state.migrationNotes = draft.migrationNotes;
    }
    state.applicationId = draft.applicationId || uuid();
    state.createdAt = draft.createdAt || new Date().toISOString();
    state.answers = draft.answers || {};
    state.furthestScreenReached = draft.furthestScreenReached || 0;
    var target = draft.currentScreen;
    if (!target || target === 0) target = 1;
    goToScreen(target, 'fwd');
  }

  function onDiscardDraft() {
    clearDraft();
    state.answers = {};
    state.applicationId = uuid();
    state.createdAt = new Date().toISOString();
    state.furthestScreenReached = 0;
    state.migrationNotes = null;
    goToScreen(1, 'fwd');
  }

  function goToScreen(n, direction) {
    state.currentScreen = n;
    if (typeof n === 'number' && n >= 1) {
      state.furthestScreenReached = Math.max(state.furthestScreenReached || 0, n);
    }
    render(direction);
    window.scrollTo({ top: 0, behavior: reducedMotionMQ.matches ? 'auto' : 'smooth' });
    scheduleSave();
  }

  function goBack() {
    if (state.currentScreen <= 1) { goToScreen(0, 'back'); return; }
    goToScreen(state.currentScreen - 1, 'back');
  }

  function goContinue() {
    if (!screenComplete(state.currentScreen)) {
      flashIncomplete();
      return;
    }
    if (state.cameFromReview) {
      state.cameFromReview = false;
      goToScreen(TOTAL_CONTENT_SCREENS, 'fwd');
      return;
    }
    if (state.currentScreen >= TOTAL_CONTENT_SCREENS) return;
    goToScreen(state.currentScreen + 1, 'fwd');
  }

  function flashIncomplete() {
    var screen = SCREENS[state.currentScreen - 1];
    var firstMissing = screen.questions.find(function (q) { return q.required && !questionAnswered(q); });
    if (!firstMissing) return;
    var el = root.querySelector('[data-question="' + firstMissing.id + '"]');
    if (el) {
      el.classList.add('is-flagged');
      var input = el.querySelector('input,textarea');
      if (input) input.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: reducedMotionMQ.matches ? 'auto' : 'smooth', block: 'center' });
    }
  }

  /* ── Submit ─────────────────────────────────────────────── */
  var SUBMIT_URL = '/.netlify/functions/discovery-submit';

  function setSubmitButtonBusy(busy) {
    var btn = document.querySelector('#discoveryChrome [data-action="submit"]');
    if (!btn) return;
    if (busy) {
      btn.dataset.originalLabel = btn.dataset.originalLabel || btn.textContent;
      btn.textContent = 'Sending…';
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.textContent = btn.dataset.originalLabel || 'Send to Elevate';
      btn.removeAttribute('aria-disabled');
    }
  }

  function showSubmitError(message) {
    var el = document.getElementById('discoverySubmitError');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function clearSubmitError() {
    var el = document.getElementById('discoverySubmitError');
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function handleSubmit() {
    var incompleteScreen = null;
    for (var i = 1; i <= TOTAL_CONTENT_SCREENS; i++) {
      if (!screenComplete(i)) { incompleteScreen = i; break; }
    }
    if (incompleteScreen) {
      state.cameFromReview = true;
      goToScreen(incompleteScreen, 'fwd');
      return;
    }
    if (!BACKEND_CONNECTED) {
      showSubmitPreviewNotice();
      return;
    }
    if (state.submitting) return; // guards against a double-click firing two requests
    submitToBackend();
  }

  function submitToBackend() {
    state.submitting = true;
    clearSubmitError();
    setSubmitButtonBusy(true);

    var payload = { applicationId: state.applicationId, answers: state.answers };

    fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        state.submitting = false;
        if (result.ok && result.data && result.data.status === 'accepted') {
          // Durable acceptance confirmed by the server -- only now is it
          // safe to clear the local draft and show real success. The
          // applicationId stays the same throughout, so if this response
          // is ever lost to a network error after the server already
          // accepted it, retrying re-sends the same ID and the server
          // returns that same accepted result rather than a duplicate.
          state.status = 'submitted';
          clearDraft();
          goToScreen('confirmation', 'fwd');
          return;
        }
        setSubmitButtonBusy(false);
        showSubmitError("Something went wrong sending your application. Your answers are saved on this device — nothing is lost. Please try again.");
      })
      .catch(function () {
        state.submitting = false;
        setSubmitButtonBusy(false);
        showSubmitError("Couldn't reach the server to send your application. Your answers are saved on this device — nothing is lost. Check your connection and try again.");
      });
  }

  function showSubmitPreviewNotice() {
    var overlay = document.createElement('div');
    overlay.className = 'discovery-preview-overlay';
    overlay.innerHTML =
      '<div class="discovery-preview-card" role="dialog" aria-modal="true" aria-labelledby="discoveryPreviewTitle">' +
        '<p class="discovery-preview-flag">Preview — not yet submitted</p>' +
        '<h2 id="discoveryPreviewTitle">This is where submission will happen</h2>' +
        '<p>Real delivery to Elevate isn’t connected yet, so clicking "Send to Elevate" doesn’t send anything right now. Your answers are safe. They’re still saved on this device, and nothing has been sent or lost.</p>' +
        '<button type="button" class="discovery-btn discovery-btn--primary" data-action="close-preview">Back to my answers</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="close-preview"]').addEventListener('click', function () {
      overlay.remove();
    });
    var card = overlay.querySelector('.discovery-preview-card');
    card.setAttribute('tabindex', '-1');
    card.focus({ preventScroll: true });
  }

  /* ── Global events ──────────────────────────────────────── */
  function bindChromeEvents() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'back') goBack();
      else if (action === 'continue') goContinue();
      else if (action === 'submit') handleSubmit();
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    if (!root) return;
    state.applicationId = uuid();
    state.createdAt = new Date().toISOString();
    bindChromeEvents();
    render(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
