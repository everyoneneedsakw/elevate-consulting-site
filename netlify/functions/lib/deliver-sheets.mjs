/* Delivery channel: appends one row to the Elevate Discovery Applications
   Sheet. Knows nothing about validation or idempotency -- the caller
   guarantees this canonical record should be delivered exactly once. A
   future deliver-crm.mjs would be an equally self-contained sibling,
   called alongside this one from the handler, not instead of it. */

import { getGoogleAccessToken } from './google-auth.mjs';
import { SHEET_COLUMNS } from './discovery-schema.mjs';

function answerToCell(value) {
  if (Array.isArray(value)) return value.join('; ');
  return value == null ? '' : String(value);
}

function tabNameForContext(context) {
  var isProduction = context.deploy && context.deploy.context === 'production';
  return isProduction ? 'Applications' : 'Test Submissions';
}

export async function deliverToGoogleSheets(record, context) {
  var sheetId = Netlify.env.get('GOOGLE_SHEET_ID');
  if (!sheetId) throw new Error('google_sheet_id_not_configured');

  var accessToken = await getGoogleAccessToken();
  var tab = tabNameForContext(context);

  var row = SHEET_COLUMNS.map(function (col) {
    if (col === 'applicationId') return record.applicationId;
    if (col === 'submittedAt') return record.submittedAt;
    if (col === 'formVersion') return record.formVersion;
    var value = record.answers[col];
    var field = record.answers[col + '_other'];
    var cell = answerToCell(value);
    if (field) cell = cell ? cell + ' (Other: ' + field + ')' : 'Other: ' + field;
    return cell;
  });

  var range = encodeURIComponent(tab) + '!A1';
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetId +
    '/values/' + range + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS';

  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + accessToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ values: [row] })
  });

  if (!res.ok) {
    var errText = await res.text().catch(function () { return ''; });
    throw new Error('sheets_append_failed:' + res.status + ':' + errText.slice(0, 300));
  }

  return { tab: tab };
}
