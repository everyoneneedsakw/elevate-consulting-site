# Discovery Application — field mapping (for the future Elevate CRM)

This documents the stable field names a completed Discovery Application
carries, independent of how it's currently delivered (Google Sheets today).
When the custom Elevate CRM exists, it should consume the same canonical
record shape described here — built once in `netlify/functions/lib/
discovery-core.mjs` — rather than parsing the Google Sheet. Field **names**
are the stable contract; field **order/labels** in the Sheet are a
presentation detail and may change without affecting this mapping.

## Envelope (every submission)

| Field | Type | Notes |
|---|---|---|
| `applicationId` | string (UUID) | Generated client-side on first visit to `/discovery/`. Stable across the whole draft → submit lifecycle. This is the identifier a future CRM should use to link an application to a contact/client record — never ask a client to repeat answers because this got lost. |
| `formVersion` | string (semver-ish, e.g. `"2.0.0"`) | Bumped whenever the question schema changes meaning, not on copy-only edits. Lets the CRM know which question set produced a given record. |
| `submittedAt` | string (ISO 8601 UTC) | Server-assigned at the moment of durable acceptance — **not** the client-supplied `createdAt` (when they started the form), which is a separate, less trustworthy value since it comes from the browser. |
| `status` | `"submitted"` | Reserved for future values (e.g. a CRM-side pipeline stage) without renaming this field. |

## Answers (`answers.*`)

Each entry is `{ value, otherText? }`. `value` is a string for text/email/
tel/textarea questions, or an array of strings for multi-select questions
(the full set of checked options, in the order they appear in the question
— nothing is collapsed or summarized). `otherText` is present only when
`"Other"` was selected and holds the free-text write-in verbatim.

| Field name | Type | Question # | Required |
|---|---|---|---|
| `applicant_name` | text | 1 | yes |
| `applicant_email` | email | 2 | yes |
| `applicant_phone` | tel | 3 | no |
| `business_name` | text | 4 | yes |
| `business_description` | text | 5 | yes |
| `industry_types` | multi | 6 | yes |
| `business_support` | multi | 7 | yes |
| `online_presence` | text | 8 | no |
| `vision_6_12_months` | text | 9 | yes |
| `vision_ideas` | text | 10 | no |
| `goals_90_days` | text | 11 | yes |
| `strengths` | text | 12 | no |
| `challenges_time_energy` | text | 13 | yes |
| `challenges_one_fix` | text | 14 | yes |
| `sales_process` | text | 15 | yes |
| `client_tracking` | text | 16 | yes |
| `tools_in_use` | text | 17 | no |
| `info_gaps` | text | 18 | no |
| `client_experience_goal` | text | 19 | no |
| `support_areas` | multi (max 3) | 20 | yes |
| `support_preference_detail` | text | 21 | yes |
| `barriers` | multi | 22 | no |
| `budget_thoughts` | text | 23 | no |
| `follow_through_style` | text | 24 | no |
| `timeline` | multi | 25 | yes |
| `timeline_context` | text | 25 (sub-field) | no |
| `reach_out_reason` | text | 26 | no |
| `anything_else` | text | 27 | no |

## Durability and retries

The canonical record above is written once to a delivery-agnostic,
idempotent store (Netlify Blobs, keyed by `applicationId`) as the source of
truth for "this application was accepted" — before any delivery channel
(Sheets, and later the CRM) is attempted. A retried submission with the
same `applicationId` returns the prior accepted result rather than writing
a second record anywhere. A future CRM integration reads from this same
accepted-record store (or is pushed to from it), not from re-parsing
delivery-channel output like a spreadsheet.
