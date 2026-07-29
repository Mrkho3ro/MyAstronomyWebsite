#!/usr/bin/env python3
"""Generate Messier gallery + detail pages from Messier-Objects-source.html."""

from __future__ import annotations

import re
import shutil
import urllib.error
import urllib.request
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Messier-Objects-source.html"
GALLERY_HTML = ROOT / "Messier-Objects.html"
MESSIER_DIR = ROOT / "messier"
ASTRO_GALLERY = "https://astropixels.com/messier/messiergallery.html"

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

NAV_DETAIL = """        <nav class="site-nav" aria-label="Main">
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

NAV_GALLERY = """        <nav class="site-nav" aria-label="Main">
            <div class="site-nav__inner">
                <a class="site-nav__brand" href="index.html">Astronomy</a>
                <button type="button" class="site-nav__toggle" aria-expanded="false" aria-controls="site-nav-menu" aria-label="Menu">
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                    <span class="site-nav__toggle-bar" aria-hidden="true"></span>
                </button>
                <ul id="site-nav-menu" class="site-nav__links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="Solar-System.html">Solar System</a></li>
                    <li><a href="Messier-Objects.html">Messier Objects</a></li>
                    <li><a href="Tools.html">Tools</a></li>
                </ul>
            </div>
        </nav>"""

ASTRO_THUMBS: dict[int, str] = {}


def parse_objects(html: str) -> list[dict]:
    pattern = re.compile(
        r'<div class="M-divs" id="M(\d+)">\s*'
        r'<div class="h1-M">\s*<h1>(.*?)</h1>\s*</div>\s*'
        r'<div class="Img-M">\s*'
        r'(?:<img src="([^"]+)" class="Image-M" alt="[^"]*" />\s*){3}\s*'
        r'</div>\s*'
        r'<footer class="Ul-M">\s*<ul>(.*?)</ul>\s*</footer>\s*'
        r'</div>',
        re.DOTALL,
    )
    objects = []
    for m in pattern.finditer(html):
        num = int(m.group(1))
        title = m.group(2).strip()
        fields = {}
        for li in re.findall(r"<li><a>([^:]+):\s*(.*?)</a></li>", m.group(3), re.DOTALL):
            fields[li[0].strip()] = li[1].strip()
        name = title.split("–", 1)[-1].strip() if "–" in title else title
        objects.append(
            {
                "num": num,
                "title": title,
                "name": name,
                "type": fields.get("Type", ""),
                "distance": fields.get("Distance", ""),
                "constellation": fields.get("Constellation", ""),
                "difficulty": fields.get("Difficulty", ""),
                "description": fields.get("Description", ""),
            }
        )
    objects.sort(key=lambda o: o["num"])
    return objects


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def download(url: str, dest: Path) -> bool:
    try:
        data = fetch(url)
        if len(data) < 500:
            return False
        dest.write_bytes(data)
        return True
    except (urllib.error.URLError, OSError):
        return False


def astro_thumb_urls() -> dict[int, str]:
    html = fetch(ASTRO_GALLERY).decode("utf-8", "replace")
    urls: dict[int, str] = {}
    for path, num in re.findall(r'src="(\.\./[^"]+/thumb/M(\d+)-\d+n\.jpg)"', html):
        urls[int(num)] = "https://astropixels.com/" + path.replace("../", "", 1)
    return urls


def has_local_images(num: int) -> bool:
    return (ROOT / f"M{num}-1.jpg").exists()


def ensure_local_images(thumbs: dict[int, str]) -> None:
    for num in range(1, 111):
        if has_local_images(num):
            continue
        url = thumbs.get(num)
        if not url:
            print(f"WARNING: no AstroPixels thumb for M{num}")
            continue
        primary = ROOT / f"M{num}-1.jpg"
        if download(url, primary):
            print(f"Downloaded M{num}-1.jpg")
            for slot in (2, 3):
                dest = ROOT / f"M{num}-{slot}.jpg"
                if not dest.exists():
                    shutil.copy2(primary, dest)
        else:
            print(f"WARNING: download failed for M{num}")


def image_src(num: int, slot: int, from_detail: bool) -> str:
    local = f"M{num}-{slot}.jpg"
    if has_local_images(num):
        return f"../{local}" if from_detail else local
    return ASTRO_THUMBS.get(num, local)


def detail_page(obj: dict) -> str:
    n = obj["num"]
    imgs = "\n".join(
        f'                <img src="{escape(image_src(n, i, True))}" class="Image-M" alt="M{n}" />'
        for i in (1, 2, 3)
    )
    return f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>{escape(obj["title"])}</title>
        <link rel="stylesheet" href="../Astronomy.css" />
        <script src="../site-nav.js" defer></script>
    </head>
    <body class="Messier-Objects-Background">
{NAV_DETAIL}

        <p class="M-Back-Link"><a href="../Messier-Objects.html">← Back to Messier Gallery</a></p>

        <div class="M-divs M-divs-detail" id="M{n}">
            <div class="h1-M">
                <h1>{escape(obj["title"])}</h1>
            </div>

            <div class="Img-M">
{imgs}
            </div>

            <footer class="Ul-M">
                <ul>
                    <li><a>Type: {escape(obj["type"])}</a></li>
                    <li><a>Distance: {escape(obj["distance"])}</a></li>
                    <li><a>Constellation: {escape(obj["constellation"])}</a></li>
                    <li><a>Difficulty: {escape(obj["difficulty"])}</a></li>
                    <li><a>Description: {escape(obj["description"])}</a></li>
                </ul>
            </footer>
        </div>
    </body>
</html>
"""


