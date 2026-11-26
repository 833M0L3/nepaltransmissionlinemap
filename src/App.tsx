import { useState } from 'react';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { LeafletMap } from './components/map/LeafletMap';
import { MapLegend } from './components/map/MapLegend';
import { Sidebar } from './components/sidebar/Sidebar';
import { useGeoDatasets } from './hooks/useGeoDatasets';
import type { MapFilters } from './types/geospatial';

const INITIAL_FILTERS: MapFilters = {
  showHydropower: true,
  showPowerStations: false,
  showSubstations: true,
  showDcs: true,
  showGrid: true,
  showPowerFlow: false,
  showTieIns: false,
  gridSource: 'osm',
  licenseTypes: {
    Operation: true,
    Generation: true,
    Survey: true,
  },
  gridStatuses: {
    Existing: true,
    Construction: true,
    Planned: true,
  },
  osmPowerTypes: {
    line: true,
    minor_line: false,
  },
  searchQuery: '',
};

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(INITIAL_FILTERS);
  const [basemap, setBasemap] = useState<'osm' | 'satellite'>('osm');
  const [resetTrigger, setResetTrigger] = useState(0);

  const {
    filteredHydropower,
    filteredPowerStations,
    filteredSubstations,
    filteredDcs,
    filteredGrid,
    filteredOsmGrid,
    flowSegments,
    tieInLines,
    neaEnergy,
    totalCapacityMw,
    loading,
    error,
  } = useGeoDatasets(filters);

  const gridCount =
    (filteredGrid?.features.length ?? 0) + (filteredOsmGrid?.features.length ?? 0);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <LeafletMap
        hydropower={filteredHydropower}
        powerStations={filteredPowerStations}
        substations={filteredSubstations}
        dcs={filteredDcs}
        grid={filteredGrid}
        osmGrid={filteredOsmGrid}
        flowSegments={flowSegments}
        tieInLines={tieInLines}
        basemap={basemap}
        resetTrigger={resetTrigger}
      />

      {/* Top-right basemap toggle (left of Leaflet zoom controls) */}
      <div className="pointer-events-none absolute right-14 top-2.5 z-1000">
        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'osm' ? 'satellite' : 'osm'))}
          className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-md transition-shadow hover:bg-gray-50 hover:shadow-lg"
          aria-label={basemap === 'osm' ? 'Switch to satellite view' : 'Switch to street map'}
          title={basemap === 'osm' ? 'Switch to Satellite View' : 'Switch to Street Map'}
        >
          {basemap === 'osm' ? (
            <>
              <Satellite className="h-3.5 w-3.5 text-blue-500" />
              <span>Satellite</span>
            </>
          ) : (
            <>
              <MapIcon className="h-3.5 w-3.5 text-blue-500" />
              <span>Street Map</span>
            </>
          )}
        </button>
      </div>

      {/* Top-left floating sidebar */}
      <div className="pointer-events-none absolute left-4 top-4 z-1000">
        <Sidebar
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((open) => !open)}
          filters={filters}
          onFiltersChange={setFilters}
          onResetView={() => setResetTrigger((prev) => prev + 1)}
          hydroCount={filteredHydropower?.features.length ?? 0}
          gridCount={gridCount}
          totalCapacityMw={totalCapacityMw}
          neaEnergy={neaEnergy}
        />
      </div>

      {/* Bottom-right floating legend */}
      <div className="pointer-events-none absolute bottom-6 right-4 z-1000">
        <MapLegend />
      </div>

      {/* Loading / error status pill */}
      {(loading || error) && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-1000 -translate-x-1/2">
          <div
            className={`rounded-full border px-4 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md ${
              error
                ? 'border-red-500/60 bg-red-950/90 text-red-200'
                : 'border-slate-700 bg-slate-900/90 text-slate-200'
            }`}
          >
            {error ?? 'Loading geospatial datasets...'}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
