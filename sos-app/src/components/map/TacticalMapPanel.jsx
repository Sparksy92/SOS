import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Map as MapIcon, 
  Trash2, 
  Compass, 
  Layers, 
  Plus, 
  Check, 
  X, 
  AlertTriangle,
  Grid,
  Info
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset loading in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

import { API_BASE } from '../../config.js';

// Area Shoelace Calculator (Lat/Lng to local meters projection)
const calculateAreaAcres = (points) => {
  if (!points || points.length < 3) return 0;
  const refLat = points[0][0];
  const radLat = (refLat * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = (40075000 * Math.cos(radLat)) / 360;

  // Convert to flat xy meters relative to first point
  const xyPoints = points.map(p => {
    const dy = (p[0] - refLat) * metersPerDegreeLat;
    const dx = (p[1] - points[0][1]) * metersPerDegreeLng;
    return { x: dx, y: dy };
  });

  // Shoelace formula
  let area = 0;
  const n = xyPoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += xyPoints[i].x * xyPoints[j].y - xyPoints[j].x * xyPoints[i].y;
  }
  const sqMeters = Math.abs(area / 2);
  const acres = sqMeters / 4046.86; // 1 acre = 4046.86 sq meters
  return acres;
};

export default function TacticalMapPanel() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // States
  const [polygons, setPolygons] = useState(() => {
    try {
      const saved = localStorage.getItem('sos_map_polygons');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [markers, setMarkers] = useState(() => {
    try {
      const saved = localStorage.getItem('sos_map_markers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [isPlacingMarker, setIsPlacingMarker] = useState(null); // 'water', 'power', 'storage', 'firstaid'
  const [useGridFallback, setUseGridFallback] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [markerLabel, setMarkerLabel] = useState('');
  const [meshNodes, setMeshNodes] = useState([]);

  useEffect(() => {
    const fetchMeshNodes = () => {
      fetch(`${API_BASE}/api/mesh/nodes`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMeshNodes(data);
          }
        })
        .catch(err => console.error("Error polling mesh nodes:", err));
    };
    fetchMeshNodes();
    const interval = setInterval(fetchMeshNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  // Layer groups for active updates on map
  const activePolygonsLayer = useRef(null);
  const activeMarkersLayer = useRef(null);
  const drawTempLayer = useRef(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('sos_map_polygons', JSON.stringify(polygons));
  }, [polygons]);

  useEffect(() => {
    localStorage.setItem('sos_map_markers', JSON.stringify(markers));
  }, [markers]);

  // Leaflet Map Init
  useEffect(() => {
    if (useGridFallback || !mapContainerRef.current) return;

    // Destroy existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      // Create Map
      const map = L.map(mapContainerRef.current, {
        center: [38.8951, -77.0364], // Default Washington D.C.
        zoom: 13,
        zoomControl: false
      });
      mapRef.current = map;

      // Add dark matter tiles (offline-friendly, high contrast tactical style)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);

      // Re-position zoom controls to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add feature layers
      activePolygonsLayer.current = L.layerGroup().addTo(map);
      activeMarkersLayer.current = L.layerGroup().addTo(map);
      drawTempLayer.current = L.layerGroup().addTo(map);

      // Try geolocating on load
      map.locate({ setView: true, maxZoom: 16 });

      // Click Event binding
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        if (isDrawing) {
          setDrawPoints(prev => [...prev, [lat, lng]]);
        } else if (isPlacingMarker) {
          const label = prompt(`Enter label for your ${isPlacingMarker.toUpperCase()} marker:`) || isPlacingMarker.toUpperCase();
          const newMarker = {
            id: Date.now(),
            lat,
            lng,
            label,
            type: isPlacingMarker
          };
          setMarkers(prev => [...prev, newMarker]);
          setIsPlacingMarker(null);
        }
      });

      // Geolocation listener
      map.on('locationfound', (e) => {
        const pos = [e.latitude, e.longitude];
        setCurrentPosition(pos);
        L.circle(pos, { radius: e.accuracy, color: 'var(--brand-primary)', fillOpacity: 0.1 }).addTo(map);
      });

      map.on('locationerror', () => {
        console.warn("Geolocation failed. Operator coordinates unavailable.");
      });

    } catch (err) {
      console.error("Leaflet initialization failed. Falling back to grid view.", err);
      setUseGridFallback(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [useGridFallback]);

  // Update Polygons Layer
  useEffect(() => {
    if (useGridFallback || !activePolygonsLayer.current || !mapRef.current) return;
    activePolygonsLayer.current.clearLayers();

    polygons.forEach((poly, idx) => {
      const area = calculateAreaAcres(poly.points);
      const leafletPoly = L.polygon(poly.points, {
        color: 'var(--brand-primary)',
        fillColor: 'var(--brand-primary)',
        fillOpacity: 0.2,
        weight: 2
      });

      leafletPoly.bindPopup(`<strong>${poly.name}</strong><br/>Area: ${area.toFixed(2)} Acres`);
      activePolygonsLayer.current.addLayer(leafletPoly);
    });
  }, [polygons, useGridFallback]);

  // Update Markers Layer
  useEffect(() => {
    if (useGridFallback || !activeMarkersLayer.current || !mapRef.current) return;
    activeMarkersLayer.current.clearLayers();

    // 1. Render manual markers
    markers.forEach(m => {
      let color = 'var(--brand-primary)';
      if (m.type === 'water') color = '#00f2fe';
      if (m.type === 'power') color = '#ffd700';
      if (m.type === 'firstaid') color = '#ff4500';

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12]
      });

      const leafletMarker = L.marker([m.lat, m.lng], { icon: customIcon });
      leafletMarker.bindPopup(`<strong>${m.label.toUpperCase()}</strong><br/>Category: ${m.type.toUpperCase()}`);
      activeMarkersLayer.current.addLayer(leafletMarker);
    });

    // 2. Render Meshtastic nodes (Neon pink style)
    meshNodes.forEach(node => {
      const color = '#ff007f';
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 12px ${color}; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 8px; font-weight: bold;">M</span></div>`,
        iconSize: [14, 14]
      });

      const leafletMarker = L.marker([node.latitude, node.longitude], { icon: customIcon });
      leafletMarker.bindPopup(`<strong>📡 MESH NODE: ${node.name}</strong><br/>Battery: ${node.battery}%<br/>ID: ${node.id}<br/>Seen: ${new Date(node.lastSeen).toLocaleTimeString()}`);
      activeMarkersLayer.current.addLayer(leafletMarker);
    });
  }, [markers, meshNodes, useGridFallback]);

  // Render Drawing temp elements
  useEffect(() => {
    if (useGridFallback || !drawTempLayer.current || !mapRef.current) return;
    drawTempLayer.current.clearLayers();

    if (drawPoints.length > 0) {
      drawPoints.forEach(p => {
        L.circleMarker(p, { radius: 5, color: '#ffd700' }).addTo(drawTempLayer.current);
      });

      if (drawPoints.length > 1) {
        L.polyline(drawPoints, { color: '#ffd700', dashArray: '4,4' }).addTo(drawTempLayer.current);
      }
    }
  }, [drawPoints, useGridFallback]);

  // Calculate Total Acreage
  const totalAcreage = useMemo(() => {
    return polygons.reduce((acc, p) => acc + calculateAreaAcres(p.points), 0);
  }, [polygons]);

  // Geolocation trigger
  const handleLocateOperator = () => {
    if (mapRef.current) {
      mapRef.current.locate({ setView: true, maxZoom: 16 });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => alert("Unable to locate. Enable browser positioning permission.")
      );
    }
  };

  const handleFinishDrawing = () => {
    if (drawPoints.length < 3) {
      alert("A boundary polygon requires at least 3 vertices.");
      return;
    }
    const name = prompt("Enter boundary label (e.g. Homestead Perimeter):") || `Zone ${polygons.length + 1}`;
    setPolygons(prev => [...prev, {
      id: Date.now(),
      name,
      points: drawPoints
    }]);
    setDrawPoints([]);
    setIsDrawing(false);
  };

  // Offline Fallback grid canvas drawing helpers
  const [gridDrawPoints, setGridDrawPoints] = useState([]);
  const [gridPolygons, setGridPolygons] = useState([]);
  const [gridMarkers, setGridMarkers] = useState([]);

  const handleGridCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (isDrawing) {
      setGridDrawPoints(prev => [...prev, [x, y]]);
    } else if (isPlacingMarker) {
      const label = prompt(`Enter label for your ${isPlacingMarker.toUpperCase()} marker:`) || isPlacingMarker.toUpperCase();
      setGridMarkers(prev => [...prev, { id: Date.now(), x, y, label, type: isPlacingMarker }]);
      setIsPlacingMarker(null);
    }
  };

  const handleFinishGridDrawing = () => {
    if (gridDrawPoints.length < 3) return;
    const name = prompt("Enter boundary label:") || `Zone ${gridPolygons.length + 1}`;
    setGridPolygons(prev => [...prev, { id: Date.now(), name, points: gridDrawPoints }]);
    setGridDrawPoints([]);
    setIsDrawing(false);
  };

  // Shoelace formula in pixels for grid
  const calculateGridArea = (points) => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1] - points[j][0] * points[i][1];
    }
    // Scale pixel area to dummy off-grid relative units
    return Math.abs(area / 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header HUD panel */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            🛰 TACTICAL MAP ENVIRONMENT
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
            {useGridFallback ? 'OFFLINE SCHEMA CANVAS ACTIVE' : 'LOCAL-FIRST GPS POSITIONING & PERIMETER BOUNDARIES'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>HOMESTEAD AREA:</span>
            <span style={{ fontSize: '1.1rem', color: '#00ff7f', fontWeight: 'bold' }}>
              {(useGridFallback ? gridPolygons.reduce((acc, p) => acc + calculateGridArea(p.points), 0) : totalAcreage).toFixed(2)} Acres
            </span>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>MARKERS / PERIMETERS:</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', fontWeight: 'bold' }}>
              {useGridFallback ? `${gridMarkers.length} / ${gridPolygons.length}` : `${markers.length} / ${polygons.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', minHeight: '520px' }}>
        
        {/* Sidebar Controls */}
        <div className="glass-panel" style={{ flex: '1 1 250px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
            OPERATOR DIRECTIVES
          </h3>

          <button className="btn-tactical" onClick={handleLocateOperator} disabled={useGridFallback} style={{ width: '100%', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <Compass size={14} /> LOCATE OPERATOR
          </button>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

          {/* Polygon drawing buttons */}
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>PERIMETERS</span>
            {isDrawing ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-tactical" onClick={useGridFallback ? handleFinishGridDrawing : handleFinishDrawing} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', backgroundColor: '#00ff7f', color: '#000', borderColor: '#00ff7f' }}>
                  <Check size={12} /> SAVE
                </button>
                <button className="btn-tactical-outline" onClick={() => { setIsDrawing(false); setDrawPoints([]); setGridDrawPoints([]); }} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}>
                  <X size={12} /> CANCEL
                </button>
              </div>
            ) : (
              <button className="btn-tactical-outline" onClick={() => { setIsDrawing(true); setIsPlacingMarker(null); }} style={{ width: '100%', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <Plus size={14} /> DRAW LAND BOUNDARY
              </button>
            )}
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

          {/* Marker placement list */}
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>TACTICAL MARKERS</span>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button 
                onClick={() => { setIsPlacingMarker('water'); setIsDrawing(false); }}
                className={isPlacingMarker === 'water' ? 'btn-tactical' : 'btn-tactical-outline'}
                style={{ fontSize: '0.78rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#00f2fe', color: isPlacingMarker === 'water' ? '#000' : '#00f2fe' }}
              >
                <MapPin size={12} /> Plot Water Resource
              </button>
              <button 
                onClick={() => { setIsPlacingMarker('power'); setIsDrawing(false); }}
                className={isPlacingMarker === 'power' ? 'btn-tactical' : 'btn-tactical-outline'}
                style={{ fontSize: '0.78rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#ffd700', color: isPlacingMarker === 'power' ? '#000' : '#ffd700' }}
              >
                <MapPin size={12} /> Plot Generator / Power
              </button>
              <button 
                onClick={() => { setIsPlacingMarker('storage'); setIsDrawing(false); }}
                className={isPlacingMarker === 'storage' ? 'btn-tactical' : 'btn-tactical-outline'}
                style={{ fontSize: '0.78rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#00ff7f', color: isPlacingMarker === 'storage' ? '#000' : '#00ff7f' }}
              >
                <MapPin size={12} /> Plot Shed / Storage
              </button>
              <button 
                onClick={() => { setIsPlacingMarker('firstaid'); setIsDrawing(false); }}
                className={isPlacingMarker === 'firstaid' ? 'btn-tactical' : 'btn-tactical-outline'}
                style={{ fontSize: '0.78rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#ff4500', color: isPlacingMarker === 'firstaid' ? '#000' : '#ff4500' }}
              >
                <MapPin size={12} /> Plot First Aid Station
              </button>
            </div>
            {isPlacingMarker && (
              <span style={{ fontSize: '0.72rem', color: '#ffd700', display: 'block', marginTop: '8px', textAlign: 'center' }}>
                💡 Click on the map to drop the marker.
              </span>
            )}
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

          {/* Toggle view mode */}
          <button 
            className="btn-tactical-outline" 
            onClick={() => setUseGridFallback(prev => !prev)} 
            style={{ width: '100%', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', gap: '6px' }}
          >
            <Grid size={14} /> {useGridFallback ? 'Switch to Map Layer' : 'Switch to Canvas Grid'}
          </button>
        </div>

        {/* The Map Frame */}
        <div className="glass-panel" style={{ flex: '3 1 600px', position: 'relative', overflow: 'hidden', height: '520px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Geolocation status header overlay */}
          {currentPosition && !useGridFallback && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', color: '#00ff7f', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(6px)' }}>
              🎯 LAT: {currentPosition[0].toFixed(5)} / LNG: {currentPosition[1].toFixed(5)}
            </div>
          )}

          {/* Leaflet map object */}
          <div 
            ref={mapContainerRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: useGridFallback ? 'none' : 'block',
              backgroundColor: '#0a0a0a' 
            }} 
          />

          {/* Offline SVG Canvas Fallback */}
          {useGridFallback && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#090a0f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(255, 69, 0, 0.05)', borderBottom: '1px solid rgba(255,69,0,0.1)', color: '#ffd700', fontSize: '0.82rem' }}>
                <AlertTriangle size={14} />
                <span>Running in completely offline local schema drawing mode. Relative units will apply.</span>
              </div>
              <div style={{ flex: 1, position: 'relative', cursor: isDrawing ? 'crosshair' : 'default' }}>
                <svg 
                  width="100%" 
                  height="100%" 
                  onClick={handleGridCanvasClick}
                  style={{ display: 'block', backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
                >
                  {/* Render Grid Polygons */}
                  {gridPolygons.map((poly) => (
                    <polygon
                      key={poly.id}
                      points={poly.points.map(p => p.join(',')).join(' ')}
                      style={{ fill: 'var(--brand-primary)', fillOpacity: 0.15, stroke: 'var(--brand-primary)', strokeWidth: 2 }}
                    />
                  ))}

                  {/* Render active draw line */}
                  {isDrawing && gridDrawPoints.length > 0 && (
                    <>
                      {gridDrawPoints.map((p, i) => (
                        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#ffd700" />
                      ))}
                      {gridDrawPoints.length > 1 && (
                        <polyline
                          points={gridDrawPoints.map(p => p.join(',')).join(' ')}
                          style={{ fill: 'none', stroke: '#ffd700', strokeWidth: 1.5, strokeDasharray: '3,3' }}
                        />
                      )}
                    </>
                  )}

                  {/* Render grid labels */}
                  {gridPolygons.map((poly) => {
                    const first = poly.points[0];
                    return (
                      <text key={poly.id} x={first[0] + 10} y={first[1] - 10} fill="#fff" fontSize="11" fontFamily="var(--font-mono)">
                        {poly.name} ({calculateGridArea(poly.points).toFixed(1)} ac)
                      </text>
                    );
                  })}

                  {/* Render Grid Markers */}
                  {gridMarkers.map((m) => {
                    let color = '#ffd700';
                    if (m.type === 'water') color = '#00f2fe';
                    if (m.type === 'firstaid') color = '#ff4500';
                    if (m.type === 'storage') color = '#00ff7f';

                    return (
                      <g key={m.id}>
                        <circle cx={m.x} cy={m.y} r={6} fill={color} stroke="#fff" strokeWidth={1} />
                        <text x={m.x + 10} y={m.y + 4} fill={color} fontSize="10" fontFamily="var(--font-mono)">
                          {m.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
