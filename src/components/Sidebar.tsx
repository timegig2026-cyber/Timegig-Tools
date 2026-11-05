import React, { useState } from 'react';
import {
  LocationCoords,
  GeolocationStatus,
  GeocodedAddress,
  Waypoint,
  TileProvider,
  MeasurePoint,
} from '../types/map';
import {
  TILE_PROVIDERS,
  PRESET_LOCATIONS,
  formatDistance,
  formatSpeed,
  exportToGeoJSON,
  downloadFile,
} from '../utils/geo';
import {
  Crosshair,
  Navigation,
  Layers,
  MapPin,
  Ruler,
  Radio,
  Copy,
  Check,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Map as MapIcon,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  userLocation: LocationCoords | null;
  geoStatus: GeolocationStatus;
  geoError: string | null;
  onLocateMe: () => void;
  followUser: boolean;
  onToggleFollowUser: () => void;
  onSimulateLocation: (lat: number, lon: number, name: string) => void;
  reverseAddress: GeocodedAddress | null;
  loadingAddress: boolean;

  waypoints: Waypoint[];
  onAddWaypoint: (wp: Omit<Waypoint, 'id' | 'createdAt'>) => void;
  onDeleteWaypoint: (id: string) => void;
  onSelectWaypoint: (wp: Waypoint) => void;

  tileProvider: TileProvider;
  onSelectTileProvider: (tp: TileProvider) => void;

  showTrack: boolean;
  onToggleShowTrack: () => void;
  onClearTrack: () => void;
  trackPointsCount: number;

  measurePoints: MeasurePoint[];
  onResetMeasure: () => void;
  isMeasureMode: boolean;
  onToggleMeasureMode: () => void;

  activeTab: 'telemetry' | 'waypoints' | 'layers' | 'measure';
  onSelectTab: (tab: 'telemetry' | 'waypoints' | 'layers' | 'measure') => void;

  isAddPinMode: boolean;
  onToggleAddPinMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userLocation,
  geoStatus,
  geoError,
  onLocateMe,
  followUser,
  onToggleFollowUser,
  onSimulateLocation,
  reverseAddress,
  loadingAddress,
  waypoints,
  onAddWaypoint,
  onDeleteWaypoint,
  onSelectWaypoint,
  tileProvider,
  onSelectTileProvider,
  showTrack,
  onToggleShowTrack,
  onClearTrack,
  trackPointsCount,
  measurePoints,
  onResetMeasure,
  isMeasureMode,
  onToggleMeasureMode,
  activeTab,
  onSelectTab,
  isAddPinMode,
  onToggleAddPinMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Form state for creating custom waypoint
  const [newPinName, setNewPinName] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<Waypoint['category']>('destination');
  const [newPinColor, setNewPinColor] = useState('#2563eb');
  const [newPinDesc, setNewPinDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCopyCoords = () => {
    if (!userLocation) return;
    const text = `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleCreateWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinName.trim()) return;

    // Default to user's location or center if no coords
    const lat = userLocation ? userLocation.latitude : 37.7749;
    const lon = userLocation ? userLocation.longitude : -122.4194;

    onAddWaypoint({
      name: newPinName.trim(),
      latitude: lat,
      longitude: lon,
      category: newPinCategory,
      color: newPinColor,
      description: newPinDesc.trim() || undefined,
    });

    setNewPinName('');
    setNewPinDesc('');
    setShowAddForm(false);
  };

  // Measure distance calculation
  let measureDistance = 0;
  if (measurePoints.length > 1) {
    for (let i = 0; i < measurePoints.length - 1; i++) {
      const p1 = measurePoints[i];
      const p2 = measurePoints[i + 1];
      // Simple Haversine
      const R = 6371e3;
      const phi1 = (p1.latitude * Math.PI) / 180;
      const phi2 = (p2.latitude * Math.PI) / 180;
      const deltaPhi = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const deltaLambda = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
      measureDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }

  return (
    <aside
      className={`relative z-20 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm ${
        isCollapsed ? 'w-16' : 'w-full md:w-84 lg:w-96'
      } shrink-0 h-[calc(100vh-57px)] overflow-hidden`}
    >
      {/* Collapse/Expand Toggle on edge */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:flex absolute -right-3.5 top-6 z-30 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-xs transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Tabs Row */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 px-2 py-2 gap-1 overflow-x-auto">
        <button
          onClick={() => {
            onSelectTab('telemetry');
            if (isCollapsed) setIsCollapsed(false);
          }}
          title="Live Tracking"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'telemetry'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Location</span>}
        </button>

        <button
          onClick={() => {
            onSelectTab('waypoints');
            if (isCollapsed) setIsCollapsed(false);
          }}
          title="Waypoints"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'waypoints'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {!isCollapsed && (
            <span>
              Pins <span className="text-[10px] text-slate-400 font-normal">({waypoints.length})</span>
            </span>
          )}
        </button>

        <button
          onClick={() => {
            onSelectTab('layers');
            if (isCollapsed) setIsCollapsed(false);
          }}
          title="Map Layers"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'layers'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Styles</span>}
        </button>

        <button
          onClick={() => {
            onSelectTab('measure');
            if (isCollapsed) setIsCollapsed(false);
          }}
          title="Measure Tool"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'measure'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Ruler</span>}
        </button>
      </div>

      {/* Main Tab Panel Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-800 dark:text-slate-200">
          {/* TAB 1: TELEMETRY & GPS LOCATION */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              {/* Primary Geolocation Action Strip */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onLocateMe}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>Locate Current Position</span>
                </button>
                <button
                  onClick={onToggleFollowUser}
                  title="Keep map centered on location as you move"
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    followUser
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Navigation className={`w-4 h-4 ${followUser ? 'text-blue-600' : ''}`} />
                  <span className="hidden sm:inline">Follow</span>
                </button>
              </div>

              {/* Status Alert if denied or unavailable */}
              {geoError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold mb-1">GPS Sensor Notice</p>
                  <p className="leading-relaxed">{geoError}</p>
                </div>
              )}

              {/* Telemetry Grid */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                  <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                    {geoStatus}
                  </span>
                </div>

                {userLocation ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Coordinates</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100 font-semibold">
                          {userLocation.latitude.toFixed(5)}°, {userLocation.longitude.toFixed(5)}°
                        </span>
                        <button
                          onClick={handleCopyCoords}
                          title="Copy lat/lon coordinates"
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                        >
                          {copiedCoords ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Accuracy</div>
                        <div className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          &plusmn;{Math.round(userLocation.accuracy)} m
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Speed</div>
                        <div className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {formatSpeed(userLocation.speed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Altitude</div>
                        <div className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {userLocation.altitude !== null ? `${Math.round(userLocation.altitude)} m` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Heading</div>
                        <div className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {userLocation.heading !== null ? `${Math.round(userLocation.heading)}°` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 italic py-1">
                    No active fix. Click "Locate Current Position" or select a preset location below.
                  </div>
                )}
              </div>

              {/* Reverse Geocoded Address Box */}
              {userLocation && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Geocoded Address (OSM Nominatim)
                  </div>
                  {loadingAddress ? (
                    <div className="text-xs text-slate-500 animate-pulse">Looking up street address...</div>
                  ) : reverseAddress ? (
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {reverseAddress.road || reverseAddress.suburb || reverseAddress.city}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {[reverseAddress.city, reverseAddress.state, reverseAddress.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Address details unavailable</div>
                  )}
                </div>
              )}

              {/* Quick Testing Presets */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Test Locations (Sandbox Simulation)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_LOCATIONS.map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => onSimulateLocation(loc.lat, loc.lon, loc.name)}
                      className="px-2.5 py-1.5 text-left text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200/60 dark:border-slate-700 transition-colors truncate"
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WAYPOINTS & MARKERS */}
          {activeTab === 'waypoints' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleAddPinMode}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    isAddPinMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>{isAddPinMode ? 'Click Map to Place' : 'Drop Pin on Map'}</span>
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {showAddForm ? 'Cancel' : 'New Form'}
                </button>
              </div>

              {/* Waypoint Creation Form */}
              {showAddForm && (
                <form
                  onSubmit={handleCreateWaypoint}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Marker Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newPinName}
                      onChange={(e) => setNewPinName(e.target.value)}
                      placeholder="e.g. Basecamp, Meeting Point"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Category
                      </label>
                      <select
                        value={newPinCategory}
                        onChange={(e) => setNewPinCategory(e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="destination">Destination</option>
                        <option value="checkpoint">Checkpoint</option>
                        <option value="poi">Point of Interest</option>
                        <option value="note">Note / Alert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Color
                      </label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewPinColor(color)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${
                              newPinColor === color ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={newPinDesc}
                      onChange={(e) => setNewPinDesc(e.target.value)}
                      placeholder="Special instructions or notes"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Save Waypoint
                  </button>
                </form>
              )}

              {/* Waypoint List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Saved Waypoints ({waypoints.length})</span>
                  {waypoints.length > 0 && (
                    <button
                      onClick={() => {
                        const geoJson = exportToGeoJSON(waypoints, []);
                        downloadFile('waypoints.geojson', geoJson);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Download className="w-3 h-3" /> GeoJSON
                    </button>
                  )}
                </div>

                {waypoints.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No waypoints placed yet. Click "Drop Pin on Map" or click anywhere on the map to add one.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {waypoints.map((wp) => (
                      <div
                        key={wp.id}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                      >
                        <button
                          onClick={() => onSelectWaypoint(wp)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          <div
                            className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: wp.color }}
                          >
                            {wp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {wp.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                              {wp.latitude.toFixed(4)}°, {wp.longitude.toFixed(4)}°
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => onDeleteWaypoint(wp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete waypoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MAP STYLES & LAYERS */}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  OpenStreetMap Tile Providers
                </span>
                <div className="space-y-2">
                  {TILE_PROVIDERS.map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => onSelectTileProvider(tp)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        tileProvider.id === tp.id
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{tp.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          100% Free · No API Key
                        </div>
                      </div>
                      {tileProvider.id === tp.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breadcrumb Trail Settings */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Location Breadcrumb Trail
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">Show Movement Trail</span>
                  <input
                    type="checkbox"
                    checked={showTrack}
                    onChange={onToggleShowTrack}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Recorded Coordinates:</span>
                  <span className="font-mono tabular-nums font-semibold">{trackPointsCount} pts</span>
                </div>
                {trackPointsCount > 0 && (
                  <button
                    onClick={onClearTrack}
                    className="w-full py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Clear Track History
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RULER MEASURE TOOL */}
          {activeTab === 'measure' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5">
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Geodesic Distance Ruler
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Click two or more points on the map to measure direct line-of-sight distance across
                  the Earth's curvature.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleMeasureMode}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    isMeasureMode
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Ruler className="w-4 h-4" />
                  <span>{isMeasureMode ? 'Measuring Active' : 'Start Measuring'}</span>
                </button>
                {measurePoints.length > 0 && (
                  <button
                    onClick={onResetMeasure}
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Measurement summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Distance</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatDistance(measureDistance)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {measurePoints.length} points plotted
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
