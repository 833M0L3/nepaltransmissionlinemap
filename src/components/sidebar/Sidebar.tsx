import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { MapFilters, NeaEnergyData } from '../../types/geospatial';
import { LayerFilters } from './LayerFilters';
import { NeaEnergyCard } from './NeaEnergyCard';
import { StatsSummary } from './StatsSummary';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  filters: MapFilters;
  onFiltersChange: (next: MapFilters) => void;
  onResetView: () => void;
  hydroCount: number;
  gridCount: number;
  totalCapacityMw: number;
  neaEnergy: NeaEnergyData | null;
}

export function Sidebar({
  isOpen,
  onToggleOpen,
  filters,
  onFiltersChange,
  onResetView,
  hydroCount,
  gridCount,
  totalCapacityMw,
  neaEnergy,
}: SidebarProps) {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-md hover:bg-gray-50 hover:shadow-lg transition-shadow"
        aria-label="Open controls panel"
      >
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          className="h-4 w-4 rounded"
        />
        <span>Layers &amp; Filters</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="h-8 w-8 rounded-lg shadow-sm"
          />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Nepal National Transmission Line</h1>
            <p className="text-[11px] text-gray-400">Hydropower &amp; Grid (OSM)</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResetView}
            title="Reset map view to Nepal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Reset map view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Collapse controls panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto p-4">
        <StatsSummary
          hydroCount={hydroCount}
          gridCount={gridCount}
          totalCapacityMw={totalCapacityMw}
        />
        <LayerFilters filters={filters} onChange={onFiltersChange} />
        <NeaEnergyCard data={neaEnergy} />
      </div>
    </aside>
  );
}
