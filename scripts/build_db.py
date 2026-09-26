#!/usr/bin/env python3
"""Build local master fare databases plus tiny per-origin audit-fare shards.

Runtime rule: the browser never contacts MTR/data.gov.hk. GitHub Actions downloads
and stores the official CSV snapshots in this repository, then this builder writes:

- data/mtr.json and data/light-rail.json: complete official tables, all fare columns;
- data/fare/mtr/*.json and data/fare/light-rail/*.json: tiny Adult-Octopus lookup shards;
- assets/fare-index.js: origin -> shard filename mapping used by the app.

The tiny shards deliberately contain only the value displayed by this audit UI. The
complete official fare columns remain preserved in the master databases above.
"""
from __future__ import annotations

import csv
import datetime
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"
ASSETS = ROOT / "assets"


def read_table(name: str):
    p = RAW / name
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    if not rows:
        return {"columns": [], "rows": []}
    return {"columns": rows[0], "rows": rows[1:]}


def objects(table):
    return [dict(zip(table["columns"], r)) for r in table.get("rows", [])]


def write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def norm_header(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(s).strip().lower()).strip("_")


def exact_col(columns, *candidates):
    low = {norm_header(c): c for c in columns}
    for c in candidates:
        k = norm_header(c)
        if k in low:
            return low[k]
    return None


def fuzzy_col(columns, exact=(), required_groups=(), forbidden=()):
    x = exact_col(columns, *exact)
    if x:
        return x
    for c in columns:
        n = norm_header(c)
        if any(tok in n for tok in forbidden):
            continue
        ok = True
        for group in required_groups:
            if not any(tok in n for tok in group):
                ok = False
                break
        if ok:
            return c
    return None


def clean_dir(p: Path):
    if p.exists():
        shutil.rmtree(p)
    p.mkdir(parents=True, exist_ok=True)


