import type { CircleMarkerOptions, PathOptions } from 'leaflet';
import {
  GRID_LOW_VOLTAGE_COLOR,
  GRID_STATUS_CONFIG,
  GRID_UNKNOWN_VOLTAGE_COLOR,
  GRID_VOLTAGE_CONFIG,
  LICENSE_TYPE_CONFIG,
  POWER_STATION_COLORS,
} from '../constants/mapConfig';
import type {
  DcsProperties,
  FlowSegment,
  GridLineProperties,
  GridStatus,
  HydropowerProperties,
  LicenseType,
  OsmGridProperties,
  PowerStationProperties,
  SubstationProperties,
  TieInLine,
} from '../types/geospatial';
import { escapeHtml, formatBsDate, formatCapacityMw, parseOsmVoltage } from './formatters';

/** Computes circle marker radius from project capacity (MW) using a bounded sqrt scale. */
export function getHydropowerRadius(capacity: number | null | undefined): number {
  if (!capacity || capacity <= 0) return 4;
  return Math.min(18, Math.max(4, 3 + Math.sqrt(capacity) * 0.55));
}

export function getHydropowerMarkerStyle(props: HydropowerProperties): CircleMarkerOptions {
  const config =
    LICENSE_TYPE_CONFIG[props.license_type as LicenseType] ?? LICENSE_TYPE_CONFIG.Survey;
  return {
    radius: getHydropowerRadius(props.capacity),
    fillColor: config.color,
    color: config.borderColor,
    weight: 1.25,
    opacity: 0.95,
    fillOpacity: 0.8,
  };
}

function getVoltageAppearance(kv: number | null): { color: string; weight: number } {
  if (kv === null) return { color: GRID_UNKNOWN_VOLTAGE_COLOR, weight: 2 };
  if (kv >= 400) return GRID_VOLTAGE_CONFIG[400];
  if (kv >= 220) return GRID_VOLTAGE_CONFIG[220];
  if (kv >= 132) return GRID_VOLTAGE_CONFIG[132];
  if (kv >= 66) return GRID_VOLTAGE_CONFIG[66];
  if (kv >= 33) return GRID_VOLTAGE_CONFIG[33];
  return { color: GRID_LOW_VOLTAGE_COLOR, weight: 1.75 };
}

export function getGridLineStyle(props: GridLineProperties): PathOptions {
  const { color, weight } = getVoltageAppearance(props.voltage_kV);
  const statusCfg = GRID_STATUS_CONFIG[props.status as GridStatus];
  return {
    color,
    weight,
    opacity: 0.9,
    dashArray: statusCfg?.dashArray,
  };
}

export function getOsmGridLineStyle(props: OsmGridProperties): PathOptions {
  const { maxKv } = parseOsmVoltage(props.voltage);
  const { color, weight } = getVoltageAppearance(maxKv);
  const isMinor = props.power === 'minor_line';
  return {
    color,
    weight: isMinor ? Math.min(2, weight) : weight,
    opacity: isMinor ? 0.7 : 0.9,
    dashArray: isMinor ? '3 4' : undefined,
  };
}

function renderRow(label: string, value: string): string {
  return `<div class="flex justify-between gap-3 py-0.5 border-b border-slate-100 last:border-b-0">
    <span class="text-slate-500 font-medium">${escapeHtml(label)}</span>
    <span class="text-slate-900 text-right">${escapeHtml(value)}</span>
  </div>`;
}

export function buildHydropowerPopupHtml(props: HydropowerProperties): string {
  const licenseCfg = LICENSE_TYPE_CONFIG[props.license_type as LicenseType];
  const badgeColor = licenseCfg?.color ?? '#64748b';

  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(props.project)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${badgeColor}">
          ${escapeHtml(props.license_type)}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Capacity', formatCapacityMw(props.capacity))}
        ${renderRow('River', props.river || 'N/A')}
        ${renderRow('Location', `${props.gapanapa_name}, ${props.district_name}`)}
        ${renderRow('Province', props.province_name)}
        ${renderRow('License #', props.lic_number || 'N/A')}
        ${renderRow('Issued', formatBsDate(props.issue_date_years, props.issue_date_months, props.issue_date_days))}
        ${renderRow('Valid Until', formatBsDate(props.validity_date_years, props.validity_date_months, props.validity_date_days))}
        ${renderRow('Promoter', props.promoter || 'N/A')}
      </div>
    </div>
  `;
}

export function buildGridLinePopupHtml(props: GridLineProperties): string {
  const { color } = getVoltageAppearance(props.voltage_kV);

  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900">${escapeHtml(props.country)} ${escapeHtml(props.type)} Line #${escapeHtml(props.id)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${color}">
          ${escapeHtml(props.voltage_kV)} kV
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Status', props.status || 'N/A')}
        ${renderRow('Voltage', `${props.voltage_kV} kV`)}
        ${renderRow('Type', props.type || 'N/A')}
        ${renderRow('Source', props.source || 'N/A')}
        ${renderRow('Country', props.country || 'N/A')}
      </div>
    </div>
  `;
}

