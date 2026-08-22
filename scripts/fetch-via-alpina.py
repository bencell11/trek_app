"""Regenerate src/data/via-alpina-ch.json from OpenStreetMap + swisstopo.

Fetches the 20 official stages of the Via Alpina Switzerland route
(OSM relation 12359033, "Via Alpina" / SwitzerlandMobility Route 1,
Vaduz -> Montreux) via the Overpass API, reconstructs each stage's
geometry by chaining ways on shared OSM node ids, and computes
elevation gain/loss via swisstopo's profile API.

Run from the repo root:

    python3 scripts/fetch-via-alpina.py

Results are cached under scripts/.cache/ so re-runs after a partial
failure don't re-fetch data that already succeeded. Delete that
directory to force a full refresh (e.g. after OSM data changes).
"""

import json
import math
import os
import time
import urllib.parse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(SCRIPT_DIR, ".cache")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "src", "data", "via-alpina-ch.json")
os.makedirs(CACHE_DIR, exist_ok=True)

# The 20 stage sub-relations of OSM relation 12359033 ("Via Alpina"),
# found once via: relation(12359033); out body; way(r); out geom;
STAGE_IDS = [
    12359032, 12359031, 12359030, 12359029, 12359028, 12359027,
    14249137, 14249136, 14249135, 14249134, 14249133, 14249132,
    14249131, 14249130, 14249129, 14249128, 14249127, 14249126,
    14249125, 14249124,
]

UA = {"User-Agent": "trek-app-data-fetch/1.0 (personal project, contact via github bencell11)"}


def http_get(url, retries=5):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)
        except Exception as e:
            wait = 5 * (attempt + 1)
            print(f"  retry {attempt + 1}/{retries} after error: {e} (waiting {wait}s)")
            time.sleep(wait)
    raise RuntimeError(f"failed after retries: {url}")


def http_post(url, fields, retries=5):
    body = urllib.parse.urlencode(fields).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=UA, method="POST")
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)
        except Exception as e:
            wait = 5 * (attempt + 1)
            print(f"  retry {attempt + 1}/{retries} after error: {e} (waiting {wait}s)")
            time.sleep(wait)
    raise RuntimeError(f"failed after retries (POST): {url}")


def overpass(query, retries=5):
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)
        except Exception as e:
            wait = 5 * (attempt + 1)
            print(f"  retry {attempt + 1}/{retries} after error: {e} (waiting {wait}s)")
            time.sleep(wait)
    raise RuntimeError("overpass failed after retries")


def haversine(a, b):
    R = 6371000.0
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def stitch(ways, label=""):
    """Chain ways into one ordered line using exact shared OSM node ids at
    their endpoints (how route relations are actually built), falling back
    to nearest-endpoint-by-distance only when a real gap exists."""
    segments = [
        {
            "nodes": (w["nodes"][0], w["nodes"][-1]),
            "coords": [(p["lat"], p["lon"]) for p in w["geometry"]],
        }
        for w in ways
        if w.get("geometry") and w.get("nodes")
    ]
    if not segments:
        return []

    remaining = segments[1:]
    line = list(segments[0]["coords"])
    line_end_node = segments[0]["nodes"][1]
    gaps = 0

    while remaining:
        match_i, reverse = None, False
        for i, seg in enumerate(remaining):
            if seg["nodes"][0] == line_end_node:
                match_i, reverse = i, False
                break
            if seg["nodes"][1] == line_end_node:
                match_i, reverse = i, True
                break

        if match_i is None:
            gaps += 1
            end = line[-1]
            best_i, best_rev, best_d = None, False, float("inf")
            for i, seg in enumerate(remaining):
                d_start = haversine(end, seg["coords"][0])
                d_end = haversine(end, seg["coords"][-1])
                if d_start < best_d:
                    best_d, best_i, best_rev = d_start, i, False
                if d_end < best_d:
                    best_d, best_i, best_rev = d_end, i, True
            match_i, reverse = best_i, best_rev

        seg = remaining.pop(match_i)
        coords = seg["coords"][::-1] if reverse else seg["coords"]
        nodes = (seg["nodes"][1], seg["nodes"][0]) if reverse else seg["nodes"]
        line.extend(coords)
        line_end_node = nodes[1]

    if gaps:
        print(f"  ! {label}: {gaps} gap(s) in way chain, used nearest-endpoint fallback")
    return line


# A single mapped-way-to-way jump this large is a stitching artifact
# (disconnected relation members bridged by the nearest-endpoint
# fallback above), not real trail: consecutive OSM way-geometry points
# are normally tens of metres apart. We keep every point (so the line
# on the map stays visually continuous) but exclude the jump itself
# from the distance/elevation totals, so a fake "teleport" can't
# inflate either.
JUMP_THRESHOLD_M = 2000


def split_at_jumps(line, label=""):
    runs, current = [], [line[0]]
    for i in range(1, len(line)):
        if haversine(line[i - 1], line[i]) > JUMP_THRESHOLD_M:
            runs.append(current)
            current = [line[i]]
        else:
            current.append(line[i])
    runs.append(current)
    if len(runs) > 1:
        print(f"  ! {label}: {len(runs) - 1} stitching jump(s) excluded from distance/D+/-")
    return runs


