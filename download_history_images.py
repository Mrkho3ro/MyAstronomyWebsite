#!/usr/bin/env python3
"""Download unique telescope history images from Wikimedia Commons / NASA."""

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
OUT_DIR = ROOT / "telescopes" / "images" / "history"
UA = {"User-Agent": "STEM-telescope-history/1.0 (educational astronomy site; Python urllib)"}
MAX_WIDTH = 800
MAX_BYTES = 150 * 1024

# dest filename -> (Commons/NASA file title without File: prefix, credit)
SOURCES: dict[str, tuple[str, str]] = {
    "galileo-1608.webp": (
        "Galileo galilei, telescopi del 1609-10 ca..JPG",
        "Galileo's original telescopes, Museo Galileo — Wikimedia Commons (CC BY 3.0, Sailko)",
    ),
    "newton-1668.webp": (
        "Newton telescope replica 1668.jpg",
        "Replica of Newton's 1668 reflecting telescope — Science Museum UK / Wikimedia Commons (CC BY 4.0)",
    ),
    "herschel-1780s.webp": (
        "PSM V09 D079 Herschel 40 foot telescope at slough.jpg",
        "William Herschel's 40-foot reflector at Slough — Wikimedia Commons (public domain)",
    ),
    "achromatic-1758.webp": (
        "Achromatic telescope hooke img 1598.jpg",
        "Dollond achromatic refractor, mid-18th century — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "dobsonian-modern.webp": (
        "Dobsonian telescope.jpg",
        "Modern Dobsonian reflector on rocker-box mount — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "hubble-jwst.webp": (
        "James Webb Space Telescope's Golden Mirror Unveiled (26076364723).jpg",
        "James Webb Space Telescope golden primary mirror — NASA / Wikimedia Commons (public domain)",
    ),
    "jansky-radio-1932.webp": (
        "Green Banks - Jansky Antena.jpg",
        "Replica of Karl Jansky's rotating radio antenna at Green Bank — Wikimedia Commons (CC BY-SA 3.0)",
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


def save_webp(data: bytes, dest: Path) -> None:
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((MAX_WIDTH, MAX_WIDTH), Image.Resampling.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    for quality in (82, 75, 68, 60, 52):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        if buf.tell() <= MAX_BYTES or quality == 52:
            dest.write_bytes(buf.getvalue())
            return


def download_all() -> dict[str, str]:
    credits: dict[str, str] = {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed: list[str] = []

    for dest_name, (commons_file, credit) in SOURCES.items():
        dest = OUT_DIR / dest_name
        if dest.exists() and dest.stat().st_size > 500:
            credits[dest_name] = credit
            print(f"{dest_name} — already exists ({dest.stat().st_size} bytes)", flush=True)
            continue
        print(f"{dest_name} <- {commons_file}", flush=True)

        thumb_url = None
        for attempt in range(4):
            try:
                thumb_url = commons_thumb(commons_file)
                if thumb_url:
                    break
            except Exception as exc:
                print(f"  API attempt {attempt + 1}: {exc}", flush=True)
                time.sleep(8 * (attempt + 1))

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
        time.sleep(5)

    meta = OUT_DIR / "credits.json"
    meta.write_text(json.dumps(credits, indent=2), encoding="utf-8")
    print(f"\nSaved {len(credits)}/{len(SOURCES)} images to {OUT_DIR}", flush=True)
    if failed:
        print("FAILED:", ", ".join(failed), flush=True)
        sys.exit(1)
    return credits


if __name__ == "__main__":
    download_all()
