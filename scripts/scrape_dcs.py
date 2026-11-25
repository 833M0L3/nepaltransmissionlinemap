"""Scrape NEA Distribution Centers (DCS) and geocode them.

Uses Google Places API (New) Text Search when GOOGLE_MAPS_API_KEY is set,
falling back to OSM Nominatim otherwise.
Outputs a GeoJSON FeatureCollection to public/data/nepal-dcs.json.
"""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

LIST_URL = "https://nea.org.np/en/contact-information-of-dcs"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT_DIR / "public" / "data" / "nepal-dcs.json"
NOMINATIM_CACHE_PATH = Path(__file__).resolve().parent / ".dcs_geocode_cache.json"
GOOGLE_CACHE_PATH = Path(__file__).resolve().parent / ".dcs_google_cache.json"

HEADERS = {
    "User-Agent": "NepalEnergyAtlas/1.0 (https://github.com/; educational-gis-map)"
}

PLACE_ALIASES: dict[str, str] = {
    "illam": "Ilam",
    "khadbari": "Khandbari",
    "terathum": "Terhathum",
    "udayapur": "Gaighat, Udayapur",
    "gauradaha": "Gauradaha, Jhapa",
    "belbari": "Belbari, Morang",
    "urlabari": "Urlabari, Morang",
    "rangeli": "Rangeli, Morang",
    "anarmani": "Birtamod, Jhapa",
    "dhulabari": "Dhulabari, Jhapa",
    "duhabi": "Duhabi, Sunsari",
    "inaruwa": "Inaruwa, Sunsari",
    "solukhumbu": "Salleri, Solukhumbu",
    "panchthar": "Phidim, Panchthar",
    "okhaldhunga": "Okhaldhunga",
    "diktel": "Diktel, Khotang",
    "attaria": "Attariya, Kailali",
    "attariya": "Attariya, Kailali",
    "yadukuha": "Yadukuha, Dhanusha",
    "bode barsaien": "Bodebarsain, Saptari",
    "simrangadh": "Simraungadh, Bara",
    "hetauda grid": "Hetauda, Makwanpur",
    "hetauda central store": "Hetauda, Makwanpur",
    "sindhupalchowk dcs": "Chautara, Sindhupalchok",
    "central meter testing lab": "Kathmandu",
    "kharipati store bhaktapur": "Kharipati, Bhaktapur",
    "gamgad": "Gamgadhi, Mugu",
    "heldung": "Simikot, Humla",
}


def clean_place_query(office_name: str) -> str:
    """Derive a clean Nepalese locality name from an NEA office title."""
    name = office_name.strip()
    if "," in name and ("Provincial" in name or "Division" in name):
        name = name.split(",")[-1].strip()

    name = re.sub(
        r"\b(Distribution\s+Cent(?:er|re)|Provincial\s+Office|Division\s+Office|Branch|Sub-?Branch|Office)\b",
        "",
        name,
        flags=re.I,
    )
    name = re.sub(r"\s+", " ", name).strip(" ,.-")

    lowered = name.lower()
    for alias, replacement in PLACE_ALIASES.items():
        if lowered == alias:
            return f"{replacement}, Nepal"

    return f"{name}, Nepal"


def geocode_google_places(
    office_name: str,
    api_key: str,
    cache: dict[str, dict[str, Any] | None],
    session: requests.Session,
) -> dict[str, Any] | None:
    """Geocode an NEA office using Google Places API (New) Text Search."""
    query = f"Nepal Electricity Authority {office_name}, Nepal"
    if query in cache:
        return cache[query]

    resp = session.post(
        GOOGLE_PLACES_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        },
        json={"textQuery": query, "regionCode": "NP", "maxResultCount": 1},
        timeout=15,
    )
    if not resp.ok:
        print(f"  [Google API {resp.status_code}] {office_name}: {resp.text[:200]}")
        return None

    places = resp.json().get("places") or []
    if places and places[0].get("location"):
        loc = places[0]["location"]
        result = {
            "lon": float(loc["longitude"]),
            "lat": float(loc["latitude"]),
            "address": places[0].get("formattedAddress", ""),
            "display_name": (places[0].get("displayName") or {}).get("text", ""),
        }
        cache[query] = result
        return result

    cache[query] = None
    return None


