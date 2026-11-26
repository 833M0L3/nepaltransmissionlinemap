import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  NEPAL_BOUNDS,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  SATELLITE_ATTRIBUTION,
  SATELLITE_TILE_URL,
} from '../../constants/mapConfig';
import type {
  DcsCollection,
  FlowSegment,
  GridLineCollection,
  HydropowerCollection,
  OsmGridCollection,
  PowerStationCollection,
  SubstationCollection,
  TieInLine,
} from '../../types/geospatial';
import {
  buildDcsPopupHtml,
  buildGridLinePopupHtml,
  buildHydropowerPopupHtml,
  buildOsmGridPopupHtml,
  buildPowerStationPopupHtml,
  buildSubstationPopupHtml,
  buildTieInPopupHtml,
  getDcsMarkerStyle,
  getGridLineStyle,
  getHydropowerMarkerStyle,
  getOsmGridLineStyle,
  getPowerStationMarkerStyle,
  getSubstationMarkerStyle,
} from '../../utils/mapLayers';

interface LeafletMapProps {
  hydropower: HydropowerCollection | null;
  powerStations: PowerStationCollection | null;
  substations: SubstationCollection | null;
  dcs: DcsCollection | null;
  grid: GridLineCollection | null;
  osmGrid: OsmGridCollection | null;
  flowSegments: FlowSegment[];
  tieInLines: TieInLine[];
  basemap: 'osm' | 'satellite';
  resetTrigger: number;
}

/**
 * Adds a wide invisible hit-target over a polyline and smoothly expands
 * the visible stroke on mouse hover, touch, or active popup.
 */
function attachInteractiveLineBehavior(
  visibleLine: L.Polyline,
  baseWeight: number,
  baseOpacity: number,
  svgRenderer: L.SVG,
  targetGroup: L.LayerGroup,
) {
  const expandedWeight = baseWeight + 3.5;

  const expand = () => {
    visibleLine.setStyle({ weight: expandedWeight, opacity: 1 });
    visibleLine.bringToFront();
  };

  const reset = () => {
    if (!visibleLine.isPopupOpen()) {
      visibleLine.setStyle({ weight: baseWeight, opacity: baseOpacity });
    }
  };

  const hitTarget = L.polyline(
    visibleLine.getLatLngs() as L.LatLngExpression[] | L.LatLngExpression[][],
    {
      renderer: svgRenderer,
      weight: 16,
      opacity: 0,
      fill: false,
      className: 'cursor-pointer',
    },
  );

  hitTarget.on('mouseover', expand);
  hitTarget.on('mouseout', reset);
  hitTarget.on('touchstart', expand);
  hitTarget.on('click', (e: L.LeafletMouseEvent) => {
    visibleLine.openPopup(e.latlng);
  });

  visibleLine.on('popupopen', expand);
  visibleLine.on('popupclose', () => {
    visibleLine.setStyle({ weight: baseWeight, opacity: baseOpacity });
  });

  hitTarget.addTo(targetGroup);
}

