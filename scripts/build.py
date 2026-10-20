#!/usr/bin/env python3
"""
Builds the live static HTML pages from content/pages/*.yml + templates/*.html.

Pages CMS edits the YAML files under content/. This script turns them back
into the real, GitHub-Pages-servable HTML files (index.html, about/index.html,
etc.) by substituting {{field.path}} tokens in the templates. It is the only
thing that writes to the published page files — run it after any content
change, or let .github/workflows/build-content.yml run it automatically.

Usage: python3 scripts/build.py
Exits non-zero (and writes nothing) if a template references a content field
that doesn't exist, or if any {{...}} token is left unresolved.
"""
import hashlib
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("Missing dependency: run `pip install pyyaml` first.")

ROOT = Path(__file__).resolve().parent.parent
TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")

GA4_MEASUREMENT_ID = "G-GQCMZ08WTJ"
GA4_PRODUCTION_HOSTNAME = "everyoneneedsakatiewest.com"

# Manifest keys that must never receive analytics, in any environment.
# The discovery application collects real prospective-client answers.
# Any future private/authenticated page (an "Elevate HQ" admin area, a
# client portal) must be added here at the time it's added to the
# manifest, by default — tracking on a private page is something to
# opt into deliberately, not something a page inherits automatically
# just by existing.
ANALYTICS_EXCLUDED_KEYS = {"discovery"}


def ga4_snippet():
    """Google Analytics (GA4), injected once here rather than hand-pasted
    into each template, so every current page — and every future page
    added to content/manifest.yml — carries it automatically with no
    risk of a template being missed.

    Gated at runtime to the real production hostname: scripts/build.py
    renders identical HTML regardless of which branch triggers it, so a
    build-time check can't tell a review-branch deploy apart from
    production. Netlify branch deploys are served from a different
    hostname (<branch>--elevateconsultingconcierge.netlify.app), so this
    check keeps review/testing traffic out of real analytics data without
    needing two different builds.
    """
    return (
        "<script>\n"
        "(function () {\n"
        f"  if (location.hostname !== '{GA4_PRODUCTION_HOSTNAME}') return;\n"
        "  window.dataLayer = window.dataLayer || [];\n"
        "  function gtag() { dataLayer.push(arguments); }\n"
        "  window.gtag = gtag;\n"
        "  gtag('js', new Date());\n"
        f"  gtag('config', '{GA4_MEASUREMENT_ID}');\n"
        "  var s = document.createElement('script');\n"
        "  s.async = true;\n"
        f"  s.src = 'https://www.googletagmanager.com/gtag/js?id={GA4_MEASUREMENT_ID}';\n"
        "  document.head.appendChild(s);\n"
        "})();\n"
        "</script>\n"
    )


def load_yaml(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def flatten(d, prefix=""):
    """{'a': {'b': 'x'}} -> {'a.b': 'x'}"""
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + "."))
        else:
            out[key] = "" if v is None else str(v)
    return out


def esc(s):
    """HTML-escape a plain-text content value before inserting it into a template."""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render(template_text, context, source_label):
    missing = []

    def repl(m):
        key = m.group(1)
        if key not in context:
            missing.append(key)
            return m.group(0)
        return esc(context[key])

    out = TOKEN_RE.sub(repl, template_text)
    if missing:
        raise SystemExit(
            f"[build] {source_label}: missing content for field(s): "
            + ", ".join(sorted(set(missing)))
        )
    leftover = TOKEN_RE.findall(out)
    if leftover:
        raise SystemExit(
            f"[build] {source_label}: unresolved placeholder(s) after render: {leftover}"
        )
    return out


def file_version(*paths):
    """Short hash of the given files, appended as a cache-busting query
    string on their tag(s). Without this, a CSS/JS-only fix (no content/
    template changes) can look "unfixed" on a reviewer's end for no code
    reason at all — same URL, same path, so the browser's own cache (and
    Netlify's edge cache, validated against that same unchanged URL) can
    keep serving the pre-fix bytes after a deploy that genuinely shipped
    the fix. Changing the URL on every asset change forces a real fetch
    instead of relying on a hard refresh to notice. Scoped per asset
    group (shared v4.*, discovery-only) so changing one doesn't bust
    caches for pages that don't use it."""
    data = b"".join((ROOT / p).read_bytes() for p in paths if (ROOT / p).exists())
    return hashlib.sha256(data).hexdigest()[:10]


def main():
    manifest = load_yaml(ROOT / "content" / "manifest.yml")
    v4_version = file_version("assets/css/v4.css", "assets/js/v4.js")
    discovery_version = file_version("assets/css/discovery.css", "assets/js/discovery.js")

    nav = flatten(load_yaml(ROOT / "content" / "shared" / "navigation.yml"), "nav.")
    footer_minimal = flatten(
        load_yaml(ROOT / "content" / "shared" / "footer-minimal.yml"), "footer."
    )
    footer_full = flatten(
        load_yaml(ROOT / "content" / "shared" / "footer-full.yml"), "footer."
    )

    changed = []
    for entry in manifest["pages"]:
        key = entry["key"]
        template_path = ROOT / entry["template"]
        content_path = ROOT / entry["content"]
        output_path = ROOT / entry["output"]

        page = flatten(load_yaml(content_path))
        footer = footer_full if entry.get("footer", "full") == "full" else footer_minimal
        context = {**page, **nav, **footer}

        template_text = template_path.read_text(encoding="utf-8")
        rendered = render(template_text, context, key)
        rendered = rendered.replace(
            'href="/assets/css/v4.css"', f'href="/assets/css/v4.css?v={v4_version}"'
        ).replace(
            'src="/assets/js/v4.js"', f'src="/assets/js/v4.js?v={v4_version}"'
        ).replace(
            'href="/assets/css/discovery.css"',
            f'href="/assets/css/discovery.css?v={discovery_version}"'
        ).replace(
            'src="/assets/js/discovery.js"',
            f'src="/assets/js/discovery.js?v={discovery_version}"'
        )

        if key not in ANALYTICS_EXCLUDED_KEYS:
            rendered = rendered.replace("</head>", ga4_snippet() + "</head>")

        old = output_path.read_text(encoding="utf-8") if output_path.exists() else None
        if rendered != old:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(rendered, encoding="utf-8")
            changed.append(str(entry["output"]))

    print(f"[build] {len(manifest['pages'])} page(s) processed, {len(changed)} changed:")
    for c in changed:
        print(f"  - {c}")


if __name__ == "__main__":
    main()
