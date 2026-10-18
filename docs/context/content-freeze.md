# Content Freeze & Copy Approval

## The rule

Do not change approved wording — headlines, subheadlines, paragraphs, button
labels, nav/footer text, SEO metadata — without explicit sign-off. This
applies whether editing HTML/templates directly or the CMS content YAML.
Design, layout, spacing, and motion changes are fine; wording changes are not,
unless asked for.

## Specifically locked right now

- **About page headline is explicitly locked**: *"I Don't Just Study
  Operations. I've Lived Inside Them."* — do not change this under any
  circumstances without direct, explicit approval naming this headline.
- All current page copy across all 15 pages reflects a verified content
  freeze pass (word-diffed against the prior approved state when the V4
  rebuild happened) — treat it as the source of truth.

## Flagged for a future copy review (not yet approved to change)

- **"Free Audit"** — flagged as a possible rename candidate (e.g. a more
  premium-sounding offer name) in an earlier pass. Still live as-is. Do not
  change without a separate, explicit go-ahead.
- Homepage copy is scheduled for its own dedicated copywriting review later
  — don't preemptively "improve" homepage wording in the meantime.

## How to handle a wording change request

1. If the request explicitly names the copy to change and gives the new
   wording (or clearly authorizes drafting it) — proceed, and update the
   matching `content/pages/*.yml` or `content/shared/*.yml` field, then
   rebuild with `scripts/build.py`. Never hand-edit the generated HTML.
2. If a task incidentally requires touching a section with copy in it (e.g.
   a layout fix) — preserve the existing wording exactly, byte for byte.
3. If you notice copy that seems wrong, dated, or worth improving while
   doing unrelated work — flag it in your report; do not change it silently.
4. When in doubt, treat it as locked.

## Verification habit

After any content-adjacent change, it's worth a quick word-diff check
(strip tags, compare word-for-word) against the last-known-good version of
that page before considering the task done — this project has caught real
accidental copy drift this way more than once.
