# Elevate Consulting & Concierge — Project Guide

Static HTML/CSS/JS site for Elevate Consulting (Katie West), deployed via GitHub
Pages from `main`, with a Pages CMS content-editing layer in active development
on `elevate-cinematic-v4-review`. No build framework, no npm dependency tree for
the site itself — `scripts/build.py` (Python) is the only build step, and it
only touches the generated HTML pages.

## Read these before non-trivial work

Full context lives in `docs/context/`, one topic per file:

- `docs/context/business.md` — what Elevate does, who it's for, business goals
- `docs/context/founder-brand.md` — Katie West's founder-led brand and voice
- `docs/context/design-system.md` — the approved V4 cinematic visual identity
- `docs/context/content-freeze.md` — copy rules and what requires sign-off
- `docs/context/cms-and-deploy.md` — Pages CMS, build process, branches, deploy
- `docs/context/standards.md` — accessibility, mobile, performance, SEO bars
- `docs/context/roadmap.md` — what's coming next for the brand

## Non-negotiables (every session, every task)

1. **Branch discipline.** All work happens on `elevate-cinematic-v4-review` (or
   a branch based on it) unless explicitly told otherwise. Never merge to
   `main` or touch the live site without being asked to.
2. **Content freeze.** Do not reword approved copy — headlines, paragraphs,
   button labels, nav/footer text — without explicit approval. See
   `docs/context/content-freeze.md`. The About page headline
   ("I Don't Just Study Operations. I've Lived Inside Them.") is specifically
   locked.
3. **CMS architecture is load-bearing.** The real page files
   (`index.html`, `about/index.html`, etc.) are *generated* by
   `python3 scripts/build.py` from `templates/*.html` + `content/**/*.yml`.
   Never hand-edit a generated page's wording directly — edit the matching
   `content/pages/*.yml` (or `content/shared/*.yml` for sitewide nav/footer
   text) and rebuild. Structural/design changes happen in `templates/*.html`
   or `assets/css/v4.css` / `assets/js/v4.js`, never in the YAML.
4. **Design is approved — don't freelance it.** The V4 cinematic identity
   (orb, palette, typography, motion) is signed off. Evaluate and propose;
   don't redesign without explicit approval. See `docs/context/design-system.md`.
5. **SEO/URLs/links are structural, not content.** Hrefs, canonical URLs,
   and page paths are intentionally excluded from the CMS. Never change a
   URL without approval — Pages CMS fields can't do it, and neither should
   a direct edit.

## Tooling installed for this project

- **Taste Skill** (`design-taste-frontend`) — global, for design/taste evaluation
- **Emil Kowalski's animation skills** (`animate`, `review-animations`,
  `improve-animations`, `find-animation-opportunities`, `animation-performance`,
  `apple-design`) — global, for motion craft evaluation and implementation
- **Impeccable** (`.claude/skills/impeccable`) — project-scoped only, no
  automatic hook installed (declined on purpose — see
  `docs/context/cms-and-deploy.md` for why). Run on demand via its commands,
  not automatically on every edit.

## Quick orientation

```
index.html, about/index.html, ...      ← generated — do not hand-edit wording
templates/*.html                        ← page structure + {{field}} placeholders
content/pages/*.yml                     ← per-page editable wording (CMS-facing)
content/shared/*.yml                    ← sitewide nav/footer wording
content/manifest.yml                    ← maps template+content+output per page
scripts/build.py                        ← renders templates+content → live HTML
.pages.yml                              ← generated Pages CMS config (don't hand-edit;
                                           run scripts/generate_pages_config.py)
assets/css/v4.css, assets/js/v4.js      ← the actual design system
.github/workflows/build-content.yml     ← auto-rebuilds on content/template changes
```
