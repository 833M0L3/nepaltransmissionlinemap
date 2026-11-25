import { useState } from 'react';
import { ChevronDown, Map } from 'lucide-react';
import {
  GRID_LOW_VOLTAGE_COLOR,
  GRID_STATUS_CONFIG,
  GRID_UNKNOWN_VOLTAGE_COLOR,
  GRID_VOLTAGE_CONFIG,
  LICENSE_TYPE_CONFIG,
} from '../../constants/mapConfig';
import type { GridStatus, LicenseType } from '../../types/geospatial';

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  const licenseEntries = Object.entries(LICENSE_TYPE_CONFIG) as [
    LicenseType,
    (typeof LICENSE_TYPE_CONFIG)[LicenseType],
  ][];
  const voltageLevels = [400, 220, 132, 66, 33];
  const statusEntries = Object.entries(GRID_STATUS_CONFIG) as [
    GridStatus,
    (typeof GRID_STATUS_CONFIG)[GridStatus],
  ][];

  return (
    <div className="pointer-events-auto w-52 rounded-2xl border border-gray-200 bg-white shadow-xl text-xs text-gray-700">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors"
        aria-expanded={isOpen}
        aria-label="Toggle legend"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-700">
          <Map className="h-3.5 w-3.5 text-blue-500" />
          Legend
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

          {/* Hydropower */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Hydropower
            </p>
            <div className="space-y-1.5">
              {licenseEntries.map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border"
                    style={{ backgroundColor: cfg.color, borderColor: cfg.borderColor }}
                  />
                  <span className="text-gray-600">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voltage levels */}
          <div className="border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Transmission Grid
            </p>
            <div className="space-y-1.5">
              {voltageLevels.map((kv) => {
                const cfg = GRID_VOLTAGE_CONFIG[kv];
                return (
                  <div key={kv} className="flex items-center gap-2">
                    <span
                      className="inline-block w-5 rounded-full"
                      style={{ backgroundColor: cfg.color, height: `${Math.max(2, cfg.weight)}px` }}
                    />
                    <span className="text-gray-600">{cfg.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-5 rounded-full"
                  style={{ backgroundColor: GRID_LOW_VOLTAGE_COLOR }}
                />
                <span className="text-gray-500">&lt; 33 kV / LV</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-5 rounded-full"
                  style={{ backgroundColor: GRID_UNKNOWN_VOLTAGE_COLOR }}
                />
                <span className="text-gray-500">Unknown kV</span>
              </div>
            </div>

            {/* Line styles */}
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {statusEntries.map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className={`inline-block w-5 border-t-2 border-gray-400 ${
                      key === 'Construction'
                        ? 'border-dotted'
                        : key === 'Planned'
                          ? 'border-dashed'
                          : 'border-solid'
                    }`}
                  />
                  <span className="text-gray-500 text-[11px]">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Markers */}
          <div className="border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Markers &amp; Flow
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-5 border-t-2 border-dashed border-amber-400" />
                <span className="text-gray-600">Est. Power Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-orange-500 shadow-sm" />
                <span className="text-gray-600">Substation (by kV)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-pink-500 shadow-sm" />
                <span className="text-gray-600">Provincial Office</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-purple-500 shadow-sm" />
                <span className="text-gray-600">Distribution Center</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
