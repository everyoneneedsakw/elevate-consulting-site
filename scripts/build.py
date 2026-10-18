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
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("Missing dependency: run `pip install pyyaml` first.")

ROOT = Path(__file__).resolve().parent.parent
TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")


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


def main():
    manifest = load_yaml(ROOT / "content" / "manifest.yml")

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
