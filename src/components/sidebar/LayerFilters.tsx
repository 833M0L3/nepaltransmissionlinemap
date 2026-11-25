import { Search, X, Zap } from 'lucide-react';
import {
  GRID_STATUS_CONFIG,
  LICENSE_TYPE_CONFIG,
  OSM_POWER_TYPE_CONFIG,
} from '../../constants/mapConfig';
import type {
  GridSource,
  GridStatus,
  LicenseType,
  MapFilters,
  OsmPowerType,
} from '../../types/geospatial';

interface LayerFiltersProps {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}

const GRID_SOURCE_OPTIONS: { id: GridSource; label: string }[] = [
  { id: 'worldbank', label: 'World Bank' },
  { id: 'osm', label: 'OSM Export' },
  { id: 'both', label: 'Both' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

export function LayerFilters({ filters, onChange }: LayerFiltersProps) {
  const licenseKeys = Object.keys(LICENSE_TYPE_CONFIG) as LicenseType[];
  const statusKeys = Object.keys(GRID_STATUS_CONFIG) as GridStatus[];
  const osmPowerKeys = Object.keys(OSM_POWER_TYPE_CONFIG) as OsmPowerType[];

  const showWorldBankOptions =
    filters.showGrid && (filters.gridSource === 'worldbank' || filters.gridSource === 'both');
  const showOsmOptions =
    filters.showGrid && (filters.gridSource === 'osm' || filters.gridSource === 'both');

  const toggleLicenseType = (key: LicenseType) => {
    onChange({
      ...filters,
      licenseTypes: { ...filters.licenseTypes, [key]: !filters.licenseTypes[key] },
    });
  };

  const toggleGridStatus = (key: GridStatus) => {
    onChange({
      ...filters,
      gridStatuses: { ...filters.gridStatuses, [key]: !filters.gridStatuses[key] },
    });
  };

  const toggleOsmPowerType = (key: OsmPowerType) => {
    onChange({
      ...filters,
      osmPowerTypes: { ...filters.osmPowerTypes, [key]: !filters.osmPowerTypes[key] },
    });
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <SectionLabel>Search Features</SectionLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            id="feature-search"
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Project, river, operator, kV…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hydropower */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-gray-800">Nepal Hydropower Projects</span>
          <input
            type="checkbox"
            checked={filters.showHydropower}
            onChange={(e) => onChange({ ...filters, showHydropower: e.target.checked })}
            className="h-4 w-4 accent-blue-500"
          />
        </label>
        {filters.showHydropower && (
          <div className="mt-2.5 space-y-1.5 border-t border-gray-100 pt-2.5">
            {licenseKeys.map((key) => {
              const cfg = LICENSE_TYPE_CONFIG[key];
              return (
                <label key={key} className="flex cursor-pointer items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={filters.licenseTypes[key]}
                    onChange={() => toggleLicenseType(key)}
                    className="h-3.5 w-3.5 accent-blue-500"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Power Stations */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-gray-800">Power Stations (World Bank)</span>
          <input
            type="checkbox"
            checked={filters.showPowerStations}
            onChange={(e) => onChange({ ...filters, showPowerStations: e.target.checked })}
            className="h-4 w-4 accent-blue-500"
          />
        </label>
      </div>

      {/* Substations */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-gray-800">Substations (OSM)</span>
          <input
            type="checkbox"
            checked={filters.showSubstations}
            onChange={(e) => onChange({ ...filters, showSubstations: e.target.checked })}
            className="h-4 w-4 accent-blue-500"
          />
        </label>
        <label className="mt-2 flex cursor-pointer items-center justify-between border-t border-gray-100 pt-2 text-xs">
          <span className="text-gray-600">Show Tie-In Spurs</span>
          <input
            type="checkbox"
            checked={filters.showTieIns}
            onChange={(e) => onChange({ ...filters, showTieIns: e.target.checked })}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
        </label>
      </div>

      {/* NEA DCS */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-gray-800">NEA Distribution Centers</span>
          <input
            type="checkbox"
            checked={filters.showDcs}
            onChange={(e) => onChange({ ...filters, showDcs: e.target.checked })}
            className="h-4 w-4 accent-blue-500"
          />
        </label>
      </div>

      {/* Transmission Grid */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-gray-800">Nepal Transmission Grid</span>
          <input
            type="checkbox"
            checked={filters.showGrid}
            onChange={(e) => onChange({ ...filters, showGrid: e.target.checked })}
            className="h-4 w-4 accent-blue-500"
          />
        </label>

        {filters.showGrid && (
          <div className="mt-2.5 space-y-3 border-t border-gray-100 pt-2.5">
            {/* Source toggle */}
            <div>
              <SectionLabel>Data Source</SectionLabel>
              <div className="grid grid-cols-3 gap-1">
                {GRID_SOURCE_OPTIONS.map((opt) => {
                  const active = filters.gridSource === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ ...filters, gridSource: opt.id })}
                      className={`rounded-lg border px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {showWorldBankOptions && (
              <div className="space-y-1.5">
                <SectionLabel>World Bank Status</SectionLabel>
                {statusKeys.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between text-xs">
                    <span className="text-gray-600">{GRID_STATUS_CONFIG[key].label}</span>
                    <input
                      type="checkbox"
                      checked={filters.gridStatuses[key]}
                      onChange={() => toggleGridStatus(key)}
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                  </label>
                ))}
              </div>
            )}

            {showOsmOptions && (
              <div className="space-y-1.5">
                <SectionLabel>OSM Power Types</SectionLabel>
                {osmPowerKeys.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between text-xs">
                    <span className="text-gray-600">{OSM_POWER_TYPE_CONFIG[key].label}</span>
                    <input
                      type="checkbox"
                      checked={filters.osmPowerTypes[key]}
                      onChange={() => toggleOsmPowerType(key)}
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* Power Flow */}
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-2.5">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <Zap className="h-3.5 w-3.5" />
                  Estimated Power Flow
                </span>
                <input
                  type="checkbox"
                  checked={filters.showPowerFlow}
                  onChange={(e) => onChange({ ...filters, showPowerFlow: e.target.checked })}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>
              <p className="mt-1 text-[10px] leading-snug text-amber-600">
                Modeled DC flow from operational hydro plants toward major load hubs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
