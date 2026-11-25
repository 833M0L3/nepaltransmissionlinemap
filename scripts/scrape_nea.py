"""Scrape daily Energy Details from Nepal Electricity Authority (NEA) homepage.

Writes structured JSON to public/data/nea-energy.json for the frontend
and scheduled GitHub Actions updates.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

NEA_URL = "https://nea.org.np/en"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "nea-energy.json"

LABEL_TO_KEY = {
    "NEA": "nea_mwh",
    "NEA Subsidiary Companies": "nea_subsidiary_mwh",
    "IPP": "ipp_mwh",
    "Import": "import_mwh",
    "Export": "export_mwh",
    "Interruption": "interruption_mwh",
    "Total Energy Demand": "total_energy_demand_mwh",
    "National Energy Demand": "national_energy_demand_mwh",
    "Total Peak Demand": "total_peak_demand_mw",
    "National Peak Demand": "national_peak_demand_mw",
}


def parse_numeric_value(raw: str) -> tuple[float | None, str]:
    """Extract numeric value and unit (e.g. '7,056 MWh' -> (7056.0, 'MWh'))."""
    cleaned = raw.strip()
    match = re.match(r"^([\d,]+(?:\.\d+)?)\s*([A-Za-z]+)?", cleaned)
    if not match:
        return None, ""
    num = float(match.group(1).replace(",", ""))
    unit = match.group(2) or ""
    return num, unit


def scrape_nea_energy(url: str = NEA_URL, timeout: int = 20) -> dict[str, Any]:
    """Fetch NEA homepage and parse the 'Energy Details' grid."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; NepalEnergyAtlasBot/1.0; "
            "+https://github.com/)"
        )
    }
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    heading = soup.find(["h2", "h3", "h4"], string=re.compile(r"Energy Details", re.I))
    if heading is None:
        raise RuntimeError("Could not find 'Energy Details' heading on NEA page.")

    section = heading.find_parent("div", class_=re.compile(r"col-")) or heading.parent.parent
    grid = section.find("div", class_=re.compile(r"grid-3x3"))
    if grid is None:
        raise RuntimeError("Could not find 'grid-3x3' container under Energy Details.")

    metrics: dict[str, Any] = {}
    raw_items: list[dict[str, Any]] = []

    for item in grid.find_all("div", recursive=False):
        classes = item.get("class") or []
        if "invisible" in classes:
            continue
        spans = item.find_all("span")
        if len(spans) < 2:
            continue

        value_text = spans[0].get_text(strip=True)
        label_text = spans[1].get_text(strip=True)
        if not label_text or label_text.lower() == "empty":
            continue

        numeric_val, unit = parse_numeric_value(value_text)
        raw_items.append(
            {
                "label": label_text,
                "display": value_text,
                "value": numeric_val,
                "unit": unit,
            }
        )
        key = LABEL_TO_KEY.get(label_text)
        if key and numeric_val is not None:
            metrics[key] = numeric_val

    if not metrics:
        raise RuntimeError("Parsed zero metrics from NEA Energy Details grid.")

    return {
        "source": url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "items": raw_items,
    }


def main() -> None:
    data = scrape_nea_energy()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Saved NEA energy details to {OUTPUT_PATH}")
    print(json.dumps(data["metrics"], indent=2))


if __name__ == "__main__":
    main()
