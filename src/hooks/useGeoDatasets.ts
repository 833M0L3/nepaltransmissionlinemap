import { useEffect, useMemo, useState } from 'react';
import {
  fetchDcsData,
  fetchGridData,
  fetchHydropowerData,
  fetchNeaEnergyData,
  fetchOsmGridData,
  fetchPowerStationsData,
  fetchSubstationsData,
} from '../services/geoDataService';
import type {
  DcsCollection,
  FlowSegment,
  GridLineCollection,
  GridStatus,
  HydropowerCollection,
  LicenseType,
  MapFilters,
  NeaEnergyData,
  OsmGridCollection,
  OsmPowerType,
  PowerStationCollection,
  SubstationCollection,
  TieInLine,
} from '../types/geospatial';
import { parseOsmVoltage } from '../utils/formatters';
import { computeSubstationTieIns, solveEstimatedPowerFlow } from '../utils/powerFlowSolver';

interface UseGeoDatasetsResult {
  filteredHydropower: HydropowerCollection | null;
  filteredPowerStations: PowerStationCollection | null;
  filteredSubstations: SubstationCollection | null;
  filteredDcs: DcsCollection | null;
  filteredGrid: GridLineCollection | null;
  filteredOsmGrid: OsmGridCollection | null;
  flowSegments: FlowSegment[];
  tieInLines: TieInLine[];
  neaEnergy: NeaEnergyData | null;
  totalCapacityMw: number;
  loading: boolean;
  error: string | null;
}

