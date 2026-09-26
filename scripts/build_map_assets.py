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


def read_legacy_hotspots(path: Path) -> dict[str, tuple[float, float]]:
    """Read the checked-in approximate point layer before any regeneration.

    These points are only seeds. When the PDF text layer is unavailable, they
    are snapped to the nearest compact vector station symbol on the exact PDF.
    """
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="ignore")
    out: dict[str, tuple[float, float]] = {}
    pat = re.compile(r"['\"]([^'\"]+)['\"]\s*:\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)")
    for m in pat.finditer(text):
        out[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return out


def rgb_from_hex(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def color_distance(a, b) -> float:
    if a is None or b is None:
        return 9.0
    try:
        return math.sqrt(sum((float(a[i]) - float(b[i])) ** 2 for i in range(3)))
    except Exception:
        return 9.0


def compact_vector_candidates(page, W: float, H: float):
    """Return compact PDF vector nodes likely to be station circles.

    The official map can outline text as vectors, so geometry alone is noisy.
    Route-colour proximity is therefore part of the score; station circles are
    compact and normally stroked/filled with one of the published line colours.
    """
    route_colours = [rgb_from_hex(v) for v in COLORS.values()]
    candidates = []
    try:
        drawings = page.get_drawings()
    except Exception:
        return candidates
    for d in drawings:
        r = d.get("rect")
        if not r:
            continue
        w, h = float(r.width), float(r.height)
        if not (1.0 <= w <= 20.0 and 1.0 <= h <= 20.0):
            continue
        ratio = max(w, h) / max(min(w, h), 0.1)
        if ratio > 1.75:
            continue
        cx, cy = (float(r.x0 + r.x1) / 2.0, float(r.y0 + r.y1) / 2.0)
        if not (0 <= cx <= W and 0 <= cy <= H):
            continue
        stroke, fill = d.get("color"), d.get("fill")
        line_delta = min([color_distance(stroke, c) for c in route_colours] + [color_distance(fill, c) for c in route_colours])
        # Shape penalty favours near-circular/square compact symbols.
        shape_penalty = abs(w - h) / max(w, h)
        items = d.get("items") or []
        curve_bonus = -0.12 if any((it and it[0] == "c") for it in items) else 0.0
        colour_penalty = min(line_delta, 0.8)
        candidates.append({"cx": cx, "cy": cy, "w": w, "h": h, "shape": shape_penalty, "colour": colour_penalty, "curve": curve_bonus})
    return candidates


def snap_seed_points(seed: dict[str, tuple[float, float]], candidates, W: float, H: float, station_colours: dict[str, str]):
    """Snap each seed to the exact centre of a nearby vector node.

    One vector node is used at most once. This prevents two nearby station names
    from collapsing onto the same drawn marker. Unsafely distant matches are not
    accepted; their seeds remain unchanged.
    """
    if not seed or not candidates:
        return {}, 0
    diagonal = math.hypot(W, H)
    pairs = []
    for name, (xp, yp) in seed.items():
        ex, ey = xp / 100.0 * W, yp / 100.0 * H
        for i, c in enumerate(candidates):
            d = math.hypot(c["cx"] - ex, c["cy"] - ey)
            nd = d / max(diagonal, 1.0)
            if nd > 0.055:
                continue
            # Distance dominates; colour/shape only break local ambiguity.
            score = nd * 100.0 + c["shape"] * 0.9 + c["colour"] * 0.35 + c["curve"]
            pairs.append((score, d, name, i))
    pairs.sort(key=lambda x: (x[0], x[1]))
    used_names, used_nodes, snapped = set(), set(), {}
    for score, d, name, i in pairs:
        if name in used_names or i in used_nodes:
            continue
        c = candidates[i]
        snapped[name] = {
            "cx": round(c["cx"] / W * 100, 3),
            "cy": round(c["cy"] / H * 100, 3),
            "color": station_colours.get(name, "#111827"),
        }
        used_names.add(name); used_nodes.add(i)
    return snapped, len(snapped)


# Build authoritative station-name set from the freshly downloaded MTR CSV.
stations: dict[str, str] = {}
station_lines_count: dict[str, int] = {}
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
        if name:
            station_lines_count[name] = station_lines_count.get(name, 0) + (1 if line else 0)
        if name and name not in stations:
            stations[name] = COLORS.get(line, "#111827")

legacy_seed_points = read_legacy_hotspots(js)

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
        "shape": "interchange" if station_lines_count.get(name, 0) > 1 else "station",
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
    # Current MTR PDF may have no searchable station text. In that case use the
    # checked-in points only as seeds, and snap their centres onto compact vector
    # symbols from the exact official PDF. This corrects the visible click button
    # to the map's station node rather than leaving it merely nearby.
    # Unselected buttons stay visually invisible so the user taps the exact
    # official station symbol already drawn in the map artwork.
    existing = count_existing_hotspots(js)
    if existing < MIN_GOOD_HOTSPOTS:
        raise SystemExit(
            f"PDF text layer yielded only {len(points)} hotspots and checked-in fallback has only {existing}; "
            "refusing to deploy an unusable click layer"
        )
    candidates = compact_vector_candidates(page, W, H)
    snapped_points, vector_snapped = snap_seed_points(legacy_seed_points, candidates, W, H, stations)
    print("vector_candidates", len(candidates), "seed_points", len(legacy_seed_points), "vector_snapped", vector_snapped)
    if vector_snapped >= MIN_GOOD_HOTSPOTS:
        # Any rare unsnapped station keeps its original seed, but every accepted
        # vector-snapped point is now exactly centred on the PDF node.
        for name, (xp, yp) in legacy_seed_points.items():
            snapped_points.setdefault(name, {"cx": round(xp, 3), "cy": round(yp, 3), "color": stations.get(name, "#111827"), "shape": "interchange" if station_lines_count.get(name, 0) > 1 else "station"})
        with js.open("w", encoding="utf-8") as f:
            f.write("// Auto-generated by snapping checked-in seeds to exact vector station nodes in the official MTR PDF.\nwindow.MTR_MAP_POINTS=")
            json.dump(snapped_points, f, ensure_ascii=False, separators=(",", ":"))
            f.write(";\n")
        print(f"station click layer snapped to exact PDF vector nodes ({vector_snapped} stations)")
    else:
        print(
            f"PDF labels are not machine-searchable and only {vector_snapped} vector nodes were safely snapped; "
            f"keeping checked-in fallback click layer ({existing} hotspots). CSS still centres each click button exactly on its coordinate."
        )
