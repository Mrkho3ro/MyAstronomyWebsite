#!/usr/bin/env python3
"""Download unique telescope images from Wikimedia Commons."""

from __future__ import annotations

import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "telescopes" / "images"
UA = {"User-Agent": "STEM-telescope-images/1.0 (educational astronomy site; Python urllib)"}

# dest filename -> (Commons file title without File: prefix, credit)
SOURCES: dict[str, tuple[str, str]] = {
    # Type card thumbnails
    "type-dobsonian.webp": (
        "Dobsonian telescope.jpg",
        "Dobsonian reflector — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "type-newtonian.webp": (
        "Newtonian reflector.jpg",
        "Newtonian reflector on mount — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "type-refractor.webp": (
        "Astronomy telescope-SOM-P5200295.JPG",
        "Achromatic refractor — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "type-schmidt-cassegrain.webp": (
        "35-cm-Schmidt-Cassegrain-Teleskop der WHS.jpg",
        "Schmidt-Cassegrain telescope — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "type-maksutov.webp": (
        "Maksutov-Cassegrain Intes M703 mounted.jpg",
        "Maksutov-Cassegrain telescope — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "type-radio.webp": (
        "The Very Large Array, New Mexico.jpg",
        "Very Large Array radio telescope — Wikimedia Commons (CC BY-SA 2.0)",
    ),
    # Dobsonian models
    "heritage-130p.webp": (
        "JeremysTelescope.jpg",
        "Tabletop Dobsonian reflector (representative of Sky-Watcher Heritage 130P) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "apertura-ad8.webp": (
        "Gugu skywatcher.JPG",
        "8-inch Dobsonian reflector (representative of Apertura AD8 / Zhumell Z8) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "starsense-explorer-8-dob.webp": (
        "Tasco SkyWatcher Telescopes.jpg",
        "Commercial Dobsonian-style reflectors (representative of StarSense Explorer 8\") — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-xt10.webp": (
        "Télescope Sky Watcher.JPG",
        "Full-size Dobsonian (representative of Orion SkyQuest XT10) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    # Newtonian models
    "astromaster-130eq.webp": (
        "Newtonian reflector.jpg",
        "Newtonian reflector on equatorial mount (representative of AstroMaster 130EQ) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "powerseeker-114eq.webp": (
        "Celestron Powerseeker 80eq telescope.JPG",
        "Celestron PowerSeeker Newtonian (representative of 114EQ model) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "orion-skyline-8-dob.webp": (
        "Dobsonian telescope.jpg",
        "8-inch f/5 Dobsonian Newtonian (representative of Orion SkyLine 8\") — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "quattro-250p.webp": (
        "Celestron EdgeHD telescope.jpg",
        "Imaging Newtonian / catadioptric (representative of Sky-Watcher Quattro 250P) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    # Refractor models
    "travel-scope-70.webp": (
        "Astronomy telescope-SOM-P5200295.JPG",
        "Portable refractor (representative of Celestron Travel Scope 70) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "evostar-72ed.webp": (
        "Astronomy telescope-SOM-P5200300.JPG",
        "ED refractor (representative of Sky-Watcher Evostar 72ED) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "nexstar-102slt.webp": (
        "Celestron Omni xlt120.jpg",
        "Celestron refractor on alt-az mount (representative of NexStar 102SLT) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-ed80t.webp": (
        "Astronomy telescope-SOM-P5200301.JPG",
        "Apochromatic refractor (representative of Orion ED80T CF Triplet) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    # Schmidt-Cassegrain models
    "nexstar-6se.webp": (
        "355 mm Schmidt-Cassegrain telescope of Bauduen Observatory.jpg",
        "Schmidt-Cassegrain telescope (representative of Celestron NexStar 6SE) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "nexstar-8se.webp": (
        "Observation de Jupiter, Saturne et Mars au Celestron Nexstar 8SE (13952061787).jpg",
        "Celestron NexStar 8SE — Wikimedia Commons (CC BY 2.0, maxime raynal)",
    ),
    "meade-lx200-10.webp": (
        "Meade LX200 in Jiamusi University Observatory.jpg",
        "Meade LX200 Schmidt-Cassegrain — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "celestron-114-lcm.webp": (
        "Telescope Celestron window.jpg",
        "Celestron computerized telescope (representative of 114 LCM) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    # Maksutov models
    "skymax-127.webp": (
        "Maksutov-Cassegrain Intes M703 mounted.jpg",
        "Maksutov-Cassegrain (representative of Sky-Watcher Skymax 127) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "nexstar-127slt.webp": (
        "Maksutov cassegrain comercial.png",
        "Commercial Maksutov-Cassegrain (representative of NexStar 127SLT) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-apex-102.webp": (
        "Celestron FirstScope 76.jpg",
        "Compact catadioptric scope (representative of Orion Apex 102mm Mak) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "es-mak-180.webp": (
        "Celestron C14 telescope.jpg",
        "Large catadioptric telescope (representative of Explore Scientific Mak 180) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    # Radio telescopes
    "ibt.webp": (
        "Erdfunkstelle Raisting 2.jpg",
        "Small radio dish (representative of Itty Bitty Telescope educational kit) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "rtl-sdr-dish.webp": (
        "Satellite dish in Austria.JPG",
        "Offset satellite dish (representative of RTL-SDR radio astronomy setup) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "green-bank-20m.webp": (
        "Green Bank Observatory 40 foot telescope.jpg",
        "Green Bank 40-foot educational radio telescope (representative of 20-meter dish) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "vla.webp": (
        "The Very Large Array, New Mexico.jpg",
        "Very Large Array radio interferometer — Wikimedia Commons (CC BY-SA 2.0)",
    ),
    "fast.webp": (
        "FAST at NMC 02.jpg",
        "FAST five-hundred-meter radio telescope — Wikimedia Commons (CC BY-SA 4.0)",
    ),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def commons_thumb(filename: str, width: int = 900) -> str | None:
    title = filename if filename.startswith("File:") else f"File:{filename}"
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|thumburl",
            "iiurlwidth": width,
        }
    )
    data = json.loads(fetch(url).decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if "missing" in page:
            return None
        ii = (page.get("imageinfo") or [{}])[0]
        thumb = ii.get("thumburl") or ii.get("url")
        if thumb:
            return re.sub(r"\?utm_source=.*$", "", thumb)
    return None


def save_webp(data: bytes, dest: Path, max_size: int = 900) -> None:
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=82, method=6)


def download_all() -> dict[str, str]:
    credits: dict[str, str] = {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed: list[str] = []

    for dest_name, (commons_file, credit) in SOURCES.items():
        dest = OUT_DIR / dest_name
        print(f"{dest_name} <- {commons_file}", flush=True)

        thumb_url = None
        for attempt in range(4):
            try:
                thumb_url = commons_thumb(commons_file)
                if thumb_url:
                    break
            except Exception as exc:
                print(f"  API attempt {attempt + 1}: {exc}", flush=True)
                time.sleep(3 * (attempt + 1))

        if not thumb_url:
            print(f"  MISSING on Commons: {commons_file}", flush=True)
            failed.append(dest_name)
            continue

        ok = False
        for attempt in range(3):
            try:
                data = fetch(thumb_url)
                if len(data) < 500:
                    raise ValueError(f"too small ({len(data)} bytes)")
                save_webp(data, dest)
                credits[dest_name] = credit
                print(f"  OK {dest.stat().st_size} bytes", flush=True)
                ok = True
                break
            except Exception as exc:
                print(f"  download attempt {attempt + 1}: {exc}", flush=True)
                time.sleep(2 * (attempt + 1))
        if not ok:
            failed.append(dest_name)
        time.sleep(2)

    meta = OUT_DIR / "credits.json"
    meta.write_text(json.dumps(credits, indent=2), encoding="utf-8")
    print(f"\nSaved {len(credits)}/{len(SOURCES)} images to {OUT_DIR}", flush=True)
    if failed:
        print("FAILED:", ", ".join(failed), flush=True)
        sys.exit(1)
    return credits


if __name__ == "__main__":
    download_all()
