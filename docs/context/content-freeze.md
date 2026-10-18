# Content Freeze & Copy Approval

## The rule

Do not change approved wording — headlines, subheadlines, paragraphs, button
labels, nav/footer text, SEO metadata — without explicit sign-off. This
applies whether editing HTML/templates directly or the CMS content YAML.
Design, layout, spacing, and motion changes are fine; wording changes are not,
unless asked for.

## Specifically locked right now

- **The About page headline is locked to whatever Katie has it set to via
  Pages CMS right now** — treat `content/pages/about.yml`'s `hero.headline_line1`
  / `hero.headline_italic` as the source of truth, not any wording quoted in
  this repo's docs or in a prior conversation. It changed once already
  (originally *"I Don't Just Study Operations. I've Lived Inside Them,"*
  updated by Katie directly through Pages CMS to *"THE VISIONARY. THE
  STRATEGIST. The Problem-Solver."*) — that's the CMS working as designed,
  not a freeze violation. The freeze is about Claude not changing it without
  approval; it was never a restriction on Katie's own edits through her own
  editor. Never "correct" the live headline back to an older version you
  remember from context — always check the current YAML first.
- All other page copy across the 15 pages reflects a verified content
  freeze pass (word-diffed against the prior approved state when the V4
  rebuild happened) — treat it as the source of truth, with the same caveat
  that a real Pages CMS edit always wins over anything documented here.

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
