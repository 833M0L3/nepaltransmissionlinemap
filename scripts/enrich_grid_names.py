"""
Enrich `public/data/nepal-osm-grid.json` with official NEA transmission line names
based on verified 400 kV / 220 kV / 132 kV / 66 kV corridors, connected substations,
and geographic endpoints.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OSM_GRID_PATH = ROOT / "public" / "data" / "nepal-osm-grid.json"
SUBSTATIONS_PATH = ROOT / "public" / "data" / "nepal-substations.json"
DCS_PATH = ROOT / "public" / "data" / "nepal-dcs.json"

# Exact official NEA project names for verified 400 kV & 220 kV OSM way IDs
EXACT_WAY_NAMES: dict[str, str] = {
    # 400 kV
    "way/825794567": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Dhalkebar–Inaruwa)",
    "way/825794568": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Dhalkebar–Inaruwa)",
    "way/825794569": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Dhalkebar–Inaruwa)",
    "way/825794570": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Dhalkebar–Inaruwa)",
    "way/1369934060": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Dhalkebar–Inaruwa)",
    "way/825864228": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/825864229": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/825864231": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/1374419612": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/1374448963": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/1374448965": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/1374461415": "Hetauda–Dhalkebar–Inaruwa 400 kV Transmission Line (Hetauda–Dhalkebar)",
    "way/825794572": "Dhalkebar–Muzaffarpur 400 kV Cross-Border Transmission Line",
    "way/1330635036": "Dhalkebar–Muzaffarpur 400 kV Cross-Border Transmission Line",
    "way/1369965469": "New Khimti–Barhabise–Lapsiphedi 400 kV Transmission Line",
    "way/1370062070": "New Khimti–Barhabise–Lapsiphedi 400 kV Transmission Line",
    # 220 kV
    "way/343130531": "Upper Tamakoshi–New Khimti–Dhalkebar 220 kV Transmission Line",
    "way/1369957392": "Upper Tamakoshi–New Khimti–Dhalkebar 220 kV Transmission Line",
    "way/1370060597": "Upper Tamakoshi–New Khimti–Dhalkebar 220 kV Transmission Line",
    "way/1456250299": "Upper Tamakoshi–New Khimti–Dhalkebar 220 kV Transmission Line",
    "way/824888671": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1369393579": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1369393580": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456273827": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456273828": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456273829": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456273830": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456273831": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456282760": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/1456282761": "Bharatpur–Bardaghat–New Butwal 220 kV Transmission Line",
    "way/825755911": "Hetauda–Bharatpur 220 kV Transmission Line",
    "way/825755912": "Hetauda–Bharatpur 220 kV Transmission Line",
    "way/1369616444": "Hetauda–Bharatpur 220 kV Transmission Line",
    "way/1374394753": "Hetauda–Bharatpur 220 kV Transmission Line",
    "way/825755905": "Trishuli 3A–Matatirtha 220 kV Transmission Line",
    "way/825755906": "Trishuli 3A–Matatirtha 220 kV Transmission Line",
    "way/825755907": "Trishuli 3A–Matatirtha 220 kV Transmission Line",
    "way/1374196413": "Marsyangdi–Kathmandu 220 kV Transmission Line (Markichowk–Matatirtha)",
    "way/1374200256": "Marsyangdi–Kathmandu 220 kV Transmission Line (Markichowk–Matatirtha)",
    "way/1374356998": "Marsyangdi–Kathmandu 220 kV Transmission Line (Markichowk–Matatirtha)",
    "way/1278978357": "Kali Gandaki Corridor 220 kV Transmission Line (Dana–Kusma–New Butwal)",
    "way/1369373441": "Kali Gandaki Corridor 220 kV Transmission Line (Dana–Kusma–New Butwal)",
    "way/1369598417": "Kali Gandaki Corridor 220 kV Transmission Line (Dana–Kusma–New Butwal)",
    "way/1369607204": "Kali Gandaki Corridor 220 kV Transmission Line (Dana–Kusma–New Butwal)",
    "way/1369733803": "Koshi Corridor 220 kV Transmission Line (Inaruwa–Basantapur–Tumlingtar)",
    "way/1369739651": "Koshi Corridor 220 kV Transmission Line (Inaruwa–Basantapur–Tumlingtar)",
    "way/1369739652": "Koshi Corridor 220 kV Transmission Line (Inaruwa–Basantapur–Tumlingtar)",
}

# Clean normalization for substation names (avoid "132/11 KV KUDHAR S/STN", Unicode Devanagari, etc.)
SUB_NAME_CLEAN: dict[str, str] = {
    "Heṭauḍā": "Hetauda",
    "132/11 KV KUDHAR S/STN": "Kudhar (Pokhara)",
    "Pokhara Electric Grid Center": "Pokhara",
    "NEA Syuchatar Sub Station": "Siuchatar",
    "Powerstation Martathirta": "Matatirtha",
    "Power Substation Bhalche": "Bhalche (Trishuli 3A)",
    "Bardaghat Sub-station": "Bardaghat",
    "Baneshwor Substation 220kv": "Baneshwor",
    "Baneshwor Substation": "Baneshwor",
    "Basantapur 220kv": "Basantapur",
    "Tumlingtar 220kv": "Tumlingtar",
    "Kusma 220kv": "Kusma",
    "Dana substation 220kv": "Dana",
    "Garjyang 132kv substation": "Garjyang",
    "Surkhet substation 132kv": "Surkhet",
    "Kabeli 132kv": "Kabeli",
    "Samundratar 132kv": "Samundratar",
    "Nawalpur 132kv": "Nawalpur",
    "Singati 132 KV Substation": "Singati",
    "Upper Tamakoshi substation": "Upper Tamakoshi",
    "Motipur Substation": "Motipur",
    "Tamghas substation": "Tamghas",
    "Patan Substation": "Patan",
    "Rupani Substation": "Rupani",
    "chapali": "Chapali",
    "KL-I HEP": "Kulekhani I",
    "Hetauda Grid": "Hetauda",
    "बुटवल 132 केभी सबस्टेसन": "Butwal",
    "Ilam/Godak": "Godak (Ilam)",
    "Attaria": "Attariya",
}

# Known official NEA corridor names for (substation_a, substation_b, voltage_kv) pairs
KNOWN_CORRIDORS: dict[tuple[str, str, int], str] = {
    ("godak (ilam)", "kabeli", 132): "Kabeli Corridor 132 kV Transmission Line",
    ("garjyang", "new khimti", 132): "Garjyang–New Khimti 132 kV Transmission Line",
    ("kohalpur", "surkhet", 132): "Kohalpur–Surkhet 132 kV Transmission Line",
    ("attariya", "mahendranagar", 132): "Attariya–Mahendranagar 132 kV Transmission Line",
    ("attariya", "lamki", 132): "Attariya–Lamki 132 kV Transmission Line (West Grid)",
    ("hetauda", "kulekhani i", 132): "Hetauda–Kulekhani 132 kV Transmission Line",
    ("hetauda", "matatirtha", 132): "Hetauda–Kulekhani–Matatirtha 132 kV Transmission Line",
    ("bharatpur", "hetauda", 132): "Hetauda–Bharatpur 132 kV Transmission Line",
    ("lamosangu", "singati", 132): "Singati–Lamosangu 132 kV Transmission Line",
    ("kusma", "upper modi hydropower", 132): "Modi–Kusma 132 kV Transmission Line",
    ("kudhar (pokhara)", "kusma", 132): "Pokhara–Kusma 132 kV Transmission Line",
    ("balaju", "devighat", 66): "Trishuli–Devighat–Balaju 66 kV Transmission Line",
    ("amalekhgunj", "hetauda", 66): "Hetauda–Amalekhgunj–Simara 66 kV Transmission Line",
    ("amalekhgunj", "simara", 66): "Hetauda–Amalekhgunj–Simara 66 kV Transmission Line",
    ("parwanipur", "simara", 66): "Simara–Parwanipur–Birgunj 66 kV Transmission Line",
    ("kulekhani i", "siuchatar", 66): "Kulekhani–Matatirtha–Siuchatar 66 kV Transmission Line",
    ("matatirtha", "siuchatar", 66): "Kulekhani–Matatirtha–Siuchatar 66 kV Transmission Line",
    ("balaju", "siuchatar", 66): "Balaju–Siuchatar 66 kV Valley Ring Line",
    ("balaju", "chapali", 66): "Balaju–Chapali 66 kV Valley Ring Line",
    ("bhaktapur", "chapali", 66): "Chapali–Bhaktapur 66 kV Valley Ring Line",
}


def dist_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return math.hypot(
        (lat2 - lat1) * 111.0,
        (lon2 - lon1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2)),
    )


def clean_place(name: str) -> str:
    n = SUB_NAME_CLEAN.get(name, name).strip()
    for suffix in (" Distribution Center", " Provincial Office"):
        if n.endswith(suffix):
            n = n[: -len(suffix)].strip()
    return n


def parse_kv(raw_voltage: str | None) -> int | None:
    if not raw_voltage:
        return None
    vals = []
    for part in str(raw_voltage).replace(",", ";").split(";"):
        part = part.strip()
        try:
            v = float(part)
            if v > 0:
                vals.append(v / 1000.0)
        except ValueError:
            pass
    if not vals:
        return None
    m = max(vals)
    return int(round(m)) if m >= 1 else None


def main() -> None:
    grid = json.loads(OSM_GRID_PATH.read_text(encoding="utf-8"))
    subs = json.loads(SUBSTATIONS_PATH.read_text(encoding="utf-8"))
    dcs = json.loads(DCS_PATH.read_text(encoding="utf-8"))

    places: list[tuple[float, float, str, bool]] = []
    for s in subs["features"]:
        p = s["properties"]
        n = p.get("name:en") or p.get("name")
        if n:
            lon, lat = s["geometry"]["coordinates"]
            places.append((lat, lon, clean_place(n), True))
    for d in dcs["features"]:
        p = d["properties"]
        lon, lat = d["geometry"]["coordinates"]
        places.append((lat, lon, clean_place(p["name"]), False))

    def nearest_place(lat: float, lon: float, max_km: float = 20.0) -> str | None:
        # Prefer substations within 6km before falling back to DCS
        sub_only = [pl for pl in places if pl[3]]
        if sub_only:
            best_sub = min(sub_only, key=lambda x: dist_km(lat, lon, x[0], x[1]))
            if dist_km(lat, lon, best_sub[0], best_sub[1]) <= 6.0:
                return best_sub[2]
        best = min(places, key=lambda x: dist_km(lat, lon, x[0], x[1]))
        if dist_km(lat, lon, best[0], best[1]) <= max_km:
            return best[2]
        return None

    # Build graph per voltage tier to trace substation-to-substation corridors
    def snap(lat: float, lon: float) -> tuple[int, int]:
        return (round(lat / 0.004), round(lon / 0.004))

    features = grid["features"]
    adj_by_kv: dict[int | None, dict[tuple[int, int], list[tuple[int, tuple[int, int]]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for i, f in enumerate(features):
        p = f["properties"]
        kv = parse_kv(p.get("voltage"))
        c = f["geometry"]["coordinates"]
        u = snap(c[0][1], c[0][0])
        v = snap(c[-1][1], c[-1][0])
        adj_by_kv[kv][u].append((i, v))
        adj_by_kv[kv][v].append((i, u))

    # Map each node to nearest substation within 3 km
    node_hub: dict[tuple[int, int], str] = {}
    for kv, adj in adj_by_kv.items():
        for pt in adj:
            if pt in node_hub:
                continue
            lat, lon = pt[0] * 0.004, pt[1] * 0.004
            hub = nearest_place(lat, lon, max_km=3.0)
            if hub:
                node_hub[pt] = hub

    # For each edge, walk in both directions along deg-2 chains until hitting a hub or junction
    def trace_end(kv: int | None, start_edge: int, from_pt: tuple[int, int]) -> str | None:
        adj = adj_by_kv[kv]
        curr = from_pt
        visited_e = {start_edge}
        for _ in range(30):
            if curr in node_hub:
                return node_hub[curr]
            if len(adj[curr]) != 2:
                break
            nbs = [(ei, np) for ei, np in adj[curr] if ei not in visited_e]
            if not nbs:
                break
            ei, np = nbs[0]
            visited_e.add(ei)
            curr = np
        return nearest_place(curr[0] * 0.004, curr[1] * 0.004, max_km=25.0)

    updated = 0
    for i, f in enumerate(features):
        p = f["properties"]
        way_id = p.get("@id", "")
        kv = parse_kv(p.get("voltage"))
        is_minor = p.get("power") == "minor_line"

        if way_id in EXACT_WAY_NAMES:
            p["name"] = EXACT_WAY_NAMES[way_id]
            updated += 1
            continue

        c = f["geometry"]["coordinates"]
        u = snap(c[0][1], c[0][0])
        v = snap(c[-1][1], c[-1][0])

        end_a = trace_end(kv, i, u) or nearest_place(c[0][1], c[0][0])
        end_b = trace_end(kv, i, v) or nearest_place(c[-1][1], c[-1][0])

        if end_a and end_b:
            a, b = sorted([end_a, end_b])
            if kv is not None and (a.lower(), b.lower(), kv) in KNOWN_CORRIDORS:
                p["name"] = KNOWN_CORRIDORS[(a.lower(), b.lower(), kv)]
                updated += 1
                continue

            kv_label = f"{kv} kV " if kv else ""
            if is_minor:
                p["name"] = f"{a} {kv_label}Distribution Feeder".strip() if a == b else f"{a}–{b} {kv_label}Distribution Line".strip()
            else:
                if a == b:
                    p["name"] = f"{a} {kv_label}Substation Link".strip()
                else:
                    p["name"] = f"{a}–{b} {kv_label}Transmission Line".strip()
            updated += 1
        elif end_a or end_b:
            place = end_a or end_b
            kv_label = f"{kv} kV " if kv else ""
            p["name"] = f"{place} {kv_label}{'Distribution Line' if is_minor else 'Transmission Line'}".strip()
            updated += 1

    OSM_GRID_PATH.write_text(json.dumps(grid, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {updated} / {len(features)} OSM grid features.")


if __name__ == "__main__":
    main()
