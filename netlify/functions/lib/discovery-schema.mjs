/* Server-side mirror of the question schema in assets/js/discovery.js --
   only what validation needs (id, type, required), not full copy/options.
   Keep in sync with that file and docs/context/discovery-field-mapping.md
   whenever the question set changes. Duplicated rather than imported
   because the client file is a browser IIFE that touches `window`/
   `document` and isn't safely importable into a serverless Node context. */

export const FIELDS = [
  { id: 'applicant_name', type: 'text', required: true },
  { id: 'applicant_email', type: 'email', required: true },
  { id: 'applicant_phone', type: 'tel', required: false },
  { id: 'business_name', type: 'text', required: true },
  { id: 'business_description', type: 'text', required: true },
  { id: 'industry_types', type: 'multi', required: true, otherField: 'industry_types_other' },
  { id: 'business_support', type: 'multi', required: true, otherField: 'business_support_other' },
  { id: 'online_presence', type: 'text', required: false },
  { id: 'vision_6_12_months', type: 'text', required: true },
  { id: 'vision_ideas', type: 'text', required: false },
  { id: 'goals_90_days', type: 'text', required: true },
  { id: 'strengths', type: 'text', required: false },
  { id: 'challenges_time_energy', type: 'text', required: true },
  { id: 'challenges_one_fix', type: 'text', required: true },
  { id: 'sales_process', type: 'text', required: true },
  { id: 'client_tracking', type: 'text', required: true },
  { id: 'tools_in_use', type: 'text', required: false },
  { id: 'info_gaps', type: 'text', required: false },
  { id: 'client_experience_goal', type: 'text', required: false },
  { id: 'support_areas', type: 'multi', required: true, otherField: 'support_areas_other' },
  { id: 'support_preference_detail', type: 'text', required: true },
  { id: 'barriers', type: 'multi', required: false, otherField: 'barriers_other' },
  { id: 'budget_thoughts', type: 'text', required: false },
  { id: 'follow_through_style', type: 'text', required: false },
  { id: 'timeline', type: 'multi', required: true },
  { id: 'timeline_context', type: 'text', required: false },
  { id: 'reach_out_reason', type: 'text', required: false },
  { id: 'anything_else', type: 'text', required: false }
];

export const REQUIRED_FIELD_IDS = FIELDS.filter(f => f.required).map(f => f.id);
export const FIELD_BY_ID = Object.fromEntries(FIELDS.map(f => [f.id, f]));

// Column order for the Google Sheet tabs -- see docs/context/
// discovery-field-mapping.md. Kept separate from FIELDS because this is
// a presentation detail of one specific delivery channel, not part of
// the canonical record shape.
export const SHEET_COLUMNS = [
  'applicationId', 'submittedAt', 'formVersion',
  ...FIELDS.map(f => f.id)
];
