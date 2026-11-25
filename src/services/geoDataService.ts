import type {
  DcsCollection,
  GridLineCollection,
  HydropowerCollection,
  NeaEnergyData,
  OsmGridCollection,
  PowerStationCollection,
  SubstationCollection,
} from '../types/geospatial';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export function fetchHydropowerData(signal?: AbortSignal): Promise<HydropowerCollection> {
  return fetchJson<HydropowerCollection>(`${DATA_BASE}/nepal-hydropower.json`, signal);
}

export function fetchGridData(signal?: AbortSignal): Promise<GridLineCollection> {
  return fetchJson<GridLineCollection>(`${DATA_BASE}/nepal-grid.json`, signal);
}

export function fetchOsmGridData(signal?: AbortSignal): Promise<OsmGridCollection> {
  return fetchJson<OsmGridCollection>(`${DATA_BASE}/nepal-osm-grid.json`, signal);
}

export function fetchPowerStationsData(signal?: AbortSignal): Promise<PowerStationCollection> {
  return fetchJson<PowerStationCollection>(`${DATA_BASE}/nepal-powerstations.json`, signal);
}

export function fetchNeaEnergyData(signal?: AbortSignal): Promise<NeaEnergyData | null> {
  return fetchJson<NeaEnergyData>(`${DATA_BASE}/nea-energy.json`, signal).catch(() => null);
}

export function fetchDcsData(signal?: AbortSignal): Promise<DcsCollection | null> {
  return fetchJson<DcsCollection>(`${DATA_BASE}/nepal-dcs.json`, signal).catch(() => null);
}

export function fetchSubstationsData(signal?: AbortSignal): Promise<SubstationCollection | null> {
  return fetchJson<SubstationCollection>(`${DATA_BASE}/nepal-substations.json`, signal).catch(() => null);
}
