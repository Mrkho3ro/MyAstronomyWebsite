#!/usr/bin/env python3
"""Download NASA Hubble Messier catalog images and update site references."""

from __future__ import annotations

import json
import re
import shutil
import time
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG_INDEX = (
    "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/"
)
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Known slug patterns for objects without standard numbering in URL
SLUG_OVERRIDES: dict[int, str] = {
    102: "messier-102-the-spindle-galaxy",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read()


def download(url: str, dest: Path) -> bool:
    try:
        data = fetch(url)
        if len(data) < 800:
            return False
        dest.write_bytes(data)
        return True
    except (urllib.error.URLError, OSError) as exc:
        print(f"  FAIL download {url}: {exc}")
        return False


def discover_page_urls() -> dict[int, str]:
    html = fetch(CATALOG_INDEX).decode("utf-8", "replace")
    urls: dict[int, str] = {}

    for href in re.findall(r'href="([^"]+)"', html):
        if "hubble-messier-catalog/messier-" not in href:
            continue
        if not href.startswith("http"):
            href = "https://science.nasa.gov" + href
        m = re.search(r"messier-(\d+)", href)
        if m:
            urls[int(m.group(1))] = href.split("?")[0].rstrip("/") + "/"

    for num, slug in SLUG_OVERRIDES.items():
        urls[num] = f"https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/{slug}/"

    # Try common slug pattern for missing objects
    for num in range(1, 111):
        if num in urls:
            continue
        for slug in (
            f"messier-{num}",
            f"messier-{num}-",
        ):
            pass

    return dict(sorted(urls.items()))


def best_image_from_page(page_html: str) -> str | None:
    # WordPress / NASA featured image patterns
    patterns = [
        r'property="og:image"\s+content="([^"]+)"',
        r'"contentUrl"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',
        r'data-orig-file="([^"]+\.(?:jpg|jpeg|png|webp))"',
        r'src="(https://assets\.science\.nasa\.gov/content/dam/science/mission/hubble/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',
        r'src="(https://[^"]+wp-content/uploads/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',
        r'srcset="(https://[^ ]+\.(?:jpg|jpeg|png|webp))',
    ]
    for pat in patterns:
        m = re.search(pat, page_html, re.I)
        if m:
            url = unescape(m.group(1)).split(" ")[0].split("?")[0]
            if "avatar" not in url.lower() and "logo" not in url.lower():
                return url

    imgs = re.findall(
        r'https://assets\.science\.nasa\.gov/content/dam/science/mission/hubble/[^\s"\']+\.(?:jpg|jpeg|png|webp)',
        page_html,
        re.I,
    )
    if imgs:
        # Prefer largest / main image (often first substantial one)
        for img in imgs:
            if "thumb" not in img.lower() and "icon" not in img.lower():
                return img.split("?")[0]
        return imgs[0].split("?")[0]
    return None


def scrape_all_images() -> dict[int, str]:
    page_urls = discover_page_urls()
    print(f"Found {len(page_urls)} NASA Messier pages")
    image_urls: dict[int, str] = {}

    for num in range(1, 111):
        url = page_urls.get(num)
        if not url:
            print(f"M{num}: no NASA page found")
            continue
        try:
            html = fetch(url).decode("utf-8", "replace")
            img = best_image_from_page(html)
            if img:
                image_urls[num] = img
                print(f"M{num}: {img[:80]}...")
            else:
                print(f"M{num}: no image on page")
        except Exception as exc:
            print(f"M{num}: error {exc}")
        time.sleep(0.15)

    manifest = ROOT / "messier-nasa-images.json"
    manifest.write_text(json.dumps(image_urls, indent=2), encoding="utf-8")
    print(f"Wrote {manifest.name} with {len(image_urls)} URLs")
    return image_urls


def install_images(image_urls: dict[int, str]) -> None:
    for num in range(1, 111):
        url = image_urls.get(num)
        thumb = ROOT / f"M{num}-thumb.jpg"
        primary = ROOT / f"M{num}-1.jpg"

        if url:
            if download(url, thumb):
                print(f"Saved {thumb.name}")
                shutil.copy2(thumb, primary)
                for slot in (2, 3):
                    dest = ROOT / f"M{num}-{slot}.jpg"
                    if not dest.exists() or dest.stat().st_size < 800:
                        shutil.copy2(thumb, dest)
            else:
                print(f"WARNING: failed M{num}")
        elif primary.exists():
            if not thumb.exists():
                shutil.copy2(primary, thumb)
        else:
            print(f"WARNING: no image for M{num}")


def main() -> None:
    manifest = ROOT / "messier-nasa-images.json"
    if manifest.exists():
        image_urls = json.loads(manifest.read_text(encoding="utf-8"))
        image_urls = {int(k): v for k, v in image_urls.items()}
        print(f"Loaded {len(image_urls)} URLs from manifest")
    else:
        image_urls = scrape_all_images()

    install_images(image_urls)


if __name__ == "__main__":
    main()
