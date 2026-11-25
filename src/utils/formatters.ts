/** Escapes HTML special characters to prevent XSS in Leaflet popups. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCapacityMw(capacity: number | null | undefined): string {
  if (capacity === null || capacity === undefined || Number.isNaN(capacity)) {
    return 'N/A';
  }
  return `${capacity.toLocaleString(undefined, { maximumFractionDigits: 2 })} MW`;
}

export function formatBsDate(
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string {
  if (!year || !month || !day) return 'N/A';
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd} BS`;
}

export interface ParsedVoltage {
  maxKv: number | null;
  label: string;
}

/**
 * Parses OSM `voltage` tag values (stored in Volts, e.g. "132000", "132000;66000", "220").
 * Values >= 1000 are converted to kV; values < 1000 remain in V (and map to fractional kV).
 */
export function parseOsmVoltage(raw: string | null | undefined): ParsedVoltage {
  if (!raw) return { maxKv: null, label: 'Unknown' };

  const parts = raw
    .split(/[;,]/)
    .map((part) => Number(part.trim()))
    .filter((num) => !Number.isNaN(num) && num > 0);

  if (parts.length === 0) return { maxKv: null, label: raw };

  const kvValues = parts.map((v) => v / 1000);
  const maxKv = Math.max(...kvValues);
  const formattedParts = parts.map((v) =>
    v >= 1000 ? `${Number((v / 1000).toFixed(2))} kV` : `${v} V`,
  );

  return {
    maxKv,
    label: formattedParts.join(' / '),
  };
}