export function buildOsmGridPopupHtml(props: OsmGridProperties): string {
  const { maxKv, label } = parseOsmVoltage(props.voltage);
  const { color } = getVoltageAppearance(maxKv);
  const title = props.name || `OSM Power ${props.power === 'minor_line' ? 'Minor Line' : 'Line'}`;

  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(title)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${color}">
          ${escapeHtml(label)}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Power Tag', props.power || 'N/A')}
        ${renderRow('Voltage', props.voltage ? `${label} (${props.voltage} V)` : 'Unknown')}
        ${props.circuits ? renderRow('Circuits', props.circuits) : ''}
        ${props.cables ? renderRow('Cables', props.cables) : ''}
        ${props.frequency ? renderRow('Frequency', `${props.frequency} Hz`) : ''}
        ${props.operator ? renderRow('Operator', props.operator) : ''}
        ${props['@id'] ? renderRow('OSM ID', props['@id']) : ''}
      </div>
    </div>
  `;
}

export function getPowerStationMarkerStyle(props: PowerStationProperties): CircleMarkerOptions {
  const normalized = props.type?.startsWith('Small') ? 'Small hydro' : props.type;
  const fillColor = POWER_STATION_COLORS[normalized] ?? '#94a3b8';
  return {
    radius: 5.5,
    fillColor,
    color: '#0f172a',
    weight: 1.5,
    opacity: 1,
    fillOpacity: 0.9,
  };
}

export function buildPowerStationPopupHtml(props: PowerStationProperties): string {
  const normalized = props.type?.startsWith('Small') ? 'Small hydro' : props.type;
  const badgeColor = POWER_STATION_COLORS[normalized] ?? '#64748b';
  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(props.name)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${badgeColor}">
          ${escapeHtml(normalized)}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Status', props.status || 'N/A')}
        ${renderRow('Type', props.type || 'N/A')}
        ${renderRow('Capacity', props.capacit_MW ? formatCapacityMw(props.capacit_MW) : 'Not listed')}
        ${renderRow('Source', props.source || 'N/A')}
      </div>
    </div>
  `;
}

export function buildFlowPopupHtml(seg: FlowSegment): string {
  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900">Modeled Power Flow</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-950 bg-amber-400">
          Estimate
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Estimated Flow', `${seg.flowMw.toFixed(1)} MW`)}
        ${renderRow('Line Voltage', `${seg.voltageKv} kV`)}
        ${renderRow('Grid Source', seg.sourceLabel)}
      </div>
    </div>
  `;
}

export function getDcsMarkerStyle(props: DcsProperties): CircleMarkerOptions {
  return {
    radius: props.is_provincial_office ? 7 : 4.5,
    fillColor: props.is_provincial_office ? '#ec4899' : '#a855f7', // pink-500 / purple-500
    color: '#fdf4ff',
    weight: props.is_provincial_office ? 2 : 1.25,
    opacity: 1,
    fillOpacity: 0.9,
  };
}

export function buildDcsPopupHtml(props: DcsProperties): string {
  const badgeColor = props.is_provincial_office ? '#ec4899' : '#a855f7';
  const badgeLabel = props.is_provincial_office ? 'Provincial Office' : 'DCS Office';
  const safePhone = escapeHtml(props.phone);
  const safeEmail = escapeHtml(props.email);

  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(props.name)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${badgeColor}">
          ${badgeLabel}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Province Office', props.province_office || 'N/A')}
        ${renderRow('Office Chief', props.chief_name || 'N/A')}
        ${props.address ? renderRow('Address', props.address) : ''}
        <div class="flex justify-between gap-3 py-0.5 border-b border-slate-100">
          <span class="text-slate-500 font-medium">Phone</span>
          <a href="tel:${safePhone}" class="text-sky-600 hover:underline text-right">${safePhone || 'N/A'}</a>
        </div>
        <div class="flex justify-between gap-3 py-0.5">
          <span class="text-slate-500 font-medium">Email</span>
          <a href="mailto:${safeEmail}" class="text-sky-600 hover:underline text-right">${safeEmail || 'N/A'}</a>
        </div>
      </div>
    </div>
  `;
}

export function getSubstationMarkerStyle(props: SubstationProperties): CircleMarkerOptions {
  const { maxKv } = parseOsmVoltage(props.voltage);
  const { color } = getVoltageAppearance(maxKv);
  return {
    radius: maxKv && maxKv >= 132 ? 5.5 : 4,
    fillColor: color,
    color: '#ffffff',
    weight: 1.5,
    opacity: 1,
    fillOpacity: 0.9,
  };
}

export function buildSubstationPopupHtml(props: SubstationProperties): string {
  const { maxKv, label } = parseOsmVoltage(props.voltage);
  const { color } = getVoltageAppearance(maxKv);
  const title = props['name:en'] || props.name || 'OSM Substation';

  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(title)}</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background:${color}">
          ${escapeHtml(label)}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('Substation Type', props.substation || 'Unspecified')}
        ${renderRow('Voltage', props.voltage ? `${label} (${props.voltage} V)` : 'Unknown')}
        ${props.operator ? renderRow('Operator', props.operator) : ''}
        ${props['@id'] ? renderRow('OSM ID', props['@id']) : ''}
      </div>
    </div>
  `;
}

export function buildTieInPopupHtml(tie: TieInLine): string {
  const isGen = tie.kind === 'generation';
  return `
    <div class="text-xs leading-relaxed text-slate-800">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-900">Nearest Substation Tie-In</h3>
        <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${
          isGen ? 'bg-emerald-600' : 'bg-purple-600'
        }">
          ${isGen ? 'Generation' : 'Distribution'}
        </span>
      </div>
      <div class="space-y-0.5">
        ${renderRow('From', tie.fromLabel)}
        ${renderRow('To', tie.toLabel)}
        ${renderRow('Distance', `${tie.distanceKm.toFixed(1)} km`)}
      </div>
    </div>
  `;
}
