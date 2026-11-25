import type { FeatureCollection, LineString, MultiLineString, Point } from 'geojson';

export type LicenseType = 'Operation' | 'Generation' | 'Survey';

export interface HydropowerProperties {
  province: number;
  district: number;
  gapanapa: number;
  province_name: string;
  district_name: string;
  gapanapa_name: string;
  project: string;
  capacity: number;
  river: string;
  lic_number: string;
  issue_date_years: number | null;
  issue_date_months: number | null;
  issue_date_days: number | null;
  validity_date_years: number | null;
  validity_date_months: number | null;
  validity_date_days: number | null;
  promoter: string;
  address: string;
  license_type: LicenseType | string;
  other_properties: string | null;
  pk: string;
}

export type HydropowerCollection = FeatureCollection<Point, HydropowerProperties>;

export type GridStatus = 'Existing' | 'Construction' | 'Planned';

export interface GridLineProperties {
  id: number;
  status: GridStatus | string;
  source: string;
  country: string;
  type: string;
  voltage_kV: number;
  operator: string | null;
  undergrnd: string | null;
  phases: number | null;
  cables: number | null;
  year: number | null;
}

export type GridLineCollection = FeatureCollection<
  LineString | MultiLineString,
  GridLineProperties
>;

export type OsmPowerType = 'line' | 'minor_line';

export interface OsmGridProperties {
  '@id'?: string;
  power: OsmPowerType | string;
  voltage?: string | null;
  cables?: string | null;
  wires?: string | null;
  circuits?: string | null;
  frequency?: string | null;
  source?: string | null;
  name?: string | null;
  operator?: string | null;
  line?: string | null;
  fixme?: string | null;
}

export type OsmGridCollection = FeatureCollection<LineString, OsmGridProperties>;

export interface PowerStationProperties {
  id: number;
  status: string;
  source: string;
  country: string;
  name: string;
  type: string;
  capacit_MW: number | null;
  operator: string | null;
  year: number | null;
}

export type PowerStationCollection = FeatureCollection<Point, PowerStationProperties>;

export interface LoadCenter {
  name: string;
  lat: number;
  lng: number;
  demandShare: number;
}

export interface FlowSegment {
  /** Coordinates oriented in the direction of positive power flow: [lat, lng][] */
  latLngs: [number, number][];
  flowMw: number;
  voltageKv: number;
  sourceLabel: string;
}

export interface NeaEnergyItem {
  label: string;
  display: string;
  value: number | null;
  unit: string;
}

export interface NeaEnergyData {
  source: string;
  scraped_at: string;
  metrics: Record<string, number>;
  items: NeaEnergyItem[];
}

export interface DcsProperties {
  name: string;
  province_office: string;
  chief_name: string;
  phone: string;
  email: string;
  is_provincial_office: boolean;
  address?: string;
  geocode_source?: string;
  geocode_query: string;
}

export type DcsCollection = FeatureCollection<Point, DcsProperties>;

export interface SubstationProperties {
  '@id'?: string;
  power: string;
  substation?: string | null;
  name?: string | null;
  'name:en'?: string | null;
  voltage?: string | null;
  operator?: string | null;
  frequency?: string | null;
  source?: string | null;
}

export type SubstationCollection = FeatureCollection<Point, SubstationProperties>;

export interface TieInLine {
  latLngs: [number, number][];
  kind: 'generation' | 'distribution';
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
}

export type GridSource = 'worldbank' | 'osm' | 'both';

export interface MapFilters {
  showHydropower: boolean;
  showPowerStations: boolean;
  showSubstations: boolean;
  showDcs: boolean;
  showGrid: boolean;
  showPowerFlow: boolean;
  showTieIns: boolean;
  gridSource: GridSource;
  licenseTypes: Record<LicenseType, boolean>;
  gridStatuses: Record<GridStatus, boolean>;
  osmPowerTypes: Record<OsmPowerType, boolean>;
  searchQuery: string;
}
