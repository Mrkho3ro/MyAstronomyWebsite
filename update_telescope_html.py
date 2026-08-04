#!/usr/bin/env python3
"""Safely replace generic Tel-*.webp references with unique model images."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CREDITS = json.loads((ROOT / "telescopes" / "images" / "credits.json").read_text(encoding="utf-8"))

# Per file: ordered image filenames matching each ../Tel-*.webp in document order
ORDERED: dict[str, list[str]] = {
    "dobsonian.html": [
        "heritage-130p.webp",
        "apertura-ad8.webp",
        "starsense-explorer-8-dob.webp",
        "orion-xt10.webp",
        "heritage-130p.webp",
        "apertura-ad8.webp",
        "starsense-explorer-8-dob.webp",
        "orion-xt10.webp",
    ],
    "newtonian.html": [
        "astromaster-130eq.webp",
        "powerseeker-114eq.webp",
        "orion-skyline-8-dob.webp",
        "quattro-250p.webp",
        "astromaster-130eq.webp",
        "powerseeker-114eq.webp",
        "orion-skyline-8-dob.webp",
        "quattro-250p.webp",
    ],
    "refractor.html": [
        "travel-scope-70.webp",
        "evostar-72ed.webp",
        "nexstar-102slt.webp",
        "orion-ed80t.webp",
        "travel-scope-70.webp",
        "evostar-72ed.webp",
        "nexstar-102slt.webp",
        "orion-ed80t.webp",
    ],
    "schmidt-cassegrain.html": [
        "nexstar-6se.webp",
        "nexstar-8se.webp",
        "meade-lx200-10.webp",
        "celestron-114-lcm.webp",
        "nexstar-6se.webp",
        "nexstar-8se.webp",
        "meade-lx200-10.webp",
        "celestron-114-lcm.webp",
    ],
    "maksutov.html": [
        "skymax-127.webp",
        "nexstar-127slt.webp",
        "orion-apex-102.webp",
        "es-mak-180.webp",
        "skymax-127.webp",
        "nexstar-127slt.webp",
        "orion-apex-102.webp",
        "es-mak-180.webp",
    ],
    "radio.html": [
        "ibt.webp",
        "rtl-sdr-dish.webp",
        "green-bank-20m.webp",
        "vla.webp",
        "fast.webp",
        "ibt.webp",
        "rtl-sdr-dish.webp",
        "green-bank-20m.webp",
        "vla.webp",
        "fast.webp",
    ],
}

# Intro-block figcaptions in order (one per model, intro section only)
CAPTIONS: dict[str, list[str]] = {
    "dobsonian.html": [
        CREDITS["heritage-130p.webp"],
        CREDITS["apertura-ad8.webp"],
        CREDITS["starsense-explorer-8-dob.webp"],
        CREDITS["orion-xt10.webp"],
    ],
    "newtonian.html": [
        CREDITS["astromaster-130eq.webp"],
        CREDITS["powerseeker-114eq.webp"],
        CREDITS["orion-skyline-8-dob.webp"],
        CREDITS["quattro-250p.webp"],
    ],
    "refractor.html": [
        CREDITS["travel-scope-70.webp"],
        CREDITS["evostar-72ed.webp"],
        CREDITS["nexstar-102slt.webp"],
        CREDITS["orion-ed80t.webp"],
    ],
    "schmidt-cassegrain.html": [
        CREDITS["nexstar-6se.webp"],
        CREDITS["nexstar-8se.webp"],
        CREDITS["meade-lx200-10.webp"],
        CREDITS["celestron-114-lcm.webp"],
    ],
    "maksutov.html": [
        CREDITS["skymax-127.webp"],
        CREDITS["nexstar-127slt.webp"],
        CREDITS["orion-apex-102.webp"],
        CREDITS["es-mak-180.webp"],
    ],
    "radio.html": [
        CREDITS["ibt.webp"],
        CREDITS["rtl-sdr-dish.webp"],
        CREDITS["green-bank-20m.webp"],
        CREDITS["vla.webp"],
        CREDITS["fast.webp"],
    ],
}

TOOLS_CAROUSEL = [
    ("telescopes/dobsonian.html", "type-dobsonian.webp", "Dobsonian telescope on rocker-box mount"),
    ("telescopes/newtonian.html", "type-newtonian.webp", "Newtonian reflector on equatorial mount"),
    ("telescopes/refractor.html", "type-refractor.webp", "Achromatic refractor telescope"),
    ("telescopes/schmidt-cassegrain.html", "type-schmidt-cassegrain.webp", "Schmidt-Cassegrain catadioptric telescope"),
    ("telescopes/maksutov.html", "type-maksutov.webp", "Maksutov-Cassegrain compact telescope"),
    ("telescopes/radio.html", "type-radio.webp", "Radio telescope dish array"),
]


def replace_tel_images(html: str, images: list[str]) -> str:
    idx = 0
    pattern = re.compile(r'\.\./Tel-\d+\.webp')

    def repl(_: re.Match[str]) -> str:
        nonlocal idx
        if idx >= len(images):
            raise RuntimeError(f"More Tel-*.webp refs than mapped images ({len(images)})")
        path = f"images/{images[idx]}"
        idx += 1
        return path

    return pattern.sub(repl, html)


def update_figcaptions(html: str, captions: list[str]) -> str:
    idx = 0
    pattern = re.compile(r"(<figcaption>)[^<]*(</figcaption>)")

    def repl(m: re.Match[str]) -> str:
        nonlocal idx
        if idx >= len(captions):
            return m.group(0)
        credit = captions[idx]
        idx += 1
        short = credit.split(" — ")[0]
        photo = credit.split(" — ", 1)[-1]
        return f"{m.group(1)}{short}. Photo: {photo}{m.group(2)}"

    return pattern.sub(repl, html)


def update_telescope_page(path: Path) -> None:
    images = ORDERED[path.name]
    html = path.read_text(encoding="utf-8")
    html = replace_tel_images(html, images)
    html = update_figcaptions(html, CAPTIONS[path.name])
    path.write_text(html, encoding="utf-8")
    print(f"Updated {path.name} ({len(images)} images)")


def update_tools() -> None:
    path = ROOT / "Tools.html"
    html = path.read_text(encoding="utf-8")

    for href, image_file, alt in TOOLS_CAROUSEL:
        credit = CREDITS[image_file]
        old = re.search(
            rf'(<a href="{re.escape(href)}" class="Tel-Carousel-Item"[^>]*>\s*'
            rf'<img class="Tel-Carousel-Thumb[^"]*" src=")[^"]+(" alt=")[^"]*(" width="130")',
            html,
            re.DOTALL,
        )
        if not old:
            raise RuntimeError(f"Carousel item not found: {href}")
        new_src = f"telescopes/images/{image_file}"
        new_alt = f'{alt} — {credit.split(" — ", 1)[-1]}'
        html = html[: old.start()] + old.group(1) + new_src + old.group(2) + new_alt + old.group(3) + html[old.end() :]

    # History section: use distinct type images instead of generic Tel-* duplicates
    history_replacements = [
        ("Tel-4.webp", "telescopes/images/type-refractor.webp", "Early refracting telescope"),
        ("Tel-2.webp", "telescopes/images/type-newtonian.webp", "Newtonian reflector telescope"),
        ("Tel-3.webp", "telescopes/images/type-dobsonian.webp", "Large Dobsonian reflector"),
        # second Tel-4 in history -> evostar for variety
    ]
    # Replace history imgs in order with distinct types
    history_images = [
        ("telescopes/images/type-refractor.webp", "Early refracting telescope — Wikimedia Commons"),
        ("telescopes/images/type-newtonian.webp", "Newtonian reflector telescope — Wikimedia Commons"),
        ("telescopes/images/type-dobsonian.webp", "Large Dobsonian reflector — Wikimedia Commons"),
        ("telescopes/images/evostar-72ed.webp", "Modern apochromatic refractor — Wikimedia Commons"),
        ("telescopes/images/type-schmidt-cassegrain.webp", "Schmidt-Cassegrain telescope — Wikimedia Commons"),
        ("telescopes/images/vla.webp", "Very Large Array radio telescope — Wikimedia Commons / NRAO"),
    ]
    hist_idx = 0
    hist_pattern = re.compile(
        r'(<figure class="Split-Section-Figure Split-Section-Visual">\s*'
        r'<img src=")Tel-[^"]+\.webp(" alt=")[^"]*(" loading="lazy" width="640" height="480" />)'
    )

    def hist_repl(m: re.Match[str]) -> str:
        nonlocal hist_idx
        src, alt = history_images[hist_idx]
        hist_idx += 1
        return m.group(1) + src + m.group(2) + alt + m.group(3)

    html = hist_pattern.sub(hist_repl, html)
    path.write_text(html, encoding="utf-8")
    print("Updated Tools.html")


def main() -> None:
    for name in ORDERED:
        update_telescope_page(ROOT / "telescopes" / name)
    update_tools()


if __name__ == "__main__":
    main()