def gallery_cell(obj: dict) -> str:
    n = obj["num"]
    thumb = image_src(n, 1, False)
    return f"""                <a href="messier/M{n}.html" class="M-Gallery-Cell" data-num="{n}">
                    <div class="M-Gallery-Thumb-Wrap">
                        <img src="{escape(thumb)}" class="M-Gallery-Thumb" alt="M{n}" loading="lazy" />
                    </div>
                    <span class="M-Gallery-Label"><strong>M{n}</strong> {escape(obj["name"])}</span>
                    <span class="M-Gallery-Type">{escape(obj["type"])}</span>
                </a>"""


def gallery_page(objects: list[dict]) -> str:
    rows = []
    for start in range(0, len(objects), 8):
        cells = "\n".join(gallery_cell(o) for o in objects[start : start + 8])
        rows.append(f"""            <div class="M-Gallery-Row">
{cells}
            </div>""")
    grid = "\n".join(rows)
    return f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Messier Objects</title>
        <link rel="stylesheet" href="Astronomy.css" />
        <script src="site-nav.js" defer></script>
    </head>
    <body class="Messier-Objects-Background">
{NAV_GALLERY}

        <header class="M-Head">
            <p class="M-P1">🌌 Messier Objects</p>
            <p class="M-P2">
                Hidden across the night sky are some of the most breathtaking deep-space objects ever discovered—glowing
                nebulae, distant galaxies, and dense star clusters that reveal the true scale of the universe.
            </p>
            <p class="M-P3">
                The Messier Objects are a collection of 110 astronomical objects cataloged by the French astronomer
                Charles Messier in the 18th century. Originally, Messier was searching for comets, but he began
                recording these "fuzzy objects" to avoid confusing them with his comet discoveries.
            </p>
            <p class="M-P4">
                Today, his catalog is one of the most famous in astronomy. It includes spectacular sights like the
                Andromeda Galaxy, the Orion Nebula, and many star clusters visible even with small telescopes.
            </p>
            <p class="M-P5">
                Click each thumbnail below to open a dedicated page with photos and observing details for that object.
            </p>
        </header>

        <section class="M-Gallery-Section" aria-label="Messier catalog gallery">
            <div class="M-Gallery-Header">
                <h2 class="M-Gallery-Title">Messier Catalog Photo Gallery</h2>
                <p class="M-Gallery-Subtitle">All 110 objects — browse the grid and click any thumbnail for full details</p>
                <label class="M-Gallery-Search-Wrap">
                    <span class="M-Gallery-Search-Icon">🔭</span>
                    <input
                        type="search"
                        id="M-Gallery-Search"
                        class="M-Gallery-Search"
                        placeholder="Search by number or name (e.g. 42, Orion)…"
                        autocomplete="off"
                    />
                </label>
            </div>
            <div class="M-Gallery-Grid" id="M-Gallery-Grid">
{grid}
            </div>
            <p class="M-Gallery-Hint">Tip: each thumbnail opens its own detail page — like AstroPixels, one object at a time.</p>
        </section>

        <script>
            (function () {{
                var input = document.getElementById("M-Gallery-Search");
                var cells = document.querySelectorAll(".M-Gallery-Cell");
                var rows = document.querySelectorAll(".M-Gallery-Row");
                input.addEventListener("input", function () {{
                    var q = input.value.trim().toLowerCase().replace(/^m/, "");
                    cells.forEach(function (cell) {{
                        var num = cell.getAttribute("data-num");
                        var text = cell.textContent.toLowerCase();
                        var match = !q || num.indexOf(q) === 0 || text.indexOf(q) !== -1;
                        cell.classList.toggle("M-Gallery-Cell-hidden", !match);
                    }});
                    rows.forEach(function (row) {{
                        var visible = row.querySelector(".M-Gallery-Cell:not(.M-Gallery-Cell-hidden)");
                        row.classList.toggle("M-Gallery-Row-hidden", !visible);
                    }});
                }});
            }})();
        </script>
    </body>
</html>
"""


def main() -> None:
    global ASTRO_THUMBS
    if not SOURCE.exists():
        raise SystemExit(f"Source file missing: {SOURCE}")

    objects = parse_objects(SOURCE.read_text(encoding="utf-8"))
    if len(objects) != 110:
        raise SystemExit(f"Expected 110 objects, parsed {len(objects)}")

    ASTRO_THUMBS = astro_thumb_urls()
    ensure_local_images(ASTRO_THUMBS)

    MESSIER_DIR.mkdir(exist_ok=True)
    for obj in objects:
        (MESSIER_DIR / f"M{obj['num']}.html").write_text(detail_page(obj), encoding="utf-8")

    GALLERY_HTML.write_text(gallery_page(objects), encoding="utf-8")
    print(f"Wrote {GALLERY_HTML.name} and {len(objects)} pages in {MESSIER_DIR}/")


if __name__ == "__main__":
    main()
