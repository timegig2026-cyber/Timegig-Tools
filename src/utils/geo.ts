import { TileProvider, Waypoint } from '../types/map';

/**
 * Free, open tile providers requiring NO API key or billing
 */
export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    theme: 'standard',
  },
  {
    id: 'esri-satellite',
    name: 'Satellite Imagery (Esri World Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
    theme: 'dark',
  },
  {
    id: 'carto-light',
    name: 'CartoDB Positron (Clean Light)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
    theme: 'light',
  },
  {
    id: 'carto-dark',
    name: 'CartoDB Dark Matter (High Contrast Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
    theme: 'dark',
  },
  {
    id: 'carto-voyager',
    name: 'CartoDB Voyager (Vibrant Navigation)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
    theme: 'standard',
  },
  {
    id: 'opentopomap',
    name: 'OpenTopoMap (Topographic Contours)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
    theme: 'topo',
  },
];

/**
 * Calculates geodesic distance between two coordinates in meters via Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Human-friendly distance formatting (e.g. "840 m" or "14.25 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Human-friendly speed formatting from m/s to km/h and mph
 */
export function formatSpeed(mps: number | null): string {
  if (mps === null || mps === undefined || isNaN(mps)) return '0.0 km/h';
  const kmh = mps * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Formats coordinates for display (e.g. 37.7749° N, 122.4194° W)
 */
export function formatCoordinatePair(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

/**
 * Preset locations for testing without GPS / sandbox simulation
 */
export const PRESET_LOCATIONS = [
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Berlin, Germany', lat: 52.52, lon: 13.405 },
];

/**
 * Export waypoints and track path as GeoJSON
 */
export function exportToGeoJSON(waypoints: Waypoint[], trackPoints: [number, number][]): string {
  const features: any[] = [];

  // Add waypoints
  waypoints.forEach((wp) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [wp.longitude, wp.latitude],
      },
      properties: {
        name: wp.name,
        category: wp.category,
        color: wp.color,
        description: wp.description || '',
        createdAt: new Date(wp.createdAt).toISOString(),
      },
    });
  });

  // Add track line if points exist
  if (trackPoints.length > 1) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: trackPoints.map(([lat, lon]) => [lon, lat]),
      },
      properties: {
        name: 'User Location Track',
        recordedAt: new Date().toISOString(),
      },
    });
  }

  const geoJson = {
    type: 'FeatureCollection',
    features,
  };

  return JSON.stringify(geoJson, null, 2);
}

/**
 * Downloads a text content as a file
 */
export function downloadFile(filename: string, content: string, contentType: string = 'application/json') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
