/* HTTP entry point for /discovery/ submissions. Orchestrates the
   delivery-agnostic core (validate, sanitize, idempotent accept) and
   the pluggable delivery channels (Sheets, email) -- see lib/
   discovery-core.mjs for why those are kept separate. A future CRM
   delivery channel is added here as one more awaited call alongside
   deliverToGoogleSheets, fed the same canonical record, never touching
   validation or the client.

   Error responses carry a short, safe CODE and the Netlify requestId
   only -- never the raw e.message, env var names, or anything else
   that could describe internal configuration. The full diagnostic
   detail is console.error'd (server-side only, visible in Netlify's
   own Function logs) and nowhere else. */

import { validateSubmission, buildCanonicalRecord, acceptOnce } from './lib/discovery-core.mjs';
import { deliverToGoogleSheets } from './lib/deliver-sheets.mjs';
import { sendNotificationEmail } from './lib/deliver-email.mjs';

var REQUIRED_ENV_VARS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REFRESH_TOKEN',
  'GOOGLE_SHEET_ID'
];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

// code: a short, stable, safe-to-display identifier. requestId: Netlify's
// own per-request ID, safe to show and useful for correlating against
// Function logs (in the Netlify dashboard, not available to this
// session's tools) without exposing what actually went wrong.
function errorResponse(code, status, context) {
  var requestId = (context && context.requestId) || null;
  return json({ status: 'error', code: code, requestId: requestId }, status);
}

function missingEnvVars() {
  return REQUIRED_ENV_VARS.filter(function (name) {
    var v;
    try { v = Netlify.env.get(name); } catch (e) { v = undefined; }
    return !v;
  });
}

async function handleRequest(req, context) {
  if (req.method !== 'POST') {
    return errorResponse('E_METHOD', 405, context);
  }

  // Checked first, before any Blobs/Google call, so a missing credential
  // fails fast and cleanly rather than reaching Blobs/Google at all. The
  // specific missing variable name(s) are logged server-side only --
  // never returned to the client, which only needs to know "server not
  // ready," not which configuration value is absent.
  var missing = missingEnvVars();
  if (missing.length) {
    console.error('discovery-submit [' + context.requestId + ']: missing required environment variable(s):', missing);
    return errorResponse('E_CONFIG', 500, context);
  }

  var body;
  try {
    body = await req.json();
  } catch (e) {
    return errorResponse('E_BODY', 400, context);
  }

  var validation = validateSubmission(body);
  if (!validation.ok) {
    console.error('discovery-submit [' + context.requestId + ']: invalid submission:', validation.errors);
    return errorResponse('E_INVALID', 422, context);
  }

  var canonicalRecord = buildCanonicalRecord(body);

  var accepted;
  try {
    accepted = await acceptOnce(canonicalRecord, context);
  } catch (e) {
    // e.message is one of the specific, non-secret strings thrown by
    // acceptOnce (blobs_module_unavailable / blobs_store_init_failed /
    // blobs_write_failed / blobs_read_failed) -- logged server-side for
    // whoever checks the Function logs, never sent to the client.
    console.error('discovery-submit [' + context.requestId + ']: accept failed:', e);
    return errorResponse('E_ACCEPT', 502, context);
  }

  // Durable acceptance has already happened at this point (or had
  // already happened on a prior attempt with the same applicationId) --
  // everything below is best-effort delivery. A delivery failure is
  // logged, never returned to the client as a failed submission: the
  // application is safely recorded either way.
  var deliveryStatus = { sheets: 'skipped', email: 'skipped' };

  if (accepted.created) {
    var sheetTab = null;
    try {
      var sheetsResult = await deliverToGoogleSheets(accepted.record, context);
      sheetTab = sheetsResult.tab;
      deliveryStatus.sheets = 'ok';
    } catch (e) {
      console.error('discovery-submit [' + context.requestId + ']: sheets delivery failed:', e);
      deliveryStatus.sheets = 'failed';
    }

    try {
      await sendNotificationEmail(accepted.record, sheetTab || 'unknown');
      deliveryStatus.email = 'ok';
    } catch (e) {
      console.error('discovery-submit [' + context.requestId + ']: email delivery failed:', e);
      deliveryStatus.email = 'failed';
    }
  } else {
    deliveryStatus.sheets = 'already-delivered';
    deliveryStatus.email = 'already-delivered';
  }

  return json({
    status: 'accepted',
    applicationId: accepted.record.applicationId,
    submittedAt: accepted.record.submittedAt,
    delivery: deliveryStatus
  });
}

export default async (req, context) => {
  // Last-resort safety net. Worth being precise about what this does and
  // doesn't cover: this catches anything thrown by OUR code, at runtime,
  // once the handler has started running -- including a failed dynamic
  // import() of @netlify/blobs, which is exactly why that import was
  // changed from static to dynamic (see discovery-core.mjs). It can NOT
  // catch a failure in Netlify's own build/bundle step, or the function
  // failing to deploy or start at all -- those happen before this code
  // ever runs, and would show as the request never reaching here (a
  // platform-level failure visible in Netlify's Deploy or Function logs,
  // not something any amount of in-function error handling can address).
  try {
    return await handleRequest(req, context);
  } catch (e) {
    console.error('discovery-submit [' + (context && context.requestId) + ']: unhandled error:', e);
    return errorResponse('E_UNKNOWN', 500, context);
  }
};

export const config = {
  path: '/.netlify/functions/discovery-submit',
  method: ['POST'],
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: 'ip',
    windowSize: 60,
    windowLimit: 5
  }
};
