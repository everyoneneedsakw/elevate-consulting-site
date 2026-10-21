/* Delivery-agnostic core: validate, sanitize, build one canonical record,
   and durably accept it exactly once per applicationId. Every delivery
   channel (Google Sheets today, a future CRM) is fed this same canonical
   record from the handler -- nothing here knows Sheets or Gmail exist,
   so adding a new delivery channel later never touches this file. */

import { FIELDS, REQUIRED_FIELD_IDS, FIELD_BY_ID } from './discovery-schema.mjs';

// Loaded dynamically, inside a function body, rather than as a static
// top-level import. A static `import { getStore } from '@netlify/blobs'`
// that fails to resolve on the platform (a bundling/dependency problem)
// crashes the entire module before any of our own code runs -- including
// the try/catch in the handler -- producing an opaque platform-level 502
// with no diagnostic information. Deferring it to a dynamic import lets
// us catch that specific failure and report it plainly instead.
async function loadBlobsStore() {
  var mod = await import('@netlify/blobs');
  return mod.getStore;
}

const FORM_VERSION = '2.0.0';

// A cell value starting with one of these is treated by many spreadsheet
// apps as a formula. Prefixing with a plain apostrophe forces text
// interpretation, matching Google Sheets' own escape convention.
const FORMULA_LEAD_CHARS = ['=', '+', '-', '@'];

function sanitizeScalar(v) {
  if (typeof v !== 'string') return v;
  var trimmed = v.trim();
  if (trimmed && FORMULA_LEAD_CHARS.indexOf(trimmed[0]) !== -1) {
    return "'" + trimmed;
  }
  return trimmed;
}

function sanitizeAnswerValue(raw) {
  if (Array.isArray(raw)) return raw.map(sanitizeScalar);
  return sanitizeScalar(raw);
}

function isBlankAnswer(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === '';
}

/**
 * Validates the raw client payload's shape and required fields.
 * Returns { ok: true } or { ok: false, errors: string[] }.
 */
export function validateSubmission(body) {
  var errors = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['invalid_payload'] };
  if (!body.applicationId || typeof body.applicationId !== 'string') errors.push('missing_application_id');
  if (!body.answers || typeof body.answers !== 'object') errors.push('missing_answers');
  if (errors.length) return { ok: false, errors: errors };

  REQUIRED_FIELD_IDS.forEach(function (id) {
    if (isBlankAnswer(body.answers[id])) errors.push('missing_required:' + id);
  });

  // Reject anything claiming to be an answer to a field we don't know
  // about -- a stale client or a crafted request shouldn't be able to
  // smuggle arbitrary keys into the canonical record or the Sheet.
  var knownIds = new Set(FIELDS.map(function (f) { return f.id; }));
  FIELDS.forEach(function (f) { if (f.otherField) knownIds.add(f.otherField); });
  Object.keys(body.answers).forEach(function (k) {
    if (!knownIds.has(k)) errors.push('unknown_field:' + k);
  });

  return { ok: errors.length === 0, errors: errors };
}

/**
 * Builds the canonical, sanitized record from a validated payload.
 * This -- not the raw request body -- is what every delivery channel
 * receives. submittedAt is server-assigned, never trusted from the client.
 */
export function buildCanonicalRecord(body) {
  var answers = {};
  FIELDS.forEach(function (f) {
    var raw = body.answers[f.id];
    answers[f.id] = isBlankAnswer(raw) ? (f.type === 'multi' ? [] : '') : sanitizeAnswerValue(raw);
    if (f.otherField && body.answers[f.otherField] !== undefined) {
      answers[f.otherField] = sanitizeScalar(body.answers[f.otherField]);
    }
  });
  return {
    applicationId: body.applicationId,
    formVersion: FORM_VERSION,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
    answers: answers
  };
}

