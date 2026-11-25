import { NEPAL_LOAD_CENTERS } from '../constants/mapConfig';
import type {
  DcsCollection,
  FlowSegment,
  GridLineCollection,
  HydropowerCollection,
  NeaEnergyData,
  OsmGridCollection,
  SubstationCollection,
  TieInLine,
} from '../types/geospatial';
import { parseOsmVoltage } from './formatters';

interface GraphNode {
  id: number;
  lat: number;
  lng: number;
  injectionMw: number;
}

interface GraphEdge {
  u: number;
  v: number;
  susceptance: number;
  voltageKv: number;
  latLngs: [number, number][];
  sourceLabel: string;
}

const SNAP_PRECISION = 0.025; // ~2.5 km grid snapping for connecting nearby line endpoints
const MAX_TIE_IN_KM = 25;

function approxDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111.0;
  const dLng = (lng2 - lng1) * 111.0 * Math.cos(((lat1 + lat2) * Math.PI) / 360);
  return Math.hypot(dLat, dLng);
}

function polylineLengthKm(latLngs: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < latLngs.length; i += 1) {
    total += approxDistanceKm(
      latLngs[i - 1][0],
      latLngs[i - 1][1],
      latLngs[i][0],
      latLngs[i][1],
    );
  }
  return Math.max(0.5, total);
}

/**
 * Solves a linear system A*x = b using Gaussian elimination with partial pivoting.
 * Mutates A and b in place.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const val = Math.abs(A[row][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = row;
      }
    }

    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row][col] / pivot;
      if (factor === 0) continue;
      for (let k = col; k < n; k += 1) {
        A[row][k] -= factor * A[col][k];
      }
      b[row] -= factor * b[col];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    const diag = A[row][row];
    if (Math.abs(diag) < 1e-12) continue;
    let sum = b[row];
    for (let col = row + 1; col < n; col += 1) {
      sum -= A[row][col] * x[col];
    }
    x[row] = sum / diag;
  }
  return x;
}

/**
 * Builds a topological grid graph from active transmission lines, snaps operational
 * hydropower plants (via nearest substation when available) as sources and major Nepal
 * load centers as sinks, scales to NEA's reported National Peak Demand when available,
 * and solves linearized DC power flow (B * theta = P) per connected component.
 */
