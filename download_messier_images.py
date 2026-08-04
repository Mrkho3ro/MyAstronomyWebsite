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
ASTRO_GALLERY = "https://astropixels.com/messier/messiergallery.html"
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


def astro_thumb_urls() -> dict[int, str]:
    html = fetch(ASTRO_GALLERY).decode("utf-8", "replace")
    urls: dict[int, str] = {}
    for path, num in re.findall(r'src="(\.\./[^"]+/thumb/M(\d+)-\d+n\.jpg)"', html):
        urls[int(num)] = "https://astropixels.com/" + path.replace("../", "", 1)
    return urls


def install_images(image_urls: dict[int, str], astro: dict[int, str] | None = None) -> None:
    astro = astro or {}
    nasa_ok = 0
    fallback_ok = 0
    failed: list[int] = []

    for num in range(1, 111):
        thumb = ROOT / f"M{num}-thumb.jpg"
        primary = ROOT / f"M{num}-1.jpg"
        url = image_urls.get(num) or astro.get(num)
        source = "NASA" if image_urls.get(num) else "AstroPixels"

        if not url:
            if primary.exists() and primary.stat().st_size >= 800:
                if not thumb.exists() or thumb.stat().st_size < 800:
                    shutil.copy2(primary, thumb)
                continue
            print(f"WARNING: no image source for M{num}")
            failed.append(num)
            continue

        if download(url, thumb):
            print(f"Saved {thumb.name} ({source})")
            shutil.copy2(thumb, primary)
            for slot in (2, 3):
                dest = ROOT / f"M{num}-{slot}.jpg"
                if not dest.exists() or dest.stat().st_size < 800:
                    shutil.copy2(thumb, dest)
            if source == "NASA":
                nasa_ok += 1
            else:
                fallback_ok += 1
        else:
            print(f"WARNING: failed M{num} from {source}")
            if primary.exists() and primary.stat().st_size >= 800 and not thumb.exists():
                shutil.copy2(primary, thumb)
            else:
                failed.append(num)

    print(f"Installed {nasa_ok} NASA + {fallback_ok} fallback images; {len(failed)} failed: {failed}")


def main() -> None:
    image_urls = scrape_all_images()
    astro = astro_thumb_urls()
    print(f"AstroPixels fallback URLs: {len(astro)}")
    install_images(image_urls, astro)


if __name__ == "__main__":
    main()