def wgs84_to_lv95(lat, lon):
    """Approximate WGS84 -> CH1903+/LV95 transform (swisstopo formula)."""
    lat_sec = lat * 3600
    lon_sec = lon * 3600
    lat_aux = (lat_sec - 169028.66) / 10000
    lon_aux = (lon_sec - 26782.5) / 10000
    y = (600072.37 + 211455.93 * lon_aux - 10938.51 * lon_aux * lat_aux
         - 0.36 * lon_aux * lat_aux ** 2 - 44.54 * lon_aux ** 3)
    x = (200147.07 + 308807.95 * lat_aux + 3745.25 * lon_aux ** 2 + 76.63 * lat_aux ** 2
         - 194.56 * lon_aux ** 2 * lat_aux + 119.79 * lat_aux ** 3)
    return x + 1000000, y + 2000000  # (N, E) in LV95


def decimate(line, target_n=120):
    if len(line) <= target_n:
        return line
    step = len(line) / target_n
    idx = sorted(set(int(i * step) for i in range(target_n)))
    if idx[-1] != len(line) - 1:
        idx.append(len(line) - 1)
    return [line[i] for i in idx]


def elevation_profile(line_decimated):
    lv95 = [wgs84_to_lv95(lat, lon) for lat, lon in line_decimated]
    geom = {"type": "LineString", "coordinates": [[e, n] for n, e in lv95]}
    data = http_post(
        "https://api3.geo.admin.ch/rest/services/profile.json",
        {"geom": json.dumps(geom), "sr": 2056},
    )
    elevations = [pt["alts"]["COMB"] for pt in data]
    gain = sum(max(0, elevations[i + 1] - elevations[i]) for i in range(len(elevations) - 1))
    loss = sum(max(0, elevations[i] - elevations[i + 1]) for i in range(len(elevations) - 1))
    return round(gain), round(loss)


def main():
    stages = []
    for idx, rid in enumerate(STAGE_IDS):
        cache_file = f"{CACHE_DIR}/{rid}.json"
        if os.path.exists(cache_file):
            print("cached", rid)
            d = json.load(open(cache_file))
        else:
            print("fetching", rid)
            d = overpass(f"[out:json][timeout:60];relation({rid});out body;way(r);out geom;")
            json.dump(d, open(cache_file, "w"))
            time.sleep(3)

        rel = next(e for e in d["elements"] if e["type"] == "relation")
        ways = [e for e in d["elements"] if e["type"] == "way"]
        stage_label = f"stage {rel['tags'].get('stage', idx + 1)}"
        line = stitch(ways, label=stage_label)
        runs = split_at_jumps(line, label=stage_label)

        dist_m = sum(
            haversine(run[i], run[i + 1]) for run in runs for i in range(len(run) - 1)
        )
        total_len = sum(len(r) for r in runs)
        runs_dec = [decimate(r, max(2, round(120 * len(r) / total_len))) for r in runs]
        line_dec = [p for r in runs_dec for p in r]

        profile_cache = f"{CACHE_DIR}/{rid}_profile.json"
        if os.path.exists(profile_cache):
            gain, loss = json.load(open(profile_cache))
        else:
            gain, loss = 0, 0
            for run_dec in runs_dec:
                if len(run_dec) < 2:
                    continue
                g, l = elevation_profile(run_dec)
                gain += g
                loss += l
                time.sleep(1)
            json.dump([gain, loss], open(profile_cache, "w"))

        ref = rel["tags"].get("stage") or str(idx + 1)
        stages.append({
            "ref": ref,
            "nom": f"{rel['tags'].get('from')} → {rel['tags'].get('to')}",
            "depart": rel["tags"].get("from"),
            "arrivee": rel["tags"].get("to"),
            "distanceKm": round(dist_m / 1000, 1),
            "denivelePositif": gain,
            "deniveleNegatif": loss,
            "trace": [[round(p[0], 5), round(p[1], 5)] for p in line_dec],
        })
        print(f"  -> stage {ref}: {rel['tags'].get('from')} -> {rel['tags'].get('to')}, "
              f"{round(dist_m / 1000, 1)}km, +{gain}m/-{loss}m, {len(line_dec)} pts")

    stages.sort(key=lambda s: int(s["ref"]))
    out = {
        "source": "OpenStreetMap contributors, relation 12359033 (Via Alpina / SwitzerlandMobility Route 1)",
        "license": "ODbL - https://www.openstreetmap.org/copyright",
        "elevationSource": "swisstopo profile API (api3.geo.admin.ch)",
        "from": "Vaduz",
        "to": "Montreux",
        "stages": stages,
    }
    with open(OUTPUT_PATH, "w") as f:
        json.dump(out, f)

    print("done,", len(stages), "stages ->", OUTPUT_PATH)


if __name__ == "__main__":
    main()