export function LeafletMap({
  hydropower,
  powerStations,
  substations,
  dcs,
  grid,
  osmGrid,
  flowSegments,
  tieInLines,
  basemap,
  resetTrigger,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmTileRef = useRef<L.TileLayer | null>(null);
  const satelliteTileRef = useRef<L.TileLayer | null>(null);
  const hydroLayerRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const substationsLayerRef = useRef<L.LayerGroup | null>(null);
  const dcsLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const osmGridLayerRef = useRef<L.LayerGroup | null>(null);
  const flowLayerRef = useRef<L.LayerGroup | null>(null);
  const tieInsLayerRef = useRef<L.LayerGroup | null>(null);
  const svgRendererRef = useRef<L.SVG | null>(null);
  const flowSvgRendererRef = useRef<L.SVG | null>(null);

  // Initialize Leaflet map and OSM tile layer once, centered on Nepal
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      preferCanvas: true,
    });
    map.fitBounds(NEPAL_BOUNDS, { padding: [24, 24] });

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    osmTileRef.current = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    satelliteTileRef.current = L.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION,
      maxZoom: 19,
    });

    const flowPane = map.createPane('powerFlowPane');
    flowPane.style.zIndex = '410';
    flowPane.style.pointerEvents = 'none';

    svgRendererRef.current = L.svg().addTo(map);
    flowSvgRendererRef.current = L.svg({ pane: 'powerFlowPane' }).addTo(map);
    tieInsLayerRef.current = L.layerGroup().addTo(map);
    osmGridLayerRef.current = L.layerGroup().addTo(map);
    gridLayerRef.current = L.layerGroup().addTo(map);
    flowLayerRef.current = L.layerGroup().addTo(map);
    substationsLayerRef.current = L.layerGroup().addTo(map);
    dcsLayerRef.current = L.layerGroup().addTo(map);
    stationsLayerRef.current = L.layerGroup().addTo(map);
    hydroLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      hydroLayerRef.current = null;
      stationsLayerRef.current = null;
      substationsLayerRef.current = null;
      dcsLayerRef.current = null;
      gridLayerRef.current = null;
      osmGridLayerRef.current = null;
      flowLayerRef.current = null;
      tieInsLayerRef.current = null;
      svgRendererRef.current = null;
      flowSvgRendererRef.current = null;
      osmTileRef.current = null;
      satelliteTileRef.current = null;
    };
  }, []);

  // Switch between OSM Street and Satellite basemap
  useEffect(() => {
    const map = mapRef.current;
    const osmTile = osmTileRef.current;
    const satTile = satelliteTileRef.current;
    if (!map || !osmTile || !satTile) return;

    if (basemap === 'satellite') {
      if (map.hasLayer(osmTile)) map.removeLayer(osmTile);
      if (!map.hasLayer(satTile)) satTile.addTo(map);
    } else {
      if (map.hasLayer(satTile)) map.removeLayer(satTile);
      if (!map.hasLayer(osmTile)) osmTile.addTo(map);
    }
  }, [basemap]);

  // Render hydropower circle markers
  useEffect(() => {
    const layerGroup = hydroLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!hydropower) return;

    const geoJsonLayer = L.geoJSON(hydropower, {
      pointToLayer: (feature, latlng) => {
        const style = getHydropowerMarkerStyle(feature.properties);
        return L.circleMarker(latlng, style);
      },
      onEachFeature: (feature, layer) => {
        const coords =
          feature.geometry.type === 'Point'
            ? (feature.geometry.coordinates as [number, number])
            : undefined;
        layer.bindPopup(buildHydropowerPopupHtml(feature.properties, coords), { maxWidth: 320 });
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [hydropower]);

  // Render World Bank power stations
  useEffect(() => {
    const layerGroup = stationsLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!powerStations) return;

    const geoJsonLayer = L.geoJSON(powerStations, {
      pointToLayer: (feature, latlng) => {
        const style = getPowerStationMarkerStyle(feature.properties);
        return L.circleMarker(latlng, style);
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPowerStationPopupHtml(feature.properties), { maxWidth: 280 });
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [powerStations]);

  // Render OSM Substations
  useEffect(() => {
    const layerGroup = substationsLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!substations) return;

    const geoJsonLayer = L.geoJSON(substations, {
      pointToLayer: (feature, latlng) => {
        const style = getSubstationMarkerStyle(feature.properties);
        return L.circleMarker(latlng, style);
      },
      onEachFeature: (feature, layer) => {
        const coords =
          feature.geometry.type === 'Point'
            ? (feature.geometry.coordinates as [number, number])
            : undefined;
        layer.bindPopup(buildSubstationPopupHtml(feature.properties, coords), { maxWidth: 300 });
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [substations]);

  // Render NEA Distribution Centers (DCS)
  useEffect(() => {
    const layerGroup = dcsLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!dcs) return;

    const geoJsonLayer = L.geoJSON(dcs, {
      pointToLayer: (feature, latlng) => {
        const style = getDcsMarkerStyle(feature.properties);
        return L.circleMarker(latlng, style);
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildDcsPopupHtml(feature.properties), { maxWidth: 300 });
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [dcs]);

  // Render World Bank Nepal transmission grid polylines
  useEffect(() => {
    const layerGroup = gridLayerRef.current;
    const svgRenderer = svgRendererRef.current;
    if (!layerGroup || !svgRenderer) return;

    layerGroup.clearLayers();
    if (!grid) return;

    const geoJsonLayer = L.geoJSON(grid, {
      interactive: false,
      style: (feature) => {
        const base = feature
          ? getGridLineStyle(feature.properties)
          : { color: '#64748b', weight: 2.5, opacity: 0.9 };
        return { ...base, renderer: svgRenderer, interactive: false, className: 'interactive-line' };
      },
      onEachFeature: (feature, layer) => {
        const polyline = layer as L.Polyline;
        const base = getGridLineStyle(feature.properties);
        polyline.bindPopup(buildGridLinePopupHtml(feature.properties), { maxWidth: 280 });
        attachInteractiveLineBehavior(
          polyline,
          base.weight ?? 2.5,
          base.opacity ?? 0.9,
          svgRenderer,
          layerGroup,
        );
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [grid]);

  // Render OSM export transmission grid polylines
  useEffect(() => {
    const layerGroup = osmGridLayerRef.current;
    const svgRenderer = svgRendererRef.current;
    if (!layerGroup || !svgRenderer) return;

    layerGroup.clearLayers();
    if (!osmGrid) return;

    const geoJsonLayer = L.geoJSON(osmGrid, {
      interactive: false,
      style: (feature) => {
        const base = feature
          ? getOsmGridLineStyle(feature.properties)
          : { color: '#64748b', weight: 2, opacity: 0.9 };
        return { ...base, renderer: svgRenderer, interactive: false, className: 'interactive-line' };
      },
      onEachFeature: (feature, layer) => {
        const polyline = layer as L.Polyline;
        const base = getOsmGridLineStyle(feature.properties);
        polyline.bindPopup(buildOsmGridPopupHtml(feature.properties), { maxWidth: 300 });
        attachInteractiveLineBehavior(
          polyline,
          base.weight ?? 2,
          base.opacity ?? 0.9,
          svgRenderer,
          layerGroup,
        );
      },
    });

    geoJsonLayer.addTo(layerGroup);
  }, [osmGrid]);

  // Render animated modeled power flow lines
  useEffect(() => {
    const layerGroup = flowLayerRef.current;
    const flowRenderer = flowSvgRendererRef.current;
    if (!layerGroup || !flowRenderer) return;

    layerGroup.clearLayers();
    if (flowSegments.length === 0) return;

    for (const seg of flowSegments) {
      const weight = Math.min(6, Math.max(2, 1.5 + Math.sqrt(seg.flowMw) * 0.16));
      const polyline = L.polyline(seg.latLngs, {
        renderer: flowRenderer,
        color: '#fbbf24', // amber-400
        weight,
        opacity: 0.92,
        dashArray: '8 12',
        interactive: false,
        className: 'power-flow-line',
      });
      polyline.addTo(layerGroup);
    }
  }, [flowSegments]);

  // Render nearest substation tie-in spurs
  useEffect(() => {
    const layerGroup = tieInsLayerRef.current;
    const svgRenderer = svgRendererRef.current;
    if (!layerGroup || !svgRenderer) return;

    layerGroup.clearLayers();
    if (tieInLines.length === 0) return;

    for (const tie of tieInLines) {
      const polyline = L.polyline(tie.latLngs, {
        renderer: svgRenderer,
        color: tie.kind === 'generation' ? '#34d399' : '#c084fc',
        weight: 1.5,
        opacity: 0.75,
        dashArray: '4 4',
        interactive: false,
        className: 'interactive-line',
      });
      polyline.bindPopup(buildTieInPopupHtml(tie), { maxWidth: 260 });
      polyline.addTo(layerGroup);
      attachInteractiveLineBehavior(polyline, 1.5, 0.75, svgRenderer, layerGroup);
    }
  }, [tieInLines]);

  // Re-fit Nepal bounds when requested
  useEffect(() => {
    if (resetTrigger === 0 || !mapRef.current) return;
    mapRef.current.flyToBounds(NEPAL_BOUNDS, { padding: [24, 24], duration: 0.8 });
  }, [resetTrigger]);

  return <div ref={containerRef} className="h-full w-full z-0" aria-label="Interactive OSM Map" />;
}
