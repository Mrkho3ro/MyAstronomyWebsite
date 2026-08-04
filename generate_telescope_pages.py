#!/usr/bin/env python3
"""Generate telescope type pages under telescopes/."""

from __future__ import annotations

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "telescopes"

NAV = """        <nav class="site-nav" aria-label="Main">
            <div class="site-nav__inner">
                <a class="site-nav__brand" href="../index.html">Astronomy</a>
                <button type="button" class="site-nav__toggle" aria-expanded="false" aria-controls="site-nav-menu" aria-label="Menu">
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                </button>
                <ul id="site-nav-menu" class="site-nav__links">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="../Solar-System.html">Solar System</a></li>
                    <li><a href="../Messier-Objects.html">Messier Objects</a></li>
                    <li><a href="../Tools.html">Tools</a></li>
                </ul>
            </div>
        </nav>"""

TYPES = [
    {
        "slug": "dobsonian",
        "title": "Dobsonian Telescopes",
        "icon": "🔭",
        "intro": (
            "Dobsonian telescopes use a simple Newtonian reflector on a sturdy alt-azimuth rocker box mount. "
            "They deliver the most aperture per dollar — ideal for deep-sky observing of galaxies, nebulae, and star clusters."
        ),
        "examples": [
            {
                "name": "Sky-Watcher Heritage 130 Tabletop",
                "img": "../Tel-3.webp",
                "specs": "130 mm f/5 | Tabletop Dobsonian | ~$250",
                "desc": "Compact truss-style Dob with excellent light grasp. Perfect for Messier hunting from a dark site.",
            },
            {
                "name": "Apertura AD8 / Zhumell Z8",
                "img": "../Tel-3.webp",
                "specs": "203 mm f/6 | Full-size Dobsonian | ~$650",
                "desc": "Classic 8-inch Dob — the gold standard for visual deep-sky work. Resolves globular clusters and galaxy detail.",
            },
            {
                "name": "Celestron StarSense Explorer 8\" Dob",
                "img": "../Tel-1.webp",
                "specs": "203 mm f/6 | Smartphone-assisted pointing | ~$800",
                "desc": "Combines big-aperture Dobsonian simplicity with phone-based object location.",
            },
            {
                "name": "Orion SkyQuest XT10 Classic",
                "img": "../Tel-3.webp",
                "specs": "254 mm f/4.7 | Full-size Dobsonian | ~$600",
                "desc": "10-inch aperture reveals faint galaxies and intricate nebula structure under dark skies.",
            },
        ],
    },
    {
        "slug": "newtonian",
        "title": "Newtonian / Reflector Telescopes",
        "icon": "🪞",
        "intro": (
            "Newtonian reflectors use a parabolic primary mirror to gather light, with a flat secondary mirror "
            "directing the image to a side-mounted eyepiece. They are versatile, affordable, and available on many mount types."
        ),
        "examples": [
            {
                "name": "Celestron AstroMaster 130EQ",
                "img": "../Tel-2.webp",
                "specs": "130 mm f/5 | Equatorial mount | ~$280",
                "desc": "Popular beginner reflector for Moon, planets, and brighter deep-sky targets.",
            },
            {
                "name": "Celestron PowerSeeker 114EQ",
                "img": "../Tel-6.webp",
                "specs": "114 mm f/8 | Equatorial mount | ~$200",
                "desc": "Affordable entry-level Newtonian with smooth equatorial tracking for learning.",
            },
            {
                "name": "Orion SkyLine 8\" f/5 Dobsonian",
                "img": "../Tel-3.webp",
                "specs": "203 mm f/5 | Dobsonian mount | ~$450",
                "desc": "Fast focal ratio reflector optimized for wide-field deep-sky views.",
            },
            {
                "name": "Sky-Watcher Quattro 250P",
                "img": "../Tel-2.webp",
                "specs": "254 mm f/4 | Astrophotography Newtonian | ~$900",
                "desc": "Designed for imaging with a coma corrector — excellent for nebula and galaxy photography.",
            },
        ],
    },
    {
        "slug": "refractor",
        "title": "Refractor Telescopes",
        "icon": "🔍",
        "intro": (
            "Refractors use lenses to bend light to a focus. They produce crisp, high-contrast views — "
            "excellent for lunar and planetary detail, double stars, and portable grab-and-go setups."
        ),
        "examples": [
            {
                "name": "Celestron Travel Scope 70 DX",
                "img": "../Tel-4.webp",
                "specs": "70 mm f/5.7 | Alt-az mount | ~$120",
                "desc": "Ultra-portable refractor for travel and quick solar-system sessions.",
            },
            {
                "name": "Sky-Watcher Evostar 72ED",
                "img": "../Tel-4.webp",
                "specs": "72 mm f/6 | ED doublet | ~$450",
                "desc": "Apochromatic refractor prized by astrophotographers for wide-field imaging.",
            },
            {
                "name": "Celestron NexStar 102SLT",
                "img": "../Tel-4.webp",
                "specs": "102 mm f/6.5 | GoTo alt-az | ~$500",
                "desc": "Computerized refractor that automatically finds planets and bright Messier objects.",
            },
            {
                "name": "Orion ED80T CF Triplet",
                "img": "../Tel-4.webp",
                "specs": "80 mm f/6 | Carbon fiber triplet APO | ~$900",
                "desc": "Premium refractor with exceptional color correction for planetary and deep-sky imaging.",
            },
        ],
    },
    {
        "slug": "schmidt-cassegrain",
        "title": "Schmidt-Cassegrain / Catadioptric",
        "icon": "⚙️",
        "intro": (
            "Schmidt-Cassegrain telescopes (SCTs) combine mirrors and a correcting lens plate in a compact tube. "
            "They offer long focal lengths in a portable package — great for planets, smaller deep-sky objects, and GoTo setups."
        ),
        "examples": [
            {
                "name": "Celestron NexStar 6SE",
                "img": "../Tel-1.webp",
                "specs": "150 mm f/10 | GoTo fork mount | ~$900",
                "desc": "Iconic orange-tube SCT with built-in object database — a favorite for planetary observing.",
            },
            {
                "name": "Celestron NexStar 8SE",
                "img": "../Tel-1.webp",
                "specs": "203 mm f/10 | GoTo fork mount | ~$1,200",
                "desc": "8-inch SCT balances aperture and portability; resolves Saturn's rings and globular clusters.",
            },
            {
                "name": "Meade LX200 10\" ACF",
                "img": "../Tel-1.webp",
                "specs": "254 mm f/10 | GoTo fork mount | ~$2,500",
                "desc": "Advanced coma-free optics for high-resolution planetary and deep-sky imaging.",
            },
            {
                "name": "Celestron 114 LCM Computerized",
                "img": "../Tel-1.webp",
                "specs": "114 mm f/9 | Maksutov-Newtonian hybrid | ~$350",
                "desc": "Computerized catadioptric scope with automatic sky tours for beginners.",
            },
        ],
    },
    {
        "slug": "radio",
        "title": "Radio Telescopes",
        "icon": "📡",
        "intro": (
            "Radio telescopes detect radio waves from space — revealing pulsars, hydrogen clouds, active galactic nuclei, "
            "and the cosmic microwave background. They range from backyard hydrogen-line dishes to massive interferometer arrays."
        ),
        "examples": [
            {
                "name": "Itty Bitty Telescope (IBT)",
                "img": "../Tel-6.webp",
                "specs": "~1 m dish | 21 cm hydrogen line | Educational kit",
                "desc": "Build-it-yourself radio telescope kit for detecting the Milky Way's hydrogen emission.",
            },
            {
                "name": "RTL-SDR + Dish Setup",
                "img": "../Tel-6.webp",
                "specs": "Software-defined radio | 1–2 m offset dish | ~$200+",
                "desc": "Hobbyist radio astronomy using inexpensive SDR receivers and satellite TV dishes.",
            },
            {
                "name": "Green Bank 20 Meter",
                "img": "../Tel-6.webp",
                "specs": "20 m dish | L-band / S-band | Research grade",
                "desc": "Educational telescope at Green Bank Observatory — students can propose observing projects.",
            },
            {
                "name": "Very Large Array (VLA)",
                "img": "../Tel-6.webp",
                "specs": "27 × 25 m dishes | Interferometer | NM, USA",
                "desc": "Iconic array combining signals from 27 antennas to simulate a dish 36 km across.",
            },
            {
                "name": "FAST (Five-hundred-meter Aperture)",
                "img": "../Tel-6.webp",
                "specs": "500 m dish | World's largest single dish | China",
                "desc": "Detects faint pulsars and searches for interstellar signals with unprecedented sensitivity.",
            },
        ],
    },
    {
        "slug": "maksutov",
        "title": "Maksutov-Cassegrain Telescopes",
        "icon": "🌙",
        "intro": (
            "Maksutov-Cassegrains use a thick meniscus corrector lens and spherical mirrors for a compact, rugged design. "
            "They excel at lunar and planetary views and are popular as portable spotting scopes and small GoTo systems."
        ),
        "examples": [
            {
                "name": "Sky-Watcher Skymax 127",
                "img": "../Tel-1.webp",
                "specs": "127 mm f/12 | Tabletop / EQ mount | ~$400",
                "desc": "Long focal length Mak ideal for crisp lunar craters and planetary detail.",
            },
            {
                "name": "Celestron NexStar 127SLT Mak",
                "img": "../Tel-1.webp",
                "specs": "127 mm f/12 | GoTo alt-az | ~$550",
                "desc": "Computerized Mak with excellent optics in a compact travel-friendly tube.",
            },
            {
                "name": "Orion Apex 102mm Maksutov",
                "img": "../Tel-4.webp",
                "specs": "102 mm f/12.7 | Spotting scope / visual | ~$300",
                "desc": "Dual-purpose Mak for astronomy and terrestrial observation.",
            },
            {
                "name": "Explore Scientific Maxutov 180",
                "img": "../Tel-1.webp",
                "specs": "180 mm f/15 | Heavy-duty mount required | ~$1,800",
                "desc": "Large-aperture Mak for serious planetary imaging and double-star splitting.",
            },
        ],
    },
]