export function useGeoDatasets(filters: MapFilters): UseGeoDatasetsResult {
  const [hydropower, setHydropower] = useState<HydropowerCollection | null>(null);
  const [powerStations, setPowerStations] = useState<PowerStationCollection | null>(null);
  const [substations, setSubstations] = useState<SubstationCollection | null>(null);
  const [dcs, setDcs] = useState<DcsCollection | null>(null);
  const [grid, setGrid] = useState<GridLineCollection | null>(null);
  const [osmGrid, setOsmGrid] = useState<OsmGridCollection | null>(null);
  const [neaEnergy, setNeaEnergy] = useState<NeaEnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);
        const [hydroData, stationsData, subData, dcsData, gridData, osmData, neaData] =
          await Promise.all([
            fetchHydropowerData(controller.signal),
            fetchPowerStationsData(controller.signal),
            fetchSubstationsData(controller.signal),
            fetchDcsData(controller.signal),
            fetchGridData(controller.signal),
            fetchOsmGridData(controller.signal),
            fetchNeaEnergyData(controller.signal),
          ]);
        setHydropower(hydroData);
        setPowerStations(stationsData);
        setSubstations(subData);
        setDcs(dcsData);
        setGrid(gridData);
        setOsmGrid(osmData);
        setNeaEnergy(neaData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Failed to load geospatial datasets.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAll();
    return () => controller.abort();
  }, []);

  const filteredHydropower = useMemo<HydropowerCollection | null>(() => {
    if (!hydropower || !filters.showHydropower) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = hydropower.features.filter((feature) => {
      const { license_type, project, river, district_name, promoter } = feature.properties;
      if (!filters.licenseTypes[license_type as LicenseType]) return false;
      if (!query) return true;
      return (
        project?.toLowerCase().includes(query) ||
        river?.toLowerCase().includes(query) ||
        district_name?.toLowerCase().includes(query) ||
        promoter?.toLowerCase().includes(query)
      );
    });

    return { ...hydropower, features };
  }, [hydropower, filters.showHydropower, filters.licenseTypes, filters.searchQuery]);

  const filteredPowerStations = useMemo<PowerStationCollection | null>(() => {
    if (!powerStations || !filters.showPowerStations) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = powerStations.features.filter((feature) => {
      if (!query) return true;
      const { name, type, status } = feature.properties;
      return (
        name?.toLowerCase().includes(query) ||
        type?.toLowerCase().includes(query) ||
        status?.toLowerCase().includes(query)
      );
    });

    return { ...powerStations, features };
  }, [powerStations, filters.showPowerStations, filters.searchQuery]);

  const filteredSubstations = useMemo<SubstationCollection | null>(() => {
    if (!substations || !filters.showSubstations) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = substations.features.filter((feature) => {
      if (!query) return true;
      const { name, substation, operator, voltage } = feature.properties;
      const { label } = parseOsmVoltage(voltage);
      return (
        name?.toLowerCase().includes(query) ||
        substation?.toLowerCase().includes(query) ||
        operator?.toLowerCase().includes(query) ||
        label.toLowerCase().includes(query)
      );
    });

    return { ...substations, features };
  }, [substations, filters.showSubstations, filters.searchQuery]);

  const filteredDcs = useMemo<DcsCollection | null>(() => {
    if (!dcs || !filters.showDcs) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = dcs.features.filter((feature) => {
      if (!query) return true;
      const { name, province_office, chief_name, phone, email } = feature.properties;
      return (
        name?.toLowerCase().includes(query) ||
        province_office?.toLowerCase().includes(query) ||
        chief_name?.toLowerCase().includes(query) ||
        phone?.toLowerCase().includes(query) ||
        email?.toLowerCase().includes(query)
      );
    });

    return { ...dcs, features };
  }, [dcs, filters.showDcs, filters.searchQuery]);

  const filteredGrid = useMemo<GridLineCollection | null>(() => {
    const useWorldBank =
      filters.gridSource === 'worldbank' || filters.gridSource === 'both';
    if (!grid || !filters.showGrid || !useWorldBank) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = grid.features.filter((feature) => {
      const { status, country, type, voltage_kV } = feature.properties;
      if (!filters.gridStatuses[status as GridStatus]) return false;
      if (!query) return true;
      return (
        country?.toLowerCase().includes(query) ||
        type?.toLowerCase().includes(query) ||
        `${voltage_kV} kv`.includes(query) ||
        `${voltage_kV}`.includes(query)
      );
    });

    return { ...grid, features };
  }, [
    grid,
    filters.showGrid,
    filters.gridSource,
    filters.gridStatuses,
    filters.searchQuery,
  ]);

  const filteredOsmGrid = useMemo<OsmGridCollection | null>(() => {
    const useOsm = filters.gridSource === 'osm' || filters.gridSource === 'both';
    if (!osmGrid || !filters.showGrid || !useOsm) return null;
    const query = filters.searchQuery.trim().toLowerCase();

    const features = osmGrid.features.filter((feature) => {
      const props = feature.properties;
      if (!filters.osmPowerTypes[props.power as OsmPowerType]) return false;
      if (!query) return true;
      const { label } = parseOsmVoltage(props.voltage);
      return (
        props.name?.toLowerCase().includes(query) ||
        props.operator?.toLowerCase().includes(query) ||
        props.power?.toLowerCase().includes(query) ||
        label.toLowerCase().includes(query) ||
        (props.voltage ?? '').toLowerCase().includes(query)
      );
    });

    return { ...osmGrid, features };
  }, [
    osmGrid,
    filters.showGrid,
    filters.gridSource,
    filters.osmPowerTypes,
    filters.searchQuery,
  ]);

  const flowSegments = useMemo<FlowSegment[]>(() => {
    if (!filters.showPowerFlow || !filters.showGrid) return [];
    return solveEstimatedPowerFlow(
      hydropower,
      filteredGrid,
      filteredOsmGrid,
      substations,
      neaEnergy,
    );
  }, [
    filters.showPowerFlow,
    filters.showGrid,
    hydropower,
    filteredGrid,
    filteredOsmGrid,
    substations,
    neaEnergy,
  ]);

  const tieInLines = useMemo<TieInLine[]>(() => {
    if (!filters.showTieIns) return [];
    return computeSubstationTieIns(
      filters.showHydropower ? filteredHydropower : null,
      substations,
      filters.showDcs ? filteredDcs : null,
    );
  }, [
    filters.showTieIns,
    filters.showHydropower,
    filters.showDcs,
    filteredHydropower,
    substations,
    filteredDcs,
  ]);

  const totalCapacityMw = useMemo(() => {
    if (!filteredHydropower) return 0;
    return filteredHydropower.features.reduce(
      (sum, feature) => sum + (feature.properties.capacity ?? 0),
      0,
    );
  }, [filteredHydropower]);

  return {
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
  };
}