function acceptedStore(context) {
  // Scoped by environment so review-branch testing can never collide
  // with real accepted applications -- same reasoning as the Sheet's
  // Applications/Test Submissions tab split, applied to the durable
  // acceptance ledger itself.
  var env = (context.deploy && context.deploy.context === 'production') ? 'production' : 'test';
  return env;
}

var DELIVERY_CHANNELS = ['sheets', 'email'];
var DELIVERY_PENDING = { sheets: 'pending', email: 'pending' };

// Normalizes a record's delivery sub-object for records written before
// this tracking existed (e.g. the two real crashed attempts that hit the
// old library-version bug: they wrote a plain record with no `delivery`
// field at all, having crashed before reaching this point). Treated as
// fully pending, never as already-delivered -- the whole reason this
// exists is to stop an incomplete submission from being read as finished.
function normalizeDelivery(record) {
  var d = (record && record.delivery) || {};
  return {
    sheets: d.sheets === 'ok' ? 'ok' : 'pending',
    email: d.email === 'ok' ? 'ok' : 'pending'
  };
}

async function getBlobsStore(context) {
  var getStore;
  try {
    getStore = await loadBlobsStore();
  } catch (e) {
    throw new Error('blobs_module_unavailable: ' + (e && e.message));
  }
  try {
    return getStore('discovery-accepted-' + acceptedStore(context));
  } catch (e) {
    throw new Error('blobs_store_init_failed: ' + (e && e.message));
  }
}

/**
 * Idempotent accept: if this applicationId was already accepted, returns
 * the previously-stored record (with its delivery status normalized, see
 * above) instead of creating a new one -- a retried request can never
 * produce a second accepted record. If this is the first acceptance,
 * stores the canonical record with both delivery channels pending and
 * returns it. Either way, the caller is responsible for checking
 * record.delivery per channel and retrying whichever isn't 'ok' yet --
 * "a record exists" is never treated as "delivery is done".
 *
 * Throws a plain Error with a specific, non-secret message on failure --
 * never lets an unexpected exception reach the caller unlabeled. The
 * handler is responsible for turning that into a clean JSON response.
 */
export async function acceptOnce(canonicalRecord, context) {
  var store = await getBlobsStore(context);
  var key = canonicalRecord.applicationId;
  var recordToStore = Object.assign({}, canonicalRecord, { delivery: Object.assign({}, DELIVERY_PENDING) });

  var result;
  try {
    result = await store.setJSON(key, recordToStore, { onlyIfNew: true });
  } catch (e) {
    throw new Error('blobs_write_failed: ' + (e && e.message));
  }

  if (result.modified) {
    return { record: recordToStore };
  }

  try {
    var existing = await store.get(key, { type: 'json' });
    var record = existing || recordToStore;
    record.delivery = normalizeDelivery(record);
    return { record: record };
  } catch (e) {
    throw new Error('blobs_read_failed: ' + (e && e.message));
  }
}

/**
 * Persists that a delivery channel succeeded for this applicationId, so
 * a future retry won't re-deliver it. A plain (non-conditional)
 * read-modify-write -- intentionally last-write-wins, which is fine at
 * this volume (one submission at a time, guarded client-side and by
 * rate limiting) and keeps this from depending on @netlify/blobs'
 * onlyIfMatch retry dance for a low-stakes status flag. If this write
 * itself fails right after a real Sheets/email success, the channel
 * would be retried on a future attempt -- a disclosed, accepted
 * residual risk rather than a silent one; see the delivery channels'
 * own idempotency (Sheets dedup is not implemented at this volume).
 */
export async function recordDeliverySuccess(applicationId, channel, context) {
  if (DELIVERY_CHANNELS.indexOf(channel) === -1) {
    throw new Error('unknown_delivery_channel: ' + channel);
  }
  var store = await getBlobsStore(context);
  var current = await store.get(applicationId, { type: 'json' });
  if (!current) return; // nothing to update -- shouldn't happen, not fatal either way
  current.delivery = normalizeDelivery(current);
  current.delivery[channel] = 'ok';
  await store.setJSON(applicationId, current);
}