def page(data: dict) -> str:
    cards = []
    for ex in data["examples"]:
        cards.append(
            f"""            <article class="Tel-Type-Card">
                <img src="{escape(ex['img'])}" class="Tel-Type-Img" alt="{escape(ex['name'])}" loading="lazy" />
                <div class="Tel-Type-Body">
                    <h2>{escape(ex['name'])}</h2>
                    <p class="Tel-Type-Specs">{escape(ex['specs'])}</p>
                    <p>{escape(ex['desc'])}</p>
                </div>
            </article>"""
        )
    nav_links = "\n".join(
        f'                <a href="{t["slug"]}.html" class="Tel-Nav-Btn{" is-active" if t["slug"] == data["slug"] else ""}">{t["icon"]} {escape(t["title"].split(" ")[0])}</a>'
        for t in TYPES
    )
    return f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{escape(data['title'])} — Tools</title>
        <link rel="stylesheet" href="../Astronomy.css" />
        <script src="../site-nav.js" defer></script>
    </head>
    <body class="page-tools">
{NAV}

        <p class="Tel-Back-Link"><a href="../Tools.html">← All Telescope Types</a></p>

        <header class="Tel-Type-Head">
            <p class="Tel-Type-Icon">{data['icon']}</p>
            <h1>{escape(data['title'])}</h1>
            <p class="Tel-Type-Intro">{escape(data['intro'])}</p>
        </header>

        <nav class="Tel-Type-Nav" aria-label="Telescope types">
{nav_links}
        </nav>

        <section class="Tel-Type-Examples" aria-label="Example telescopes">
{chr(10).join(cards)}
        </section>
    </body>
</html>
"""


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    for t in TYPES:
        path = OUT_DIR / f"{t['slug']}.html"
        path.write_text(page(t), encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