def safe(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", str(s)).strip("_") or "unknown"


def norm_id(v: str) -> str:
    s = str(v).strip()
    if re.fullmatch(r"[0-9]+", s):
        return str(int(s))
    return s


def fare_number(v):
    s = str(v).strip().replace("HK$", "").replace("$", "").replace(",", "")
    if not s or s.lower() in {"na", "n/a", "-", "--", "null", "none"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def compact_shards(table, origin_col, dest_col, fare_col, outdir: Path, filename_for_origin, normalize_key=lambda x: str(x).strip()):
    """Write tiny {fares:{dest:adult_fare}} shards and return origin->filename."""
    rows = objects(table)
    grouped = {}
    for r in rows:
        origin_raw = str(r.get(origin_col, "")).strip()
        dest_raw = str(r.get(dest_col, "")).strip()
        fare = fare_number(r.get(fare_col, ""))
        if not origin_raw or not dest_raw or fare is None:
            continue
        origin = normalize_key(origin_raw)
        dest = normalize_key(dest_raw)
        grouped.setdefault(origin, {})[dest] = fare
    clean_dir(outdir)
    index = {}
    for origin, fares in grouped.items():
        fn = filename_for_origin(origin)
        if not fn:
            continue
        write_json(outdir / f"{fn}.json", {"fares": fares})
        index[origin] = f"{fn}.json"
    return index, sum(len(v) for v in grouped.values())


heavy = read_table("mtr_lines_fares.csv")
ael = read_table("airport_express_fares.csv")
stations = read_table("mtr_lines_and_stations.csv")
lrfares = read_table("light_rail_fares.csv")
lrstops = read_table("light_rail_routes_and_stops.csv")

for label, t in [
    ("MTR fares", heavy),
    ("AEL fares", ael),
    ("station list", stations),
    ("Light Rail fares", lrfares),
    ("Light Rail stops", lrstops),
]:
    if not t["rows"]:
        raise SystemExit(f"{label} is empty")

built = datetime.datetime.now(datetime.timezone.utc).isoformat()
common = {
    "ready": True,
    "builtAt": built,
    "source": "MTR Corporation Open Data snapshot stored in this GitHub repository",
}
write_json(OUT / "mtr.json", {**common, "heavyRail": heavy, "airportExpress": ael, "linesAndStations": stations})
write_json(OUT / "light-rail.json", {**common, "lightRailFares": lrfares, "lightRailRoutesAndStops": lrstops})

# Heavy rail columns.
h_origin = fuzzy_col(heavy["columns"], exact=("SRC_STATION_NAME",), required_groups=(("src", "source", "from"), ("station",), ("name",)))
h_dest = fuzzy_col(heavy["columns"], exact=("DEST_STATION_NAME",), required_groups=(("dest", "destination", "to"), ("station",), ("name",)))
h_fare = fuzzy_col(
    heavy["columns"],
    exact=("OCT_ADT_FARE", "OCTOPUS_ADULT_FARE", "ADULT_OCTOPUS_FARE"),
    required_groups=(("oct", "octopus"), ("adt", "adult"), ("fare",)),
    forbidden=("child", "concession", "con_", "elder", "pwd", "student", "single"),
)

# AEL columns retained for the master DB / fallback JS. Runtime Airport-to-city
# values are also embedded in the app so a fare lookup never requires a large file.
a_origin = fuzzy_col(ael["columns"], exact=("ST_FROM", "SRC_STATION_NAME"), required_groups=(("from", "src", "source"),))
a_dest = fuzzy_col(ael["columns"], exact=("ST_TO", "DEST_STATION_NAME"), required_groups=(("to", "dest", "destination"),))
a_fare = fuzzy_col(
    ael["columns"],
    exact=("OCT_ADT_FARE", "OCTOPUS_ADULT_FARE", "ADULT_OCTOPUS_FARE"),
    required_groups=(("oct", "octopus"), ("adt", "adult"), ("fare",)),
    forbidden=("child", "concession", "elder", "pwd", "student", "single"),
)

# Light Rail source headers have changed naming style over time. Accept both the
# official older/newer names and fuzzy variants, then normalise numeric IDs so
# "001" and "1" resolve to the same stop.
l_origin = fuzzy_col(
    lrfares["columns"],
    exact=("from_station_id", "SRC_STOP_ID", "SRC_STATION_ID", "FROM_STOP_ID", "FROM_STATION_ID"),
    required_groups=(("from", "src", "source"), ("id",)),
)
l_dest = fuzzy_col(
    lrfares["columns"],
    exact=("to_station_id", "DEST_STOP_ID", "DEST_STATION_ID", "TO_STOP_ID", "TO_STATION_ID"),
    required_groups=(("to", "dest", "destination"), ("id",)),
)
l_fare = fuzzy_col(
    lrfares["columns"],
    exact=("fare_octo_adult", "OCT_ADT_FARE", "OCT_ADULT_FARE", "OCTOPUS_ADULT_FARE", "ADULT_OCTOPUS_FARE"),
    required_groups=(("oct", "octopus"), ("adt", "adult"), ("fare",)),
    forbidden=("child", "concession", "con_", "elder", "pwd", "student", "single"),
)
# Some Light Rail versions use a generic ADULT_FARE field for the Octopus OD table.
if not l_fare:
    l_fare = fuzzy_col(
        lrfares["columns"],
        exact=("ADULT_FARE", "FARE_ADULT"),
        required_groups=(("adult", "adt"), ("fare",)),
        forbidden=("child", "concession", "elder", "single"),
    )

for label, value, cols in [
    ("heavy origin", h_origin, heavy["columns"]),
    ("heavy destination", h_dest, heavy["columns"]),
    ("heavy adult Octopus fare", h_fare, heavy["columns"]),
    ("AEL origin", a_origin, ael["columns"]),
    ("AEL destination", a_dest, ael["columns"]),
    ("AEL adult Octopus fare", a_fare, ael["columns"]),
    ("Light Rail origin", l_origin, lrfares["columns"]),
    ("Light Rail destination", l_dest, lrfares["columns"]),
    ("Light Rail adult fare", l_fare, lrfares["columns"]),
]:
    if not value:
        raise SystemExit(f"Cannot identify {label} column. Columns={cols}")

# English station name -> station code, from official station list.
sc = exact_col(stations["columns"], "Station Code", "STATION_CODE")
ec = exact_col(stations["columns"], "English Name", "STATION_NAME", "English Station Name")
name_to_code = {}
if sc and ec:
    for r in objects(stations):
        n = str(r.get(ec, "")).strip()
        c = str(r.get(sc, "")).strip()
        if n and c:
            name_to_code.setdefault(n, c)

def code_for_name(name):
    return name_to_code.get(name) or safe(name)

mtr_index, mtr_pairs = compact_shards(heavy, h_origin, h_dest, h_fare, OUT / "fare" / "mtr", code_for_name)
ael_index, ael_pairs = compact_shards(ael, a_origin, a_dest, a_fare, OUT / "fare" / "ael", code_for_name)
lr_index, lr_pairs = compact_shards(lrfares, l_origin, l_dest, l_fare, OUT / "fare" / "light-rail", safe, norm_id)

# Basic release gates: refuse to deploy a superficially-built but unusable DB.
if len(mtr_index) < 80 or mtr_pairs < 5000:
    raise SystemExit(f"Heavy-rail compact DB incomplete: origins={len(mtr_index)} pairs={mtr_pairs}")
if len(lr_index) < 55 or lr_pairs < 1000:
    raise SystemExit(f"Light Rail compact DB incomplete: origins={len(lr_index)} pairs={lr_pairs}")

fare_index = {"ready": True, "builtAt": built, "mtr": mtr_index, "ael": ael_index, "lightRail": lr_index}
write_json(OUT / "fare-index.json", fare_index)
(ASSETS / "fare-index.js").write_text(
    "window.MTR_FARE_INDEX=" + json.dumps(fare_index, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

# Complete official AEL table remains stored; JS fallback keeps direct ZIP preview useful.
ael_fallback = {
    "ready": True,
    "source": "MTR Corporation Open Data snapshot stored in this GitHub repository",
    "columns": ael["columns"],
    "rows": ael["rows"],
}
write_json(OUT / "ael-fallback.json", ael_fallback)
(ASSETS / "ael-fallback.js").write_text(
    "window.AEL_FALLBACK=" + json.dumps(ael_fallback, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

# Build a de-duplicated Light Rail stop list.
lc = exact_col(lrstops["columns"], "Stop Code")
li = exact_col(lrstops["columns"], "Stop ID")
lz = exact_col(lrstops["columns"], "Chinese Name")
le = exact_col(lrstops["columns"], "English Name")
if not li:
    li = fuzzy_col(lrstops["columns"], required_groups=(("stop", "station"), ("id",)))
if not li:
    raise SystemExit(f"Cannot identify Light Rail stop ID column: {lrstops['columns']}")

stop_by = {}
for r in objects(lrstops):
    raw_id = str(r.get(li, "")).strip()
    if not raw_id:
        continue
    sid = norm_id(raw_id)
    stop_by.setdefault(
        sid,
        {
            "id": sid,
            "code": str(r.get(lc, "")).strip() if lc else "",
            "zh": str(r.get(lz, "")).strip() if lz else sid,
            "en": str(r.get(le, "")).strip() if le else sid,
        },
    )

def sid_key(x):
    try:
        return (0, int(x["id"]))
    except Exception:
        return (1, x["id"])

stop_list = sorted(stop_by.values(), key=sid_key)
if len(stop_list) < 60:
    raise SystemExit(f"Light Rail stop list incomplete: {len(stop_list)}")
write_json(OUT / "light-rail-stops.json", {"ready": True, "builtAt": built, "stops": stop_list})
(ASSETS / "light-rail-stops.js").write_text(
    "window.LIGHT_RAIL_STOPS=" + json.dumps(stop_list, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

print("columns:", {"heavy": [h_origin, h_dest, h_fare], "ael": [a_origin, a_dest, a_fare], "lr": [l_origin, l_dest, l_fare]})
print("master bytes", (OUT / "mtr.json").stat().st_size, (OUT / "light-rail.json").stat().st_size)
print("compact origins/pairs", len(mtr_index), mtr_pairs, len(ael_index), ael_pairs, len(lr_index), lr_pairs, "LR stops", len(stop_list))
