# Roadmap — Future Digital Products & Brand Expansion

Nothing in this file is approved for implementation. It exists so future
planning starts from shared context instead of from scratch each time.
Each item needs its own scoping/approval pass before work begins.

## 1. Professional founder portrait

- About page already has the layout slot built and waiting: the
  `.v4-photo-placeholder` div in `about/index.html`'s hero section, with
  the exact replacement markup already commented inline:
  `<img src="/assets/images/katie/about-hero.jpg" alt="Katie West, Operations Consultant, Elevate Consulting">`
- 4:5 aspect ratio, max-width 360px, positioned beside the hero headline
- CMS fields already exist for the caption text (`hero.photo_name`,
  `hero.photo_title1`, `hero.photo_title2`)
- **Blocked on:** Katie supplying the approved photograph. Do not generate
  a substitute image or alter facial features in any supplied photo — this
  is a real person's likeness, not a design asset to interpret freely.
- When ready: drop the file at the exact path above; the existing CSS
  should need no changes.

## 2. Paid digital templates / downloads ("Systems Shop")

- Homepage already has a "Systems Shop" section, explicitly marked
  **Coming Soon** with no live pricing or checkout (`.v4-shop__badge`) —
  this was a deliberate decision to avoid implying commerce that doesn't
  exist yet
- Future state: downloadable templates/playbooks (SOPs, Google Workspace
  setups, CRM templates) sold directly, extending the existing service
  offering into a productized/self-serve tier
- Needs: product content model (likely its own `content/pages/*.yml`
  entries or a small product catalog YAML), pricing display, and a real
  commerce backend (see #3)

## 3. Secure checkout & automatic delivery

- No payment processor or commerce platform is chosen yet. Needs its own
  evaluation pass against: PCI scope (prefer a hosted checkout — Stripe
  Checkout / Gumroad / Lemon Squeezy-style — over handling card data
  directly), file-delivery mechanism (signed/expiring download links rather
  than public static file URLs), and how this interacts with the current
  all-static-HTML hosting model (will likely need either a hosted
  commerce product or a small serverless function, not a new always-on
  backend)
- Must not compromise the current zero-backend simplicity of the main site
  without a clear reason — scope this as an additive capability, not a
  rebuild

## 4. Private / unlisted UGC portfolio, optional password protection

- A future section (likely a dedicated page, not part of main nav yet)
  showcasing client work/results that aren't meant for public search
  indexing or casual browsing — unlisted URL at minimum, with optional
  password-gating for specific pieces
- Needs: a decision on whether "password protection" means a simple shared
  password (client-side gate, low security but low complexity) or real
  per-client access — scope depends on how sensitive the content is
- Keep `noindex` on any such page regardless of password status

## 5. Future brand expansion

- The site currently represents Elevate Consulting specifically. Katie has
  indicated the broader brand may expand — potentially into additional
  service lines, the collaborator model mentioned in `founder-brand.md`, or
  a wider "Katie West" identity beyond Elevate alone
- No specific direction is locked in. When this becomes concrete, it likely
  affects: nav structure, the shared `content/shared/navigation.yml` and
  `footer-full.yml`, and possibly a sitewide rebrand pass — all of which
  should go through the same content-freeze and design-approval discipline
  as everything else in this repo, not be treated as a special case
