/* Delivery channel: sends the notification email via Gmail, authenticated
   as katie@everyoneneedsakatiewest.com through the same OAuth credential
   used for Sheets. Failure here is caught by the caller and never blocks
   the durable acceptance already recorded by discovery-core.mjs. */

import { getGoogleAccessToken } from './google-auth.mjs';

var NOTIFY_TO = 'katie@everyoneneedsakatiewest.com';
var NOTIFY_FROM = 'katie@everyoneneedsakatiewest.com';

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function answerLine(label, value) {
  var display = Array.isArray(value) ? value.join(', ') : (value || '—');
  return label + ': ' + display;
}

function buildPlainTextBody(record) {
  var a = record.answers;
  var lines = [
    'New Discovery Application',
    '',
    'Application ID: ' + record.applicationId,
    'Submitted: ' + record.submittedAt,
    '',
    answerLine('Name', a.applicant_name),
    answerLine('Email', a.applicant_email),
    answerLine('Phone', a.applicant_phone),
    answerLine('Business', a.business_name),
    '',
    'Full answers are in the Elevate Discovery Applications Sheet.'
  ];
  return lines.join('\n');
}

export async function sendNotificationEmail(record, tab) {
  var accessToken = await getGoogleAccessToken();
  var subject = 'New Discovery Application: ' + (record.answers.applicant_name || 'Unnamed');
  var body = buildPlainTextBody(record) + '\n\nDelivered to Sheet tab: ' + tab;

  var raw = [
    'To: ' + NOTIFY_TO,
    'From: ' + NOTIFY_FROM,
    'Subject: ' + subject,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body
  ].join('\r\n');

  var res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + accessToken,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ raw: base64UrlEncode(raw) })
  });

  if (!res.ok) {
    var errText = await res.text().catch(function () { return ''; });
    throw new Error('gmail_send_failed:' + res.status + ':' + errText.slice(0, 300));
  }
}
