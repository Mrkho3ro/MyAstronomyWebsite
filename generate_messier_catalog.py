#!/usr/bin/env python3
"""Generate messier-catalog.json from Messier-Objects-source.html + coordinate data."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Messier-Objects-source.html"
OUT = ROOT / "messier-catalog.json"

# J2000 coordinates (hours, degrees) — standard catalog values
COORDS: dict[int, tuple[float, float]] = {
    1: (5.575, 22.017), 2: (21.558, -0.823), 3: (13.703, 28.377), 4: (16.393, -26.526),
    5: (15.308, 2.083), 6: (17.670, -32.217), 7: (17.900, -34.817), 8: (18.033, -24.383),
    9: (17.320, -18.517), 10: (16.952, -4.100), 11: (18.851, -6.267), 12: (16.787, -1.950),
    13: (16.695, 36.467), 14: (17.629, 3.250), 15: (21.500, 12.167), 16: (18.187, -13.817),
    17: (18.346, -16.167), 18: (18.333, -17.133), 19: (17.043, -26.267), 20: (18.035, -23.017),
    21: (18.051, -22.500), 22: (18.606, -23.900), 23: (17.567, -19.000), 24: (18.283, -18.500),
    25: (18.528, -19.250), 26: (18.762, -9.383), 27: (19.993, 22.717), 28: (18.408, -24.867),
    29: (20.397, 38.533), 30: (21.673, -23.183), 31: (0.712, 41.269), 32: (0.713, 40.867),
    33: (1.564, 30.660), 34: (2.709, 42.783), 35: (6.149, 24.350), 36: (5.603, 34.133),
    37: (5.877, 32.550), 38: (5.478, 35.833), 39: (21.537, 48.433), 40: (12.373, 58.083),
    41: (6.767, -20.733), 42: (5.588, -5.391), 43: (5.592, -5.271), 44: (8.668, 19.983),
    45: (3.783, 24.117), 46: (7.702, -14.817), 47: (7.605, -14.500), 48: (8.227, -5.800),
    49: (12.498, 8.000), 50: (7.048, -8.333), 51: (13.498, 47.195), 52: (23.407, 61.583),
    53: (13.213, 18.167), 54: (18.920, -30.483), 55: (19.668, -30.967), 56: (19.278, 30.183),
    57: (18.887, 33.029), 58: (12.373, 11.817), 59: (12.700, 11.650), 60: (12.730, 11.550),
    61: (12.367, 4.467), 62: (17.017, -30.117), 63: (13.262, 42.033), 64: (12.945, 21.683),
    65: (11.312, 13.092), 66: (11.336, 12.992), 67: (11.800, 11.817), 68: (12.617, -26.733),
    69: (18.527, -32.350), 70: (18.723, -32.283), 71: (19.896, 18.783), 72: (20.893, -12.533),
    73: (20.978, -12.633), 74: (1.615, 15.783), 75: (20.100, -21.917), 76: (1.702, 51.567),
    77: (2.711, -0.017), 78: (3.783, 0.067), 79: (5.544, -24.533), 80: (16.283, -22.967),
    81: (9.928, 69.067), 82: (9.928, 69.683), 83: (13.617, -29.867), 84: (12.417, 12.887),
    85: (12.423, 11.517), 86: (12.433, 12.950), 87: (12.357, 12.387), 88: (12.533, 14.417),
    89: (12.590, 12.557), 90: (12.567, 13.163), 91: (12.590, 14.500), 92: (17.283, 43.137),
    93: (10.708, -23.867), 94: (12.833, 41.117), 95: (10.700, 11.700), 96: (10.925, 11.700),
    97: (11.247, 55.017), 98: (12.230, 14.900), 99: (12.315, 14.417), 100: (12.373, 15.817),
    101: (14.053, 54.349), 102: (15.100, 55.767), 103: (1.560, 60.667), 104: (12.667, -11.617),
    105: (10.788, 12.583), 106: (12.185, 47.300), 107: (16.204, -13.053), 108: (11.192, 55.667),
    109: (11.957, 53.375), 110: (0.677, 41.683),
}

# Visual magnitudes (approximate, for sky-map quick review)
MAGNITUDES: dict[int, float] = {
    1: 8.4, 2: 6.5, 3: 6.2, 4: 5.6, 5: 5.6, 6: 4.2, 7: 3.3, 8: 6.0, 9: 7.9, 10: 6.6,
    11: 5.8, 12: 6.7, 13: 5.8, 14: 7.6, 15: 6.2, 16: 6.0, 17: 7.0, 18: 7.5, 19: 6.8, 20: 9.0,
    21: 5.9, 22: 5.1, 23: 5.5, 24: 4.6, 25: 4.6, 26: 8.0, 27: 7.4, 28: 6.9, 29: 6.6, 30: 7.2,
    31: 3.4, 32: 8.1, 33: 5.7, 34: 5.2, 35: 5.1, 36: 6.0, 37: 5.6, 38: 7.4, 39: 4.6, 40: 8.4,
    41: 4.5, 42: 4.0, 43: 9.0, 44: 3.7, 45: 1.6, 46: 6.1, 47: 4.4, 48: 5.8, 49: 8.4, 50: 5.9,
    51: 8.4, 52: 6.9, 53: 6.3, 54: 7.6, 55: 6.3, 56: 8.3, 57: 8.8, 58: 9.7, 59: 9.6, 60: 8.8,
    61: 9.7, 62: 6.5, 63: 8.6, 64: 8.5, 65: 9.3, 66: 8.9, 67: 6.1, 68: 7.3, 69: 7.6, 70: 7.9,
    71: 8.3, 72: 9.3, 73: 9.0, 74: 9.4, 75: 8.5, 76: 10.1, 77: 8.9, 78: 8.3, 79: 7.7, 80: 7.3,
    81: 6.9, 82: 8.4, 83: 7.5, 84: 9.1, 85: 9.1, 86: 8.9, 87: 8.6, 88: 9.6, 89: 9.8, 90: 9.5,
    91: 10.2, 92: 6.4, 93: 6.2, 94: 8.2, 95: 9.7, 96: 9.2, 97: 9.9, 98: 10.1, 99: 9.9, 100: 9.3,
    101: 7.9, 102: 9.9, 103: 7.4, 104: 8.0, 105: 9.3, 106: 8.4, 107: 7.7, 108: 10.0, 109: 9.8, 110: 8.0,
}


def map_category(obj_type: str) -> str:
    t = obj_type.lower()
    if "open cluster" in t:
        return "open-cluster"
    if "globular" in t:
        return "globular-cluster"
    if "planetary" in t:
        return "planetary-nebula"
    if "supernova" in t or "snr" in t:
        return "supernova-remnant"
    if "galaxy" in t or "spiral" in t or "elliptical" in t or "lenticular" in t:
        return "galaxy"
    if "nebula" in t or "emission" in t or "reflection" in t or "diffuse" in t:
        return "diffuse-nebula"
    if "asterism" in t or "double star" in t or "star cloud" in t:
        return "other"
    return "other"


def parse_objects(html: str) -> list[dict]:
    pattern = re.compile(
        r'<div class="M-divs" id="M(\d+)">\s*'
        r'<div class="h1-M">\s*<h1>(.*?)</h1>\s*</div>\s*'
        r'(?:.*?)\s*'
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
        obj_type = fields.get("Type", "")
        ra, dec = COORDS.get(num, (0.0, 0.0))
        objects.append(
            {
                "num": num,
                "name": name,
                "type": obj_type,
                "category": map_category(obj_type),
                "constellation": fields.get("Constellation", ""),
                "distance": fields.get("Distance", ""),
                "description": fields.get("Description", ""),
                "magnitude": MAGNITUDES.get(num),
                "ra": ra,
                "dec": dec,
                "thumb": f"M{num}-thumb.jpg",
            }
        )
    objects.sort(key=lambda o: o["num"])
    return objects


def main() -> None:
    html = SOURCE.read_text(encoding="utf-8")
    catalog = parse_objects(html)
    OUT.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"Wrote {len(catalog)} objects to {OUT.name}")


if __name__ == "__main__":
    main()
