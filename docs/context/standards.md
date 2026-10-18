# Accessibility, Mobile, Performance & SEO Standards

These are the baseline bars for this site — use them when evaluating or
building, and flag regressions against them.

## Accessibility

- `aria-current="page"` on the active nav link (desktop + mobile drawer),
  per page
- `aria-label` on landmark regions (`nav`, mobile drawer, footer social
  icons) and on icon-only controls
- `prefers-reduced-motion: reduce` disables all animation durations
  (`.001ms`) and the `.v4-reveal` fade-up (content shows immediately,
  `opacity: 1`) — this must keep working regardless of future motion changes
- Manual **Pause Motion** control as a second, always-available way to stop
  motion (not everyone who wants stillness has `prefers-reduced-motion` set
  at the OS level)
- Focus-visible outlines on links/buttons (`outline: 3px solid var(--mauve)`)
  — don't let a redesign silently remove focus states
- Decorative elements (`.orb-scroll`, SVG arrows) are `aria-hidden="true"`

## Mobile / responsive

- Single `v4.css` with `@media (max-width: 880px)` nav breakpoint (switches
  to hamburger + full-screen drawer) and `760px` / `460px` breakpoints for
  typography/layout scaling
- Mobile drawer repeats every desktop nav destination — nothing is
  desktop-only
- Orb scales/repositions rather than disappearing on mobile (opacity reduced,
  not removed) — it's part of the brand, not just a desktop flourish

## Performance

- No build framework, no JS bundler, no heavy dependencies for the site
  itself — `v4.js` is hand-written vanilla JS (~160 lines)
- Orb motion is driven by a continuous `requestAnimationFrame` lerp, not a
  CSS transition per scroll event (avoids stutter, see `design-system.md`)
- Fonts: Google Fonts with `preconnect`, single stylesheet request
- Images: currently a known gap (see `roadmap.md` — the About hero photo
  placeholder) — when real images are added, they need explicit width/height
  or `aspect-ratio` to avoid layout shift, and reasonable compression

## SEO

- Every page has its own `<title>`, `meta description`, `og:title`,
  `og:description`, `og:url`, `og:type`, `twitter:card`, and canonical URL —
  all preserved through the CMS content/template split (title/description
  are editable fields; canonical/og:url are fixed, see `cms-and-deploy.md`)
- "Coming Soon" stub pages (Privacy Policy, Terms, two Services detail pages)
  are marked `noindex, follow` intentionally — don't remove that without
  checking the page has real content first
- URLs are clean, lowercase, hyphenated, and stable — never change a URL
  structure without explicit approval (breaks any existing backlinks/bookmarks)