export function solveEstimatedPowerFlow(
  hydropower: HydropowerCollection | null,
  worldBankGrid: GridLineCollection | null,
  osmGrid: OsmGridCollection | null,
  substations: SubstationCollection | null = null,
  neaEnergy: NeaEnergyData | null = null,
): FlowSegment[] {
  const nodes: GraphNode[] = [];
  const nodeBucket = new Map<string, number>();
  const edges: GraphEdge[] = [];

  const getOrCreateNode = (lat: number, lng: number): number => {
    const key = `${Math.round(lat / SNAP_PRECISION)}_${Math.round(lng / SNAP_PRECISION)}`;
    const existing = nodeBucket.get(key);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodes.push({ id, lat, lng, injectionMw: 0 });
    nodeBucket.set(key, id);
    return id;
  };

  const addLine = (coords: number[][], voltageKv: number, sourceLabel: string) => {
    if (coords.length < 2) return;
    const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
    const u = getOrCreateNode(latLngs[0][0], latLngs[0][1]);
    const v = getOrCreateNode(latLngs[latLngs.length - 1][0], latLngs[latLngs.length - 1][1]);
    if (u === v) return;

    const lengthKm = polylineLengthKm(latLngs);
    const effectiveKv = voltageKv > 0 ? voltageKv : 33;
    const susceptance = (effectiveKv * effectiveKv) / (lengthKm * 1000);
    edges.push({ u, v, susceptance, voltageKv: effectiveKv, latLngs, sourceLabel });
  };

  if (worldBankGrid) {
    for (const feat of worldBankGrid.features) {
      const kv = feat.properties.voltage_kV || 66;
      if (feat.geometry.type === 'LineString') {
        addLine(feat.geometry.coordinates, kv, 'World Bank Grid');
      } else if (feat.geometry.type === 'MultiLineString') {
        for (const part of feat.geometry.coordinates) {
          addLine(part, kv, 'World Bank Grid');
        }
      }
    }
  }

  if (osmGrid) {
    for (const feat of osmGrid.features) {
      if (feat.properties.power === 'minor_line') continue;
      const { maxKv } = parseOsmVoltage(feat.properties.voltage);
      addLine(feat.geometry.coordinates, maxKv ?? 66, 'OSM Grid');
    }
  }

  if (nodes.length === 0 || edges.length === 0) return [];

  const findNearestNode = (lat: number, lng: number): number => {
    let bestId = 0;
    let bestDist = Infinity;
    for (const node of nodes) {
      const d = approxDistanceKm(lat, lng, node.lat, node.lng);
      if (d < bestDist) {
        bestDist = d;
        bestId = node.id;
      }
    }
    return bestId;
  };

  // Precompute substation coordinates for realistic generation tie-in snapping
  const subCoords =
    substations?.features.map((f) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    })) ?? [];

  const findNearestSubstationOrPoint = (lat: number, lng: number): [number, number] => {
    if (subCoords.length === 0) return [lat, lng];
    let best = subCoords[0];
    let bestDist = Infinity;
    for (const s of subCoords) {
      const d = approxDistanceKm(lat, lng, s.lat, s.lng);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return bestDist <= MAX_TIE_IN_KM ? [best.lat, best.lng] : [lat, lng];
  };

  // Inject operational hydropower generation at nearest substation -> grid node
  let rawOperationalMw = 0;
  if (hydropower) {
    for (const feat of hydropower.features) {
      if (feat.properties.license_type !== 'Operation') continue;
      const mw = feat.properties.capacity ?? 0;
      if (mw <= 0) continue;
      rawOperationalMw += mw;
      const [lng, lat] = feat.geometry.coordinates;
      const [tieLat, tieLng] = findNearestSubstationOrPoint(lat, lng);
      const nodeId = findNearestNode(tieLat, tieLng);
      nodes[nodeId].injectionMw += mw;
    }
  }

  // Scale injections to NEA's live National Peak Demand (MW) when available
  const neaPeakMw = neaEnergy?.metrics?.national_peak_demand_mw;
  if (neaPeakMw && neaPeakMw > 0 && rawOperationalMw > 0) {
    const scale = neaPeakMw / rawOperationalMw;
    for (const node of nodes) {
      if (node.injectionMw > 0) {
        node.injectionMw *= scale;
      }
    }
  }

  const loadAssignments = NEPAL_LOAD_CENTERS.map((center) => ({
    nodeId: findNearestNode(center.lat, center.lng),
    share: center.demandShare,
  }));

  const adj: number[][] = Array.from({ length: nodes.length }, () => []);
  for (let i = 0; i < edges.length; i += 1) {
    adj[edges[i].u].push(i);
    adj[edges[i].v].push(i);
  }

  const visited = new Uint8Array(nodes.length);
  const theta = new Float64Array(nodes.length);

  for (let start = 0; start < nodes.length; start += 1) {
    if (visited[start]) continue;

    const compNodes: number[] = [];
    const queue = [start];
    visited[start] = 1;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      compNodes.push(curr);
      for (const edgeIdx of adj[curr]) {
        const edge = edges[edgeIdx];
        const next = edge.u === curr ? edge.v : edge.u;
        if (!visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }

    if (compNodes.length < 2) continue;

    const compSet = new Set(compNodes);
    const totalGen = compNodes.reduce((sum, id) => sum + nodes[id].injectionMw, 0);
    if (totalGen <= 0) continue;

    const compLoads = loadAssignments.filter((l) => compSet.has(l.nodeId));
    const loadMap = new Map<number, number>();
    if (compLoads.length > 0) {
      const shareSum = compLoads.reduce((s, l) => s + l.share, 0);
      for (const l of compLoads) {
        loadMap.set(l.nodeId, (loadMap.get(l.nodeId) ?? 0) + (totalGen * l.share) / shareSum);
      }
    } else {
      const nonGen = compNodes.filter((id) => nodes[id].injectionMw === 0);
      const targets = nonGen.length > 0 ? nonGen : compNodes;
      for (const id of targets) {
        loadMap.set(id, totalGen / targets.length);
      }
    }

    const localIndex = new Map<number, number>();
    compNodes.forEach((id, idx) => localIndex.set(id, idx));

    const m = compNodes.length - 1;
    if (m <= 0) continue;

    const B: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
    const P = new Array<number>(m).fill(0);

    for (let idx = 1; idx < compNodes.length; idx += 1) {
      const nodeId = compNodes[idx];
      P[idx - 1] = nodes[nodeId].injectionMw - (loadMap.get(nodeId) ?? 0);
    }

    for (const edge of edges) {
      if (!compSet.has(edge.u) || !compSet.has(edge.v)) continue;
      const iu = localIndex.get(edge.u)!;
      const iv = localIndex.get(edge.v)!;
      const bVal = edge.susceptance;

      if (iu > 0) B[iu - 1][iu - 1] += bVal;
      if (iv > 0) B[iv - 1][iv - 1] += bVal;
      if (iu > 0 && iv > 0) {
        B[iu - 1][iv - 1] -= bVal;
        B[iv - 1][iu - 1] -= bVal;
      }
    }

    const solved = solveLinearSystem(B, P);
    for (let idx = 1; idx < compNodes.length; idx += 1) {
      theta[compNodes[idx]] = solved[idx - 1];
    }
  }

  const segments: FlowSegment[] = [];
  for (const edge of edges) {
    const rawFlow = edge.susceptance * (theta[edge.u] - theta[edge.v]);
    const absFlow = Math.abs(rawFlow);
    if (absFlow < 0.5) continue;

    const latLngs = rawFlow >= 0 ? edge.latLngs : [...edge.latLngs].reverse();
    segments.push({
      latLngs,
      flowMw: absFlow,
      voltageKv: edge.voltageKv,
      sourceLabel: edge.sourceLabel,
    });
  }

  return segments;
}

/**
 * Computes straight-line tie-in spurs from Operational hydropower plants to their nearest
 * substation, and from nearest substations to NEA Distribution Centers (DCS), without
 * altering the actual transmission line geometries.
 */
export function computeSubstationTieIns(
  hydropower: HydropowerCollection | null,
  substations: SubstationCollection | null,
  dcs: DcsCollection | null,
): TieInLine[] {
  if (!substations || substations.features.length === 0) return [];

  const subList = substations.features.map((f) => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    label: f.properties['name:en'] || f.properties.name || 'Substation',
  }));

  const findNearestSub = (lat: number, lng: number) => {
    let best = subList[0];
    let bestDist = Infinity;
    for (const s of subList) {
      const d = approxDistanceKm(lat, lng, s.lat, s.lng);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return { sub: best, distKm: bestDist };
  };

  const tieIns: TieInLine[] = [];

  if (hydropower) {
    for (const f of hydropower.features) {
      if (f.properties.license_type !== 'Operation') continue;
      const [lng, lat] = f.geometry.coordinates;
      const { sub, distKm } = findNearestSub(lat, lng);
      if (distKm <= MAX_TIE_IN_KM) {
        tieIns.push({
          latLngs: [
            [lat, lng],
            [sub.lat, sub.lng],
          ],
          kind: 'generation',
          fromLabel: f.properties.project,
          toLabel: sub.label,
          distanceKm: distKm,
        });
      }
    }
  }

  if (dcs) {
    for (const f of dcs.features) {
      const [lng, lat] = f.geometry.coordinates;
      const { sub, distKm } = findNearestSub(lat, lng);
      if (distKm <= MAX_TIE_IN_KM) {
        tieIns.push({
          latLngs: [
            [sub.lat, sub.lng],
            [lat, lng],
          ],
          kind: 'distribution',
          fromLabel: sub.label,
          toLabel: f.properties.name,
          distanceKm: distKm,
        });
      }
    }
  }

  return tieIns;
}