def geocode_nominatim(
    query: str,
    cache: dict[str, list[float] | None],
    session: requests.Session,
) -> tuple[float, float] | None:
    """Geocode a Nepal place name via Nominatim with local JSON caching."""
    if query in cache:
        coords = cache[query]
        return (coords[0], coords[1]) if coords else None

    time.sleep(1.1)
    resp = session.get(
        NOMINATIM_URL,
        params={"q": query, "countrycodes": "np", "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    results = resp.json()
    if results:
        lon = float(results[0]["lon"])
        lat = float(results[0]["lat"])
        cache[query] = [lon, lat]
        return (lon, lat)

    cache[query] = None
    return None


def scrape_dcs() -> dict[str, Any]:
    """Scrape all provincial DCS tables and geocode each office."""
    session = requests.Session()
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()

    nom_cache: dict[str, list[float] | None] = {}
    if NOMINATIM_CACHE_PATH.exists():
        nom_cache = json.loads(NOMINATIM_CACHE_PATH.read_text(encoding="utf-8"))

    google_cache: dict[str, dict[str, Any] | None] = {}
    if GOOGLE_CACHE_PATH.exists():
        google_cache = json.loads(GOOGLE_CACHE_PATH.read_text(encoding="utf-8"))

    list_resp = session.get(LIST_URL, headers=HEADERS, timeout=20)
    list_resp.raise_for_status()
    list_soup = BeautifulSoup(list_resp.text, "html.parser")

    province_links: list[tuple[str, str]] = []
    for row in list_soup.select("table tbody tr"):
        cols = row.find_all("td")
        if len(cols) < 3:
            continue
        prov_name = cols[1].get_text(strip=True)
        link = cols[2].find("a", href=True)
        if link:
            href = link["href"]
            if "/en/" not in href:
                href = href.replace("nea.org.np/", "nea.org.np/en/")
            province_links.append((prov_name, href))

    print(f"Found {len(province_links)} provincial DCS pages. Google Places enabled: {bool(api_key)}")

    features: list[dict[str, Any]] = []
    unmatched: list[str] = []
    google_hits = 0
    nominatim_hits = 0

    for prov_name, detail_url in province_links:
        detail_resp = session.get(detail_url, headers=HEADERS, timeout=20)
        detail_resp.raise_for_status()
        detail_soup = BeautifulSoup(detail_resp.text, "html.parser")

        for row in detail_soup.select("table tbody tr"):
            cols = row.find_all("td")
            if len(cols) < 5:
                continue

            office_name = cols[1].get_text(" ", strip=True)
            chief_name = cols[2].get_text(" ", strip=True)
            phone = cols[3].get_text(" ", strip=True)
            email = cols[4].get_text(" ", strip=True)
            is_provincial = "provincial" in office_name.lower() or "division" in office_name.lower()

            lon: float | None = None
            lat: float | None = None
            address = ""
            geocode_source = ""
            query = clean_place_query(office_name)

            if api_key:
                g_res = geocode_google_places(office_name, api_key, google_cache, session)
                if g_res:
                    lon = g_res["lon"]
                    lat = g_res["lat"]
                    address = g_res.get("address", "")
                    geocode_source = "google_places"
                    google_hits += 1

            if lon is None or lat is None:
                coords = geocode_nominatim(query, nom_cache, session)
                if coords is None and "(" in query:
                    simplified = re.sub(r"\([^)]*\)", "", query).strip()
                    coords = geocode_nominatim(simplified, nom_cache, session)
                if coords:
                    lon, lat = coords
                    geocode_source = "nominatim"
                    nominatim_hits += 1

            if lon is None or lat is None:
                unmatched.append(f"{office_name} (query: {query})")
                continue

            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "name": office_name,
                        "province_office": prov_name,
                        "chief_name": chief_name,
                        "phone": phone,
                        "email": email,
                        "is_provincial_office": is_provincial,
                        "address": address,
                        "geocode_source": geocode_source,
                        "geocode_query": query,
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat],
                    },
                }
            )

        NOMINATIM_CACHE_PATH.write_text(json.dumps(nom_cache, indent=2), encoding="utf-8")
        if api_key:
            GOOGLE_CACHE_PATH.write_text(json.dumps(google_cache, indent=2), encoding="utf-8")
        print(f"  Processed {prov_name}: total = {len(features)} (Google={google_hits}, Nominatim={nominatim_hits})")

    if unmatched:
        print(f"\nUnmatched ({len(unmatched)}):")
        for item in unmatched:
            print("  -", item)

    return {
        "type": "FeatureCollection",
        "source": LIST_URL,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "features": features,
    }


def main() -> None:
    geojson = scrape_dcs()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    print(f"\nSaved {len(geojson['features'])} DCS locations to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
