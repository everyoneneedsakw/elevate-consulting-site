# CMS, Build Process & Deployment Workflow

## The content/template split

The site's wording lives separately from its HTML structure specifically so
Katie can edit copy through Pages CMS without touching code:

```
content/pages/<key>.yml      one file per page — every headline, paragraph,
                              button label as a labeled field
content/shared/navigation.yml   sitewide nav text (identical on all 15 pages,
                                 edited once)
content/shared/footer-full.yml  the full 4-column footer (14 of 15 pages)
content/shared/footer-minimal.yml  the homepage's single-line footer
templates/<key>.html         the real page markup with {{field.path}}
                              placeholders standing in for the text fields
content/manifest.yml         maps key → template + content + output path +
                              footer variant, for every page
scripts/build.py             reads manifest + content + templates, renders
                              {{tokens}}, writes the real page files
                              (index.html, about/index.html, etc.)
.pages.yml                   Pages CMS's own config — generated, not
                              hand-written; regenerate with
                              scripts/generate_pages_config.py after adding
                              a field or page
```

**Links, hrefs, canonical URLs, and page structure are deliberately NOT in
the YAML** — they live only in the templates, so the CMS physically cannot
break a link or change a URL. SEO title/description/OG tags ARE editable
content fields (they're wording), but canonical/og:url stay fixed.

## Running the build

```
pip install pyyaml
python3 scripts/build.py
```

Fails loudly (exits non-zero, writes nothing) if a template references a
field that doesn't exist in its content file, or if any `{{...}}` is left
unresolved — never silently ships a broken page.

## Automatic rebuild

`.github/workflows/build-content.yml` runs on every push to
`elevate-cinematic-v4-review` that touches `content/**`, `templates/**`, or
`scripts/build.py`, rebuilds, and commits the regenerated HTML back to the
same branch if anything changed. This is what makes a Pages CMS save turn
into a real page update automatically.

## Branches

- **`elevate-cinematic-v4-review`** — the only branch anyone (Katie or
  Claude) edits right now. Pages CMS is configured against this branch.
  Netlify's preview deploy watches this branch.
- **`main`** — production. GitHub Pages serves the live site
  (everyoneneedsakatiewest.com) from here. **Never push, merge, or rebuild
  into `main` without being explicitly asked to.** Merging
  `elevate-cinematic-v4-review` → `main` is a deliberate, separate,
  human-approved step — it is the actual "go live" action.

## Pages CMS access

Katie signs in at app.pagescms.org with her GitHub account, selects this
repo, and **must select the `elevate-cinematic-v4-review` branch** when
connecting (not `main` — `main` has no `.pages.yml`, so the CMS can't even
configure itself against it). This is an intentional safety property, not
an oversight: there is currently no way to accidentally edit production
content through the CMS.

## Impeccable's install (why no automatic hook)

Impeccable is installed project-scoped at `.claude/skills/impeccable`, with
its automatic PostToolUse/Stop hook deliberately **not** installed (no
`.claude/settings.json` was copied). Run it on demand via its commands
(e.g. an audit pass) rather than having it fire on every edit — this was an
explicit choice to avoid background execution changing files without a
human in the loop. If automatic auditing is wanted later, that's a separate,
explicit decision.
