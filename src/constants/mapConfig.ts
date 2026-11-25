import type { LatLngBoundsExpression } from 'leaflet';
import type { GridStatus, LicenseType, LoadCenter, OsmPowerType } from '../types/geospatial';

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const NEPAL_BOUNDS: LatLngBoundsExpression = [
  [26.35, 80.05],
  [30.45, 88.2],
];

export const LICENSE_TYPE_CONFIG: Record<
  LicenseType,
  { label: string; color: string; borderColor: string }
> = {
  Operation: {
    label: 'Operation',
    color: '#10b981', // emerald-500
    borderColor: '#065f46',
  },
  Generation: {
    label: 'Generation',
    color: '#3b82f6', // blue-500
    borderColor: '#1e40af',
  },
  Survey: {
    label: 'Survey',
    color: '#f59e0b', // amber-500
    borderColor: '#92400e',
  },
};

export const GRID_VOLTAGE_CONFIG: Record<
  number,
  { label: string; color: string; weight: number }
> = {
  400: { label: '400 kV', color: '#e11d48', weight: 5 }, // rose-600
  220: { label: '220 kV', color: '#dc2626', weight: 4.25 }, // red-600
  132: { label: '132 kV', color: '#ea580c', weight: 3.5 }, // orange-600
  66: { label: '66 kV', color: '#8b5cf6', weight: 2.75 }, // violet-500
  33: { label: '33 kV', color: '#06b6d4', weight: 2 }, // cyan-500
};

export const GRID_LOW_VOLTAGE_COLOR = '#14b8a6'; // teal-500 (<33 kV / 220 V)
export const GRID_UNKNOWN_VOLTAGE_COLOR = '#94a3b8'; // slate-400

export const GRID_STATUS_CONFIG: Record<GridStatus, { label: string; dashArray?: string }> = {
  Existing: { label: 'Existing' },
  Construction: { label: 'Under Construction', dashArray: '4 5' },
  Planned: { label: 'Planned', dashArray: '10 6' },
};

export const OSM_POWER_TYPE_CONFIG: Record<OsmPowerType, { label: string }> = {
  line: { label: 'Major Transmission (line)' },
  minor_line: { label: 'Minor / Distribution (minor_line)' },
};

export const POWER_STATION_COLORS: Record<string, string> = {
  Hydro: '#0ea5e9', // sky-500
  'Small hydro': '#38bdf8', // sky-400
  Solar: '#eab308', // yellow-500
  Wind: '#2dd4bf', // teal-400
  Diesel: '#f97316', // orange-500
  Multifuel: '#a855f7', // purple-500
};

/** Major Nepal urban/industrial demand hubs used as sinks for the estimated DC flow model. */
export const NEPAL_LOAD_CENTERS: LoadCenter[] = [
  { name: 'Kathmandu Valley', lat: 27.7172, lng: 85.324, demandShare: 0.36 },
  { name: 'Birgunj / Hetauda Corridor', lat: 27.0104, lng: 84.877, demandShare: 0.16 },
  { name: 'Biratnagar / Duhabi', lat: 26.4525, lng: 87.2718, demandShare: 0.14 },
  { name: 'Butwal / Bhairahawa', lat: 27.7006, lng: 83.4484, demandShare: 0.11 },
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856, demandShare: 0.08 },
  { name: 'Janakpur / Dhalkebar', lat: 26.7288, lng: 85.926, demandShare: 0.06 },
  { name: 'Nepalgunj / Kohalpur', lat: 28.05, lng: 81.6167, demandShare: 0.05 },
  { name: 'Dhangadhi / Attariya', lat: 28.6833, lng: 80.6, demandShare: 0.04 },
];
