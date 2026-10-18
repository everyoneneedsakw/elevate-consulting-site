# V4 Cinematic Design System (approved — evaluate, don't redesign)

The current visual direction is approved and signed off. Design skills
(Taste Skill, Impeccable, Emil Kowalski's animation skills) are for
**evaluating** this system against its own stated goals and flagging
deviations/opportunities — not for proposing a different aesthetic.

## Direction

Premium, cinematic, editorial, bold, sophisticated, personable. Inspired by
Apple/Moooi-style scroll choreography — stillness and motion alternating
deliberately, not constant movement. Explicitly rejects: generic SaaS
layouts, excessive card grids, random/decorative gradients, stock AI imagery,
unnecessary effects, emoji-style icons.

## Color tokens (`assets/css/v4.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--night` | `#151218` | primary dark background (charcoal) |
| `--night-deep` | `#0f0d12` | deeper charcoal, mobile drawer bg |
| `--cream` | `#f8f4ee` | light sections, primary light text (ivory) |
| `--mauve` | `#b58a8a` | signature accent — orb, italics, links, primary CTA |
| `--bronze` | `#b79063` | secondary accent — eyebrows, numbered labels |
| `--muted` | `#bdb5b7` | secondary/muted text |
| `--emerald` | `#174c3c` | roofing-only accent (`.v4-industry--emerald` swaps mauve → emerald, a lighter `#2f8066` for links/italics) |

Do not introduce new colors outside this palette without approval.

## Typography

- `DM Sans` (400–900) — primary sans, all body/UI text
- `DM Serif Display` (italic) — the signature italic accent word/phrase inside
  headlines (e.g. "Better" in "BIG IDEAS. *Better* SYSTEMS."), always
  `var(--mauve)`, always `font-style: italic`
- Display headlines: uppercase, `font-weight: 900`, tight letter-spacing
  (`-.09em` to `-.045em`), huge `clamp()` sizes

## The orb

`assets/js/v4.js` — three independently-pausable transform layers:
1. **Scroll choreography** (homepage only, `#orbStage`) — waypoint array
   (`p`, `x`, `y`, `scale`) lerped continuously via `requestAnimationFrame`
   (not a CSS transition — avoids stutter on fast/uneven scroll), with
   `frontZones` toggling `.is-front` so the orb deliberately crosses in front
   of specific headlines
2. **Pointer parallax** (`#orbPointer`) — subtle, desktop-only
   (`hover: hover` + `pointer: fine`), present on every page
3. **Idle float** (`.orb-idle`) — gentle `@keyframes` breathing animation,
   always on

Interior/reading pages (About, Services, Industries, etc.) use the calmer
`.orb-static` variant — idle float + pointer parallax only, no scroll
choreography. The homepage is the only page with the full dramatic sweep.

**Pause Motion** control (`#v4PauseMotion`) and `prefers-reduced-motion`
both route through one `is-motion-paused` state — respect both when
evaluating or touching motion.

## Component vocabulary (`assets/css/v4.css`)

Reuse these; don't invent parallel ones:
`.v4-hero`, `.v4-chapter` / `.v4-chapter.cream`, `.v4-display`, `.v4-eyebrow`,
`.v4-copy`, `.v4-link`, `.v4-card` / `.v4-card-row`, `.v4-check-list` /
`.v4-check-item`, `.v4-stat-row` / `.v4-stat-num` / `.v4-stat-label`,
`.v4-tag-row` / `.v4-tag`, `.v4-grid-2`, `.v4-service-list`, `.v4-reveal`
(scroll-triggered fade-up), `.v4-foot` (homepage minimal) / `.v4-foot--full`
(every other page).

## Icons

No emoji, no oversized symbols. A single shared thin-line SVG arrow
(`.v4-arrow`, with `--up`/`--down` rotation variants) used everywhere a
directional cue is needed, with a subtle 3px hover nudge — never a bounce.

## Known pre-existing quirks (not bugs to silently fix)

- Homepage brand mark is all-caps ("ELEVATE CONSULTING."); every other page
  is mixed-case ("Elevate Consulting"). Approved, intentional difference.
- Homepage footer is the minimal single-line `.v4-foot`; every other page
  uses the full 4-column `.v4-foot--full`. Approved, intentional difference.
