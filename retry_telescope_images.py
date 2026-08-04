#!/usr/bin/env python3
"""Retry missing telescope image downloads with long delays and fallbacks."""

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

# Pre-resolved thumb URLs (from Wikimedia API) + NRAO/NASA fallbacks
RETRY: dict[str, tuple[list[str], str]] = {
    "type-radio.webp": (
        [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/The_Very_Large_Array%2C_New_Mexico.jpg/960px-The_Very_Large_Array%2C_New_Mexico.jpg",
            "https://public.nrao.edu/wp-content/uploads/2023/03/VLA-from-Air-2014.jpg",
        ],
        "Very Large Array radio telescope — NRAO / Wikimedia Commons (public domain / CC BY-SA 2.0)",
    ),
    "heritage-130p.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/JeremysTelescope.jpg/960px-JeremysTelescope.jpg"],
        "Tabletop Dobsonian reflector (representative of Sky-Watcher Heritage 130P) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "apertura-ad8.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Gugu_skywatcher.JPG/960px-Gugu_skywatcher.JPG"],
        "8-inch Dobsonian reflector (representative of Apertura AD8 / Zhumell Z8) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "starsense-explorer-8-dob.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tasco_SkyWatcher_Telescopes.jpg/960px-Tasco_SkyWatcher_Telescopes.jpg"],
        "Commercial Dobsonian-style reflectors (representative of StarSense Explorer 8\") — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-xt10.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/T%C3%A9lescope_Sky_Watcher.JPG/960px-T%C3%A9lescope_Sky_Watcher.JPG"],
        "Full-size Dobsonian (representative of Orion SkyQuest XT10) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "quattro-250p.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Celestron_EdgeHD_telescope.jpg/960px-Celestron_EdgeHD_telescope.jpg"],
        "Imaging telescope (representative of Sky-Watcher Quattro 250P) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "nexstar-102slt.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/2/27/Celestron_Omni_xlt120.jpg"],
        "Celestron refractor (representative of NexStar 102SLT) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-ed80t.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Astronomy_telescope-SOM-P5200301.JPG/960px-Astronomy_telescope-SOM-P5200301.JPG"],
        "Apochromatic refractor (representative of Orion ED80T CF Triplet) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "nexstar-6se.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/355_mm_Schmidt-Cassegrain_telescope_of_Bauduen_Observatory.jpg/960px-355_mm_Schmidt-Cassegrain_telescope_of_Bauduen_Observatory.jpg"],
        "Schmidt-Cassegrain telescope (representative of Celestron NexStar 6SE) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "nexstar-8se.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Observation_de_Jupiter%2C_Saturne_et_Mars_au_Celestron_Nexstar_8SE_%2813952061787%29.jpg/960px-Observation_de_Jupiter%2C_Saturne_et_Mars_au_Celestron_Nexstar_8SE_%2813952061787%29.jpg"],
        "Celestron NexStar 8SE — Wikimedia Commons (CC BY 2.0, maxime raynal)",
    ),
    "meade-lx200-10.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Meade_LX200_in_Jiamusi_University_Observatory.jpg/960px-Meade_LX200_in_Jiamusi_University_Observatory.jpg"],
        "Meade LX200 Schmidt-Cassegrain — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "celestron-114-lcm.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Telescope_Celestron_window.jpg/960px-Telescope_Celestron_window.jpg"],
        "Celestron computerized telescope (representative of 114 LCM) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "orion-apex-102.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Celestron_FirstScope_76.jpg/960px-Celestron_FirstScope_76.jpg"],
        "Compact catadioptric scope (representative of Orion Apex 102mm Mak) — Wikimedia Commons (CC BY-SA 4.0)",
    ),
    "es-mak-180.webp": (
        ["https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Celestron_C14_telescope.jpg/960px-Celestron_C14_telescope.jpg"],
        "Large catadioptric telescope (representative of Explore Scientific Mak 180) — Wikimedia Commons (CC BY-SA 3.0)",
    ),
    "green-bank-20m.webp": (
        [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Green_Bank_Observatory_40_foot_telescope.jpg/960px-Green_Bank_Observatory_40_foot_telescope.jpg",
            "https://public.nrao.edu/wp-content/uploads/2016/06/GBT-web.jpg",
        ],
        "Green Bank educational radio telescope — Wikimedia Commons / NRAO (CC BY-SA 4.0 / public domain)",
    ),
    "vla.webp": (
        [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/The_Very_Large_Array%2C_New_Mexico.jpg/960px-The_Very_Large_Array%2C_New_Mexico.jpg",
            "https://public.nrao.edu/wp-content/uploads/2023/03/VLA-from-Air-2014.jpg",
        ],
        "Very Large Array radio interferometer — Wikimedia Commons / NRAO (CC BY-SA 2.0 / public domain)",
    ),
    "fast.webp": (
        [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/FAST_at_NMC_02.jpg/960px-FAST_at_NMC_02.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/202508_FAST_%28Five-hundred-meter_Aperture_Spherical_radio_Telescope%29.jpg/960px-202508_FAST_%28Five-hundred-meter_Aperture_Spherical_radio_Telescope%29.jpg",
        ],
        "FAST five-hundred-meter radio telescope — Wikimedia Commons (CC BY-SA 4.0)",
    ),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


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


def main() -> None:
    credits_path = OUT_DIR / "credits.json"
    credits = json.loads(credits_path.read_text(encoding="utf-8")) if credits_path.exists() else {}
    failed: list[str] = []

    for dest_name, (urls, credit) in RETRY.items():
        dest = OUT_DIR / dest_name
        if dest.exists() and dest.stat().st_size > 2000:
            print(f"SKIP {dest_name}", flush=True)
            continue

        print(f"Retry {dest_name} ...", flush=True)
        ok = False
        for url in urls:
            for attempt in range(2):
                try:
                    data = fetch(url)
                    if len(data) < 500:
                        raise ValueError("too small")
                    save_webp(data, dest)
                    credits[dest_name] = credit
                    print(f"  OK from {url[:70]}... ({dest.stat().st_size} bytes)", flush=True)
                    ok = True
                    break
                except Exception as exc:
                    print(f"  fail {url[:60]}...: {exc}", flush=True)
                    time.sleep(15)
            if ok:
                break
        if not ok:
            failed.append(dest_name)
        time.sleep(25)

    credits_path.write_text(json.dumps(credits, indent=2), encoding="utf-8")
    print(f"\nCredits: {len(credits)} entries", flush=True)
    if failed:
        print("Still missing:", ", ".join(failed), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
