/* ════════════════════════════════════════════════════════════
   ELEVATE — CLIENT DISCOVERY APPLICATION
   /discovery/ — direct-link only, not in nav, noindex.

   The 22 questions (copy, type, required/optional, options) are
   defined here as data rather than in content/pages/discovery.yml
   like the rest of the site's copy. Two reasons: they're structural
   (each has a type, validation rule, and — for 11 of them — a fixed
   option list) in a way flat YAML->token substitution doesn't model
   well, and the brief is explicit that this copy needs sign-off
   before changing, which a hand-reviewed JS block makes easier to
   diff than a template with 22 interdependent {{tokens}}. The
   welcome/confirmation screens ARE plain YAML-editable copy (see
   content/pages/discovery.yml + the JSON island in the template)
   since those are ordinary prose with no structure to encode.

   PHASE 1 (this build): full visual app, client-side validation,
   same-device localStorage draft saving. Submission is a disabled
   preview — see handleSubmit() — until backend delivery is approved
   and connected.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var FORM_VERSION = '1.0.0';
  var STORAGE_KEY = 'elevate_discovery_draft_v1';
  var AUTOSAVE_DEBOUNCE_MS = 600;

  var reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Question schema ─────────────────────────────────────── */
  // type: 'text' | 'email' | 'tel' | 'textarea' | 'single' | 'multi'
  // Every question has: id (stable field name), qNum (client-facing
  // ordinal, matches the approved brief), label, required, helper?
  var SCREENS = [
    {
      title: 'First, You',
      questions: [
        { id: 'applicant_name', qNum: 1, type: 'text', required: true,
          label: "What's your first and last name?" },
        { id: 'applicant_email', qNum: 2, type: 'email', required: true,
          label: "What's your email address?",
          helper: "Used for communication about this application — and, once available, an optional secure link to resume a saved draft. You won't be added to any marketing list." },
        { id: 'applicant_phone', qNum: 3, type: 'tel', required: false,
          label: 'What’s the best phone number to reach you?' }
      ]
    },
    {
      title: 'Your Business',
      questions: [
        { id: 'business_name', qNum: 4, type: 'text', required: true,
          label: "What's your business or brand name?",
          helper: "If you're still developing it, share your working name—or tell me you're figuring it out." },
        { id: 'business_description', qNum: 5, type: 'textarea', required: true,
          label: 'What do you do, who do you help, and what do you offer right now?',
          helper: 'Give me the everyday version—no elevator pitch needed.' },
        { id: 'industry_types', qNum: 6, type: 'multi', required: true,
          label: 'What industry or type of work best describes your business?',
          options: [
            'Real estate', 'Roofing & home services', 'Beauty & wellness',
            'Professional services', 'Coaching & consulting',
            'Content & creative work', 'Retail & products'
          ],
          allowOther: true, otherField: 'industry_types_other',
          extraOptions: ['Still figuring it out'] }
      ]
    },
    {
      title: 'What It Looks Like Today',
      questions: [
        { id: 'team_structure', qNum: 7, type: 'single', required: true,
          label: "Who's helping you make it all happen?",
          options: ['Just me', 'Me and a few collaborators', 'Me and a team', "I'm getting started"] },
        { id: 'online_presence', qNum: 8, type: 'textarea', required: false,
          label: 'Where can I find you online?',
          helper: "Your website, social pages, booking link—whatever you have. If that's still on the wish list, that's okay." }
      ]
    },
    {
      title: 'The Vision',
      questions: [
        { id: 'vision_6_12_months', qNum: 9, type: 'textarea', required: true,
          label: 'What would you love to see happen in your business over the next 6–12 months?',
          helper: "Think income, freedom, growth, a smoother day-to-day—or something you haven't quite put into words yet." },
        { id: 'vision_ideas', qNum: 10, type: 'textarea', required: false,
          label: "What ideas keep coming back to you that you'd love to bring to life?",
          helper: "It doesn't have to be figured out yet. What would you love to offer, change, or make room for?" }
      ]
    },
    {
      title: 'What We Can Build On',
      questions: [
        { id: 'goals_90_days', qNum: 11, type: 'textarea', required: true,
          label: "What are the top one to three things you'd love to accomplish in the next 90 days?",
          helper: "Start with what matters most. You don't need to know how you'll make it happen yet." },
        { id: 'strengths', qNum: 12, type: 'textarea', required: false,
          label: "What are you really good at—and what's already working that we can build on?" }
      ]
    },
    {
      title: 'What Needs Some Attention',
      questions: [
        { id: 'challenges_time_energy', qNum: 13, type: 'textarea', required: true,
          label: "What's taking up too much of your time, energy, or headspace?",
          helper: 'Think about a recent day. Where did you get stuck, repeat yourself, or wish something worked differently?' },
        { id: 'challenges_one_fix', qNum: 14, type: 'textarea', required: true,
          label: 'If we could get one thing working better first, what would make the biggest difference?',
          helper: "It's okay if you're not sure yet—tell me what comes to mind." }
      ]
    },
    {
      title: 'Where You Could Use Support',
      questions: [
        { id: 'support_areas', qNum: 15, type: 'multi', required: true, max: 3,
          label: 'Where could you use another brain, a better system, or some hands-on help?',
          helperNote: 'Choose up to three.',
          options: [
            'Clarifying my direction and priorities', 'Developing or launching an offer',
            'Attracting clients and building visibility', 'Managing inquiries, booking, and follow-up',
            'Organizing client information', 'Improving the client experience and repeat business',
            'Organizing daily work and processes', 'Delegating or supporting a team',
            'Choosing or improving tools and technology', 'Saving time through automation or AI',
            'Following through and staying accountable'
          ],
          allowOther: true, otherField: 'support_areas_other',
          extraOptions: ["I'm not sure yet"] },
        { id: 'support_style', qNum: 16, type: 'multi', required: true,
          label: 'What would helpful support look like for you right now?',
          helperNote: 'Select all that apply.',
          options: [
            'Help deciding what to do and in what order', 'A clear plan I can carry out',
            'Someone to build or set things up for me', 'Working through it together',
            'Training for me or my team', 'Ongoing guidance and accountability',
            "I'd like your recommendation"
          ] }
      ]
    },
    {
      title: 'Behind the Scenes',
      questions: [
        { id: 'sales_process', qNum: 17, type: 'textarea', required: true,
          label: 'Walk me through what happens when someone wants to work with you or buy from you.',
          helper: "How do they find you, book or purchase, and pay? Texts and DMs count—tell me how it actually happens. If you're just starting, tell me what you have in mind." },
        { id: 'client_tracking', qNum: 18, type: 'textarea', required: true,
          label: 'How are you keeping track of your clients, their details, and who needs a follow-up?',
          helper: "An app, a notebook, your phone, your memory—or a little of everything? If you don't have clients yet, that's useful to know too." },
        { id: 'tools_in_use', qNum: 19, type: 'textarea', required: false,
          label: 'What apps or tools are you using to keep things moving?',
          helper: 'Share what you know. No technical vocabulary required—and "none yet" is an answer.' }
      ]
    },
    {
      title: 'Working Together',
      questions: [
        { id: 'motivation_style', qNum: 20, type: 'textarea', required: false,
          label: "When you're learning something new or working toward a goal, what helps it click—and helps you keep going?" },
        { id: 'timeline', qNum: 21, type: 'single', required: true,
          label: 'When would you like to get started?',
          options: ['As soon as possible', 'Within a month', 'Within three months', 'Exploring for later'] },
        { id: 'timeline_reason', qNum: 21, type: 'textarea', required: false,
          label: 'Is there something making this feel like the right time?',
          isFollowUp: true }
      ]
    },
    {
      title: 'Anything Else?',
      questions: [
        { id: 'anything_else', qNum: 22, type: 'textarea', required: false,
          label: 'What else would you like me to know?',
          helper: 'About your business, your ideas, or what life looks like right now. Share whatever feels helpful—you get to decide how much.' }
      ]
    }
  ];

  var ALL_QUESTIONS = [];
  SCREENS.forEach(function (s) { s.questions.forEach(function (q) { ALL_QUESTIONS.push(q); }); });
  var REQUIRED_QUESTIONS = ALL_QUESTIONS.filter(function (q) { return q.required; });

  var SCREEN_LABELS = {
    0: 'Welcome', 1: 'First, You', 2: 'Your Business', 3: 'What It Looks Like Today',
    4: 'The Vision', 5: 'What We Can Build On', 6: 'What Needs Some Attention',
    7: 'Where You Could Use Support', 8: 'Behind the Scenes', 9: 'Working Together',
    10: 'Anything Else?'
  };
  var TOTAL_CONTENT_SCREENS = SCREENS.length; // 10

  /* ── Copy (YAML-editable, via the template's JSON island) ───── */
  var COPY = (function () {
    var fallback = {
      welcome: {
        title: "Let's Talk About Your Business",
        intro1: "You've got ideas, goals, and probably a few things you're tired of figuring out on your own. This is your space to share what's working, what feels messy, and what you'd love to make happen.",
        intro2: "You don't need polished answers or a perfect plan. Tell me where you are—even if that includes 'I have no idea.' We'll start there.",
        savingNote: 'Your answers save automatically on this device as you go.',
        startButton: "Let's Get Into It"
      },
      confirmation: {
        title: "You're all set.",
        body: "Thank you for letting me in on what you're building and what could use some support. I'll review your answers so we can make our next conversation count."
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
    cameFromReview: false,
    submitPreviewShown: false
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

  function computeProgress() {
    if (state.status === 'submitted') return 100;
    var answered = REQUIRED_QUESTIONS.filter(questionAnswered).length;
    var pct = Math.round((answered / REQUIRED_QUESTIONS.length) * 99);
    return Math.max(0, Math.min(99, pct));
  }

  /* ── Rendering ──────────────────────────────────────────── */
  var root = document.querySelector('[data-discovery-root]');

  function render(direction) {
    if (state.currentScreen === 0) {
      root.innerHTML = renderWelcomeHtml();
    } else if (state.currentScreen === 'review') {
      root.innerHTML = renderReviewWrapHtml();
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
    return (
      '<div class="discovery-panel discovery-panel--welcome">' +
        '<p class="discovery-eyebrow">Client Discovery Application</p>' +
        '<h1 class="discovery-title" data-screen-heading>' + escapeHtml(COPY.welcome.title) + '</h1>' +
        '<p class="discovery-copy">' + escapeHtml(COPY.welcome.intro1) + '</p>' +
        '<p class="discovery-copy">' + escapeHtml(COPY.welcome.intro2) + '</p>' +
        '<p class="discovery-saving-note">' + escapeHtml(COPY.welcome.savingNote) + '</p>' +
        (hasDraft
          ? '<div class="discovery-draft-notice">' +
              '<p>We found a saved draft on this device from ' + escapeHtml(formatSavedAt(draft.savedAt)) + '.</p>' +
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

  function renderScreenHtml(screenNum) {
    var screen = SCREENS[screenNum - 1];
    var isLast = screenNum === TOTAL_CONTENT_SCREENS;
    var html = '<div class="discovery-panel">' +
      '<p class="discovery-eyebrow">Screen ' + screenNum + ' of ' + TOTAL_CONTENT_SCREENS + '</p>' +
      '<h2 class="discovery-screen-title" data-screen-heading>' + escapeHtml(screen.title) + '</h2>' +
      '<div class="discovery-questions">';

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
    var noteHtml = q.helperNote ? '<p class="discovery-field__note">' + escapeHtml(q.helperNote) + '</p>' : '';

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
      var allOptions = q.options.concat(q.extraOptions || []);
      var atMax = q.max && selected.length >= q.max;
      controlHtml = '<div class="discovery-options" role="group" aria-labelledby="' + fieldId + '_legend"' + describedBy + '>' +
        allOptions.map(function (opt, i) {
          var optId = fieldId + '_' + i;
          var checked = selected.indexOf(opt) !== -1;
          var disable = atMax && !checked;
          return '<label class="discovery-option' + (checked ? ' is-checked' : '') + (disable ? ' is-disabled' : '') + '" for="' + optId + '">' +
            '<input type="checkbox" id="' + optId + '" name="' + q.id + '" value="' + escapeHtml(opt) + '"' +
            (checked ? ' checked' : '') + (disable ? ' disabled' : '') +
            ' data-field="' + q.id + '" data-multi-max="' + (q.max || '') + '">' +
            '<span>' + escapeHtml(opt) + '</span></label>';
        }).join('');
      if (q.allowOther) {
        var otherChecked = selected.indexOf('Other') !== -1;
        var otherId = fieldId + '_other';
        controlHtml += '<label class="discovery-option discovery-option--other' + (otherChecked ? ' is-checked' : '') + '" for="' + otherId + '_cb">' +
          '<input type="checkbox" id="' + otherId + '_cb" name="' + q.id + '" value="Other"' +
          (otherChecked ? ' checked' : '') + ' data-field="' + q.id + '" data-multi-max="' + (q.max || '') + '">' +
          '<span>Other</span></label>' +
          (otherChecked ? '<input class="discovery-input discovery-input--other" type="text" aria-label="Please specify" placeholder="Please specify" value="' +
            escapeHtml(state.answers[q.otherField] || '') + '" data-field="' + q.otherField + '">' : '');
      }
      controlHtml += '</div>';
      labelHtml = '<p class="discovery-field__label" id="' + fieldId + '_legend">' + escapeHtml(q.label) +
        (q.required ? '' : ' <span class="discovery-optional-tag">Optional</span>') + '</p>';
    }

    return '<div class="discovery-field" data-question="' + q.id + '">' + labelHtml + noteHtml + helperHtml + controlHtml + '</div>';
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

  function renderReviewWrapHtml() {
    // Only reached if someone lands directly in a "review" state (not
    // currently routed to — review lives inline on the last screen —
    // kept as a safe fallback so an unexpected state never renders blank.
    return renderScreenHtml(TOTAL_CONTENT_SCREENS);
  }

  /* ── Chrome: progress bar + back/continue ──────────────────── */
  function renderChrome() {
    var chrome = document.getElementById('discoveryChrome');
    if (!chrome) {
      chrome = document.createElement('div');
      chrome.id = 'discoveryChrome';
      chrome.className = 'discovery-chrome';
      document.body.appendChild(chrome);
    }
    if (state.currentScreen === 0) { chrome.innerHTML = ''; chrome.hidden = true; return; }
    chrome.hidden = false;

    var pct = computeProgress();
    var isLast = state.currentScreen === TOTAL_CONTENT_SCREENS;
    var canContinue = screenComplete(state.currentScreen);

    chrome.innerHTML =
      '<div class="discovery-chrome__status" id="discoverySaveStatus" role="status" aria-live="polite"></div>' +
      '<div class="discovery-progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Application progress">' +
        '<div class="discovery-progress__bar" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="discovery-chrome__row">' +
        '<span class="discovery-progress__pct">' + pct + '%</span>' +
        '<div class="discovery-chrome__buttons">' +
          '<button type="button" class="discovery-btn discovery-btn--ghost" data-action="back">Back</button>' +
          (isLast
            ? '<button type="button" class="discovery-btn discovery-btn--primary" data-action="submit">Send to Katie</button>'
            : '<button type="button" class="discovery-btn discovery-btn--primary" data-action="continue"' + (canContinue ? '' : ' aria-disabled="true"') + '>Continue</button>'
          ) +
        '</div>' +
      '</div>';
    setSavingStatus(storageAvailable ? 'saved' : 'error');
  }

  /* ── Events ─────────────────────────────────────────────── */
  function bindScreenEvents() {
    root.querySelectorAll('[data-field]').forEach(function (el) {
      var evt = (el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(evt, onFieldChange);
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

  function onFieldChange(e) {
    var el = e.target;
    var field = el.getAttribute('data-field');
    if (el.type === 'checkbox' && el.hasAttribute('data-multi-max')) {
      var qId = el.name;
      var cur = Array.isArray(state.answers[qId]) ? state.answers[qId].slice() : [];
      if (el.checked) { if (cur.indexOf(el.value) === -1) cur.push(el.value); }
      else {
        cur = cur.filter(function (v) { return v !== el.value; });
        if (el.value === 'Other') delete state.answers[field + '_other'];
      }
      state.answers[qId] = cur;
    } else if (el.type === 'radio') {
      state.answers[field] = el.value;
    } else {
      state.answers[field] = el.value;
    }
    rerenderCurrentScreenPreservingFocus(el);
    scheduleSave();
  }

  function rerenderCurrentScreenPreservingFocus(changedEl) {
    // Full re-render keeps "Continue" enablement, multi-select max-reached
    // disabling, and the review summary all in sync with one source of
    // truth, without a separate manual DOM-patch path to keep correct.
    var screenNum = state.currentScreen;
    var activeName = changedEl ? changedEl.getAttribute('data-field') : null;
    root.innerHTML = renderScreenHtml(screenNum);
    bindScreenEvents();
    renderChrome();
    if (activeName) {
      var toFocus = root.querySelector('[data-field="' + activeName + '"]');
      if (toFocus && document.activeElement !== toFocus) {
        var pos = (toFocus.value || '').length;
        toFocus.focus({ preventScroll: true });
        if (toFocus.setSelectionRange && (toFocus.type === 'text' || toFocus.type === 'email' || toFocus.type === 'tel' || toFocus.tagName === 'TEXTAREA')) {
          try { toFocus.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
        }
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
    state.applicationId = draft.applicationId || uuid();
    state.createdAt = draft.createdAt || new Date().toISOString();
    state.answers = draft.answers || {};
    var target = draft.currentScreen;
    if (!target || target === 0) target = 1;
    goToScreen(target, 'fwd');
  }

  function onDiscardDraft() {
    clearDraft();
    state.answers = {};
    state.applicationId = uuid();
    state.createdAt = new Date().toISOString();
    goToScreen(1, 'fwd');
  }

  function goToScreen(n, direction) {
    state.currentScreen = n;
    if (!(n === 1 && state.cameFromReview === false)) { /* no-op, kept explicit */ }
    render(direction);
    window.scrollTo({ top: 0, behavior: reducedMotionMQ.matches ? 'auto' : 'smooth' });
    scheduleSave();
  }

  function goBack() {
    if (state.currentScreen === 'review') { state.currentScreen = TOTAL_CONTENT_SCREENS; render('back'); return; }
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

  /* ── Submit (preview-only — backend not connected) ─────────── */
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
    showSubmitPreviewNotice();
  }

  function showSubmitPreviewNotice() {
    var overlay = document.createElement('div');
    overlay.className = 'discovery-preview-overlay';
    overlay.innerHTML =
      '<div class="discovery-preview-card" role="dialog" aria-modal="true" aria-labelledby="discoveryPreviewTitle">' +
        '<p class="discovery-preview-flag">Preview — not yet submitted</p>' +
        '<h2 id="discoveryPreviewTitle">This is where submission will happen</h2>' +
        '<p>Real delivery (to Katie, securely) isn’t connected yet, so clicking "Send to Katie" doesn’t send anything right now. Your answers are safe — they’re still saved on this device, and nothing has been sent or lost.</p>' +
        '<button type="button" class="discovery-btn discovery-btn--primary" data-action="close-preview">Back to my answers</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="close-preview"]').addEventListener('click', function () {
      overlay.remove();
    });
    overlay.querySelector('.discovery-preview-card').focus && overlay.querySelector('.discovery-preview-card').setAttribute('tabindex', '-1');
    overlay.querySelector('.discovery-preview-card').focus({ preventScroll: true });
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
