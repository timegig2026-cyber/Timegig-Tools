import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationCoords, Waypoint, TileProvider } from '../types/map';
import { calculateDistance, formatDistance, TILE_PROVIDERS } from '../utils/geo';
import { Crosshair, Navigation, Plus, Minus, Layers, Info, X } from 'lucide-react';

interface MapViewProps {
  userLocation: LocationCoords | null;
  tileProvider: TileProvider;
  onSelectTileProvider: (tp: TileProvider) => void;
  followUser: boolean;
  onToggleFollowUser: () => void;
  onRecenterUser: () => void;
  waypoints: Waypoint[];
  trackPoints: [number, number][];
  showTrack: boolean;
  highlightLocation: { lat: number; lon: number; name: string } | null;
  navigationRoute: {
    coordinates: [number, number][];
    name: string;
    distanceKm: number;
    durationMins: number;
    arrivalTimeStr: string;
  } | null;
  recenterTrigger: number;
  isHudMinimized: boolean;
  onToggleHud: () => void;
  onCancelNavigation: () => void;
  playClickSound?: () => void;
  userProfilePic?: string | null;
  otherUsers?: any[];
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  tileProvider,
  onSelectTileProvider,
  followUser,
  onToggleFollowUser,
  onRecenterUser,
  waypoints,
  trackPoints,
  showTrack,
  highlightLocation,
  navigationRoute,
  recenterTrigger,
  isHudMinimized,
  onToggleHud,
  onCancelNavigation,
  playClickSound,
  userProfilePic,
  otherUsers = [],
}) => {
  const [showInfoPopup, setShowInfoPopup] = React.useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const waypointsLayerRef = useRef<L.LayerGroup | null>(null);
  const otherUsersLayerRef = useRef<L.LayerGroup | null>(null);
  const trackLineRef = useRef<L.Polyline | null>(null);
  const highlightMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userLocation ? userLocation.latitude : -33.9249;
    const initialLon = userLocation ? userLocation.longitude : 18.4241;
    const initialZoom = userLocation ? 15 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Initial tile layer (no attribution)
    const tileLayer = L.tileLayer(tileProvider.url, {
      attribution: '',
      maxZoom: tileProvider.maxZoom,
      subdomains: tileProvider.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for markers
    waypointsLayerRef.current = L.layerGroup().addTo(map);
    otherUsersLayerRef.current = L.layerGroup().addTo(map);

    // Track line
    trackLineRef.current = L.polyline([], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8,
      dashArray: '6, 6',
    }).addTo(map);

    mapInstanceRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when tileProvider changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(tileProvider.url, {
      attribution: '',
      maxZoom: tileProvider.maxZoom,
      subdomains: tileProvider.subdomains || ['a', 'b', 'c'],
    }).addTo(map);
  }, [tileProvider]);

  // Update User Location Marker and Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const latLng: [number, number] = [userLocation.latitude, userLocation.longitude];

    const headingDegree = userLocation.heading !== null ? userLocation.heading : 0;
    const hasHeading = userLocation.heading !== null && userLocation.heading !== undefined;

    const userIcon = L.divIcon({
      className: 'custom-user-marker-icon',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 user-location-beacon"></div>
          <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-lg overflow-hidden flex items-center justify-center bg-blue-600">
            ${
              userProfilePic 
                ? `<img src="${userProfilePic}" class="w-full h-full object-cover" />`
                : hasHeading
                ? `<div style="transform: rotate(${headingDegree}deg); width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 6px solid white;"></div>`
                : `<div class="w-2 h-2 rounded-full bg-white"></div>`
            }
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker(latLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarkerRef.current.bindPopup(
        `<div class="p-3 text-xs text-slate-800">
          <p class="font-bold text-sm text-blue-600 mb-1">Your Live Location</p>
          <p><strong>Lat:</strong> ${userLocation.latitude.toFixed(6)}</p>
          <p><strong>Lon:</strong> ${userLocation.longitude.toFixed(6)}</p>
          <p><strong>Accuracy:</strong> &plusmn;${Math.round(userLocation.accuracy)} m</p>
        </div>`
      );
    }

    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.setLatLng(latLng);
      userAccuracyCircleRef.current.setRadius(userLocation.accuracy);
    } else {
      userAccuracyCircleRef.current = L.circle(latLng, {
        radius: userLocation.accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
    }

    if (followUser) {
      map.panTo(latLng, { animate: true, duration: 0.8 });
    }
  }, [userLocation, followUser]);

  // Update Track Points
  useEffect(() => {
    if (!trackLineRef.current) return;
    if (showTrack && trackPoints.length > 0) {
      trackLineRef.current.setLatLngs(trackPoints);
    } else {
      trackLineRef.current.setLatLngs([]);
    }
  }, [trackPoints, showTrack]);

  // Update Waypoints
  useEffect(() => {
    const layer = waypointsLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    waypoints.forEach((wp) => {
      const pinIcon = L.divIcon({
        className: 'custom-waypoint-icon',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
            <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110" style="background-color: ${wp.color};">
              ${wp.name.charAt(0).toUpperCase()}
            </div>
            <div class="w-1.5 h-2 -mt-0.5" style="border-left: 3px solid transparent; border-right: 3px solid transparent; border-top: 6px solid ${wp.color};"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([wp.latitude, wp.longitude], { icon: pinIcon }).addTo(layer);

      const dist = userLocation
        ? calculateDistance(userLocation.latitude, userLocation.longitude, wp.latitude, wp.longitude)
        : null;

      const popupContent = `
        <div class="p-3.5 text-xs text-slate-800 dark:text-slate-100 min-w-[200px]">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="font-bold text-sm text-slate-900 dark:text-white">${wp.name}</span>
            <span class="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">${wp.category}</span>
          </div>
          ${wp.description ? `<p class="text-slate-600 dark:text-slate-300 text-xs mb-2">${wp.description}</p>` : ''}
          <div class="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
            <div>${wp.latitude.toFixed(5)}°, ${wp.longitude.toFixed(5)}°</div>
            ${dist !== null ? `<div class="font-semibold text-blue-600 dark:text-blue-400">${formatDistance(dist)} away</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });
  }, [waypoints, userLocation]);

  // Update Other Users on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = otherUsersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    otherUsers.forEach((u) => {
      // Don't show current user again (they have a special persistent marker)
      // and only show users with valid coordinates
      if (!u.locationCoords || !u.locationCoords.lat || !u.locationCoords.lon) return;

      const userIcon = L.divIcon({
        className: 'other-user-marker',
        html: `
          <div class="relative flex flex-col items-center" style="transform: translate(-50%, -50%);">
            <div class="w-10 h-10 rounded-full border-2 border-emerald-500 shadow-xl overflow-hidden bg-slate-900 flex items-center justify-center">
              ${u.profilePicUrl ? `<img src="${u.profilePicUrl}" class="w-full h-full object-cover" />` : `<div class="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">${u.email.charAt(0).toUpperCase()}</div>`}
            </div>
            <div class="mt-1 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-md rounded-md border border-white/10 text-[8px] font-black text-white truncate max-w-[64px]">
              ${u.email.split('@')[0]}
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([u.locationCoords.lat, u.locationCoords.lon], { icon: userIcon }).addTo(layer);
      marker.bindPopup(`
        <div class="p-2 text-xs font-bold text-slate-800">
          <p class="text-blue-600">${u.email}</p>
          <p class="text-[10px] text-slate-500 mt-0.5 font-normal">Active Provider</p>
        </div>
      `);
    });
  }, [otherUsers]);

  // Update Navigation Route Line & HUD
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (navigationRoute && navigationRoute.coordinates.length > 0) {
      const polyline = L.polyline(navigationRoute.coordinates, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routeLineRef.current = polyline;

      // Fit bounds to route
      map.fitBounds(polyline.getBounds(), { padding: [80, 80], maxZoom: 16 });
    }
  }, [navigationRoute]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const isSatellite = tileProvider.id === 'esri-satellite';

  const toggleSatellite = () => {
    if (isSatellite) {
      onSelectTileProvider(TILE_PROVIDERS[0]); // Standard OSM
    } else {
      onSelectTileProvider(TILE_PROVIDERS[1]); // Esri Satellite
    }
  };

  const lastProcessedTriggerRef = useRef<number>(0);

  // Handle Recenter Trigger
  useEffect(() => {
    if (recenterTrigger > lastProcessedTriggerRef.current && mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 15, { animate: true });
      lastProcessedTriggerRef.current = recenterTrigger;
    }
  }, [recenterTrigger, userLocation]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Leaflet Mount Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Active Navigation HUD Card */}
      {navigationRoute && (
        <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] left-3 sm:left-4 right-3 sm:right-auto sm:w-96 max-w-sm bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-4 z-30 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Live Road Navigation
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleHud}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
              >
                {isHudMinimized ? 'Expand' : 'Hide Box'}
              </button>
              <button
                onClick={onCancelNavigation}
                className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2"
              >
                End Trip
              </button>
            </div>
          </div>
          <p className="text-sm font-bold text-white mb-2 truncate">
            {navigationRoute.name}
          </p>
          {!isHudMinimized && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-center animate-in fade-in">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Distance</div>
                <div className="text-lg font-bold font-mono text-blue-400">
                  {navigationRoute.distanceKm.toFixed(1)} km
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Arrival ETA</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {navigationRoute.arrivalTimeStr} <span className="text-xs font-normal">({navigationRoute.durationMins}m)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bubble Control Cluster: Zoom (+/-), Satellite Toggle, Location, Arrow attached together */}
      <div className="absolute bottom-[max(5.25rem,calc(env(safe-area-inset-bottom,0px)+4.75rem))] right-3 sm:right-6 z-20 flex flex-col gap-1.5 sm:gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800">
        {/* Zoom In Bubble */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Info Icon Bubble */}
        <div className="relative">
          <button
            onClick={() => { if (playClickSound) playClickSound(); setShowInfoPopup(!showInfoPopup); }}
            title="Feature Information"
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shadow-xs transition-all cursor-pointer"
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfoPopup && (
            <>
              <div className="fixed inset-0 z-[140]" onClick={() => setShowInfoPopup(false)} />
              <div className="absolute right-full mr-3 top-0 w-64 max-w-[70vw] p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs text-white/90 leading-relaxed z-[150] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">GiGs Map</p>
                  <button onClick={() => setShowInfoPopup(false)} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                Explore available gigs and service providers in your area. Use the map to navigate, track your location, and find nearby opportunities.
              </div>
            </>
          )}
        </div>

        {/* Zoom Out Bubble */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shadow-xs transition-transform active:scale-95"
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Satellite View Toggle Bubble */}
        <button
          onClick={toggleSatellite}
          title={isSatellite ? 'Switch to Standard Map View' : 'Switch to Satellite View'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-all active:scale-95 ${
            isSatellite
              ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-5 h-5" />
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

        {/* Location Bubble */}
        <button
          onClick={onRecenterUser}
          title="Recenter on your location"
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shadow-xs transition-transform active:scale-95"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Arrow / Tracking Bubble */}
        <button
          onClick={onToggleFollowUser}
          title={followUser ? 'Live Tracking is ON (auto-follow)' : 'Follow User Location'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-all active:scale-95 ${
            followUser
              ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Navigation className={`w-5 h-5 ${followUser ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  );
};
