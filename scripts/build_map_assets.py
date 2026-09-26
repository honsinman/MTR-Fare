#!/usr/bin/env python3
"""Render the exact official MTR route-map PDF and build/retain station click targets.

Important: the current official routemap.pdf can contain station labels as vector
outlines rather than searchable PDF text. In that case PyMuPDF ``search_for``
returns zero station names even though the map visually contains them.

Therefore this builder follows a safe two-stage policy:
1. Always render the exact downloaded official PDF to ``mtr-system-map.png``.
2. Replace ``map-hotspots.js`` only if >=80 station positions can be recovered
   from the PDF text/vector layer. Otherwise retain the checked-in, validated
   fallback hotspot layer instead of failing the whole Pages deployment.
"""
from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path

try:
    import pymupdf as fitz  # current PyMuPDF API
except ImportError:  # compatibility with older runners
    import fitz  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
pdf = ROOT / "assets" / "mtr-system-map.pdf"
png = ROOT / "assets" / "mtr-system-map.png"
js = ROOT / "assets" / "map-hotspots.js"
csvp = ROOT / "data" / "raw" / "mtr_lines_and_stations.csv"

COLORS = {
    "AEL": "#00888A", "TCL": "#F7943E", "TML": "#923011",
    "TKL": "#7D499D", "EAL": "#53B7E8", "SIL": "#BAC429",
    "TWL": "#ED1D24", "ISL": "#007DC5", "KTL": "#00AB4E",
    "DRL": "#F173AC",
}
ALIASES = {
    "HKU": ["HKU", "Hong Kong University"],
    "AsiaWorld-Expo": ["AsiaWorld-Expo", "AsiaWorld Expo"],
    "LOHAS Park": ["LOHAS Park", "LOHAS"],
    "East Tsim Sha Tsui": ["East Tsim Sha Tsui"],
    "Exhibition Centre": ["Exhibition Centre"],
    "Disneyland Resort": ["Disneyland Resort"],
}
MIN_GOOD_HOTSPOTS = 80


def pick_key(row: dict[str, str], terms: list[str]):
    for k in row:
        u = k.upper()
        if all(t in u for t in terms):
            return k
    return None


def count_existing_hotspots(path: Path) -> int:
    """Count either legacy array points or generated object points."""
    if not path.exists():
        return 0
    text = path.read_text(encoding="utf-8", errors="ignore")
    # Legacy: 'Station':[x,y] ; generated: "Station":{"cx":...
    legacy = len(re.findall(r"['\"][^'\"]+['\"]\s*:\s*\[", text))
    generated = text.count('"cx":') + text.count("'cx':")
    return max(legacy, generated)


# Build authoritative station-name set from the freshly downloaded MTR CSV.
stations: dict[str, str] = {}
with csvp.open("r", encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        lk = pick_key(row, ["LINE", "CODE"])
        ek = next(
            (k for k in row if ("ENGLISH" in k.upper() or "ENG" in k.upper()) and "NAME" in k.upper()),
            None,
        )
        if not ek:
            ek = next((k for k in row if "STATION_NAME" in k.upper() and "CHI" not in k.upper()), None)
        if not ek:
            continue
        name = (row.get(ek) or "").strip()
        line = (row.get(lk) or "").strip() if lk else ""
        if name and name not in stations:
            stations[name] = COLORS.get(line, "#111827")

# Render exact official PDF artwork first. This succeeds even when its text is
# vector outlines and cannot be searched.
doc = fitz.open(pdf)
if len(doc) < 1:
    raise SystemExit("Official MTR route-map PDF has no pages")
page = doc[0]
rect = page.rect
W, H = rect.width, rect.height
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
pix.save(png)
if not png.exists() or png.stat().st_size == 0:
    raise SystemExit("Failed to render official MTR route-map PDF")

# Candidate compact vector symbols for optional snapping.
symbols = []
try:
    for d in page.get_drawings():
        r = d.get("rect")
        if not r:
            continue
        w, h = float(r.width), float(r.height)
        if 1.2 <= w <= 18 and 1.2 <= h <= 18 and max(w, h) / max(min(w, h), 0.1) <= 2.2:
            symbols.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, w, h))
except Exception:
    symbols = []


def dist_to_rect(px, py, r):
    dx = max(r.x0 - px, 0, px - r.x1)
    dy = max(r.y0 - py, 0, py - r.y1)
    return math.hypot(dx, dy)


def choose_text_hit(name):
    hits = []
    for q in ALIASES.get(name, [name]):
        hits.extend(page.search_for(q))
    if not hits:
        return None
    cand = []
    for r in hits:
        cx = (r.x0 + r.x1) / 2
        cy = (r.y0 + r.y1) / 2
        if cy / H > 0.88 and cx / W < 0.40:
            continue
        if r.height > 24:
            continue
        score = r.height + (1.0 if cy / H > 0.84 else 0) + (0.6 if cx / W < 0.03 or cx / W > 0.97 else 0)
        cand.append((score, r))
    if not cand:
        cand = [(r.height, r) for r in hits]
    return min(cand, key=lambda x: x[0])[1]


points = {}
missing = []
snapped = 0
for name, color in stations.items():
    r = choose_text_hit(name)
    if r is None:
        missing.append(name)
        continue
    near = []
    for sx, sy, sw, sh in symbols:
        d = dist_to_rect(sx, sy, r)
        if d <= 28:
            near.append((d, abs(sw - sh), sw * sh, sx, sy))
    if near:
        _, _, _, cx, cy = min(near, key=lambda x: (x[0], x[1], x[2]))
        snapped += 1
    else:
        cx = max(0, r.x0 - 3.0)
        cy = (r.y0 + r.y1) / 2
    points[name] = {
        "cx": round(cx / W * 100, 3),
        "cy": round(cy / H * 100, 3),
        "color": color,
    }

print("pdf_text_hotspots", len(points), "snapped_to_vector_node", snapped, "missing", len(missing))
if missing:
    print("pdf_text_missing:", ", ".join(missing))

if len(points) >= MIN_GOOD_HOTSPOTS:
    with js.open("w", encoding="utf-8") as f:
        f.write("// Auto-generated from the exact official MTR route-map PDF.\nwindow.MTR_MAP_POINTS=")
        json.dump(points, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("map hotspot layer regenerated from PDF text/vector data")
else:
    # Current MTR PDF may have no searchable text at all. Do not overwrite a
    # useful checked-in hotspot layer with an empty object, and do not block the
    # whole Pages deployment just because PDF text extraction is unavailable.
    existing = count_existing_hotspots(js)
    if existing < MIN_GOOD_HOTSPOTS:
        raise SystemExit(
            f"PDF text layer yielded only {len(points)} hotspots and checked-in fallback has only {existing}; "
            "refusing to deploy an unusable click layer"
        )
    print(
        f"PDF labels are not machine-searchable; keeping checked-in fallback click layer "
        f"({existing} hotspots) while using the exact rendered official PDF image"
    )
