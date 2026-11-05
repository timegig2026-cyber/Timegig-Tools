export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude: number | null; // in meters
  altitudeAccuracy: number | null;
  heading: number | null; // 0 to 360 degrees
  speed: number | null; // m/s
  timestamp: number;
}

export interface GeocodedAddress {
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export type GeolocationStatus =
  | 'idle'
  | 'prompt'
  | 'locating'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'simulated';

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: 'destination' | 'checkpoint' | 'poi' | 'note';
  color: string;
  description?: string;
  createdAt: number;
}

export interface TileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  theme: 'light' | 'dark' | 'standard' | 'topo';
}

export interface MeasurePoint {
  latitude: number;
  longitude: number;
}
