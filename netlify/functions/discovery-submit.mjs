/* HTTP entry point for /discovery/ submissions. Orchestrates the
   delivery-agnostic core (validate, sanitize, idempotent accept) and
   the pluggable delivery channels (Sheets, email) -- see lib/
   discovery-core.mjs for why those are kept separate. A future CRM
   delivery channel is added here as one more awaited call alongside
   deliverToGoogleSheets, fed the same canonical record, never touching
   validation or the client. */

import { validateSubmission, buildCanonicalRecord, acceptOnce } from './lib/discovery-core.mjs';
import { deliverToGoogleSheets } from './lib/deliver-sheets.mjs';
import { sendNotificationEmail } from './lib/deliver-email.mjs';

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  var body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'invalid_json' }, 400);
  }

  var validation = validateSubmission(body);
  if (!validation.ok) {
    return json({ error: 'invalid_submission', details: validation.errors }, 422);
  }

  var canonicalRecord = buildCanonicalRecord(body);

  var accepted;
  try {
    accepted = await acceptOnce(canonicalRecord, context);
  } catch (e) {
    console.error('discovery-submit: accept failed', e);
    return json({ error: 'accept_failed' }, 502);
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
      console.error('discovery-submit: sheets delivery failed', e);
      deliveryStatus.sheets = 'failed';
    }

    try {
      await sendNotificationEmail(accepted.record, sheetTab || 'unknown');
      deliveryStatus.email = 'ok';
    } catch (e) {
      console.error('discovery-submit: email delivery failed', e);
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
