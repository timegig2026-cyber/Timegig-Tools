import React, { useState, useEffect, useRef } from 'react';
import { MapView } from './components/MapView';
import { SearchBox } from './components/SearchBox';
import {
  LocationCoords,
  GeolocationStatus,
  Waypoint,
  TileProvider,
} from './types/map';
import { TILE_PROVIDERS } from './utils/geo';
import { Zap, Cpu, Building2, Users, Briefcase, Search, User, Share2, Map as MapIcon, ChevronLeft } from 'lucide-react';
import { SubscriptionModal } from './components/SubscriptionModal';

// Default initial waypoints for showcase
const DEFAULT_WAYPOINTS: Waypoint[] = [
  {
    id: 'wp-1',
    name: 'San Francisco Ferry Building',
    latitude: 37.7955,
    longitude: -122.3937,
    category: 'poi',
    color: '#2563eb',
    description: 'Historic transit hub and artisan marketplace on the Embarcadero.',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'wp-2',
    name: 'Coit Tower Viewpoint',
    latitude: 37.8024,
    longitude: -122.4058,
    category: 'destination',
    color: '#16a34a',
    description: 'Panoramic 360-degree vista overlooking the San Francisco Bay.',
    createdAt: Date.now() - 50000,
  },
];

export default function App() {
  const [tileProvider, setTileProvider] = useState<TileProvider>(TILE_PROVIDERS[0]); // Standard OSM

  // Geolocation states
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);

  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [activePlanType, setActivePlanType] = useState<'tenant' | 'user'>(() => {
    return (localStorage.getItem('timegig_plan_type') as 'tenant' | 'user') || 'tenant';
  });
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [profilePic, setProfilePic] = useState<string | null>(() => {
    return localStorage.getItem('timegig_profile_pic') || null;
  });
  const [isActivated, setIsActivated] = useState<boolean>(() => {
    return localStorage.getItem('timegig_activated') === 'true';
  });
  const [activeView, setActiveView] = useState<string | null>(null);

  // Waypoints state
  const [waypoints] = useState<Waypoint[]>(() => {
    const saved = localStorage.getItem('openmap_waypoints');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_WAYPOINTS;
      }
    }
    return DEFAULT_WAYPOINTS;
  });

  // Location track history
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [showTrack] = useState<boolean>(true);

  // Highlight location and navigation prompt state
  const [highlightLocation, setHighlightLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);

  const [pendingDestination, setPendingDestination] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);

  const [navigationRoute, setNavigationRoute] = useState<{
    coordinates: [number, number][];
    name: string;
    distanceKm: number;
    durationMins: number;
    arrivalTimeStr: string;
  } | null>(null);

  const [routeLoading, setRouteLoading] = useState<boolean>(false);

  const handleSelectSearchLocation = (lat: number, lon: number, name: string) => {
    setHighlightLocation({ lat, lon, name });
    setPendingDestination({ lat, lon, name });
  };

  const handleAcceptNavigation = async () => {
    if (!pendingDestination) return;
    const startLat = userLocation ? userLocation.latitude : 37.7749;
    const startLon = userLocation ? userLocation.longitude : -122.4194;
    const endLat = pendingDestination.lat;
    const endLon = pendingDestination.lon;

    setRouteLoading(true);
    setPendingDestination(null);

    try {
      // Query free OSRM public road router API
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceMeters = route.distance; // meters
          const durationSeconds = route.duration; // seconds
          const coords = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);

          const distanceKm = distanceMeters / 1000;
          const durationMins = Math.round(durationSeconds / 60);

          // Calculate arrival time
          const arrivalDate = new Date(Date.now() + durationSeconds * 1000);
          const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          setNavigationRoute({
            coordinates: coords,
            name: pendingDestination.name,
            distanceKm,
            durationMins,
            arrivalTimeStr,
          });
          setRouteLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('OSRM routing fallback to straight-line:', err);
    }

    // Fallback straight line if OSRM fails
    const distanceKm = 5.4;
    const durationMins = 12;
    const arrivalDate = new Date(Date.now() + durationMins * 60000);
    const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setNavigationRoute({
      coordinates: [
        [startLat, startLon],
        [endLat, endLon],
      ],
      name: pendingDestination.name,
      distanceKm,
      durationMins,
      arrivalTimeStr,
    });
    setRouteLoading(false);
  };

  const handleDeclineNavigation = () => {
    setPendingDestination(null);
  };

  // Trigger HTML5 Geolocation
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unavailable');
      setGeoError('HTML5 Geolocation is not supported by your browser.');
      return;
    }

    setGeoStatus('locating');
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };
        setUserLocation(coords);
        setGeoStatus('active');
        setTrackPoints((prev) => [...prev, [coords.latitude, coords.longitude]]);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setGeoStatus('unavailable');
        setGeoError(error.message || 'Unable to retrieve location.');

        if (!userLocation) {
          setUserLocation({
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 25,
            altitude: 15,
            altitudeAccuracy: 5,
            heading: 45,
            speed: 1.4,
            timestamp: Date.now(),
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Handle Live Tracking (watchPosition)
  useEffect(() => {
    if (followUser && isActivated && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: LocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          setUserLocation(coords);
          setGeoStatus('active');
          setTrackPoints((prev) => {
            const last = prev[prev.length - 1];
            if (!last || Math.abs(last[0] - coords.latitude) > 0.0001 || Math.abs(last[1] - coords.longitude) > 0.0001) {
              return [...prev, [coords.latitude, coords.longitude]];
            }
            return prev;
          });
        },
        (error) => {
          console.warn('WatchPosition error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
        }
      );
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [followUser, isActivated]);

  // Recenter map on user
  const handleRecenter = () => {
    if (userLocation) {
      setHighlightLocation({
        lat: userLocation.latitude,
        lon: userLocation.longitude,
        name: 'Your Location',
      });
      setFollowUser(true);
    } else {
      requestLocation();
    }
  };

  const handleToggleActivation = () => {
    setShowSubModal(true);
  };

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('timegig_activated', String(isActivated));
  }, [isActivated]);

  useEffect(() => {
    localStorage.setItem('timegig_plan_type', activePlanType);
  }, [activePlanType]);

  useEffect(() => {
    localStorage.setItem('timegig_follow_user', String(followUser));
  }, [followUser]);

  useEffect(() => {
    localStorage.setItem('timegig_tile_provider', tileProvider.id);
  }, [tileProvider]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden bg-slate-950 font-sans flex flex-col">
      <div className="relative flex-1 h-full w-full overflow-hidden">
        {/* Floating Search Bar at Top with Safe Area Spacing */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-[480px] md:w-[540px] max-w-xl">
          <SearchBox
            onSelectLocation={handleSelectSearchLocation}
          />
        </div>

        {/* Navigation Prompt Modal */}
        {pendingDestination && (
          <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-md max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Start Navigation?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Would you like to navigate from your current location to{' '}
              <strong className="text-blue-600 dark:text-blue-400">{pendingDestination.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleDeclineNavigation}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Just View
              </button>
              <button
                onClick={handleAcceptNavigation}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
              >
                Start Navigation
              </button>
            </div>
          </div>
        )}

        {/* Subscription Selection Modal - Fits screen without hiding corners */}
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="relative w-full max-w-xl max-h-[min(90dvh,calc(100dvh-2rem))] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Choose Subscription Tier
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select a subscription plan to activate.
                  </p>
                </div>
                <button
                  onClick={() => setShowSubModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tenant Sub Option */}
                  <div
                    onClick={() => {
                      setActivePlanType('tenant');
                      setShowSubModal(false);
                      setIsKycModalOpen(true);
                    }}
                    className="group cursor-pointer p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Passive Income
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-1">
                        Tenant Sub
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                        R299.99 / mo to earn passive monthly income from user subscriptions.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Select Tenant Sub →
                    </span>
                  </div>

                  {/* User Sub Option */}
                  <div
                    onClick={() => {
                      setActivePlanType('user');
                      setShowSubModal(false);
                      setIsKycModalOpen(true);
                    }}
                    className="group cursor-pointer p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Active Account
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-1">
                        User Sub
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                        R29.99 / mo to keep account active and access full features.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Select User Sub →
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex justify-end">
                <button
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KYC Verification & Document Upload Modal */}
        <SubscriptionModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          planType={activePlanType}
          onSuccess={(plan, picUrl) => {
            if (picUrl) {
              setProfilePic(picUrl);
              localStorage.setItem('timegig_profile_pic', picUrl);
            }
            setIsActivated(true);
            setActivePlanType(plan);
            localStorage.setItem('timegig_activated', 'true');
            localStorage.setItem('timegig_plan_type', plan);
            console.log('Subscription activated successfully for:', plan);
          }}
        />

        {/* Empty Content View for Activated Features */}
        {activeView && (
          <div className="absolute inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col h-full w-full animate-in fade-in duration-200">
            {/* Header for Empty View */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 pt-[max(1rem,env(safe-area-inset-top,0px))]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                  {activeView}
                </h2>
              </div>
              <button
                onClick={() => setActiveView(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Close
              </button>
            </div>

            {/* Empty Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700">
                {activeView === 'tenant' && <Building2 className="w-12 h-12" />}
                {activeView === 'referrals' && <Users className="w-12 h-12" />}
                {activeView === 'gigs' && <Briefcase className="w-12 h-12" />}
                {activeView === 'seekers' && <Search className="w-12 h-12" />}
                {activeView === 'profile' && <User className="w-12 h-12" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                  Your {activeView} is Empty
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  There is currently no data or activity to display in this section. Explore the map to find opportunities.
                </p>
              </div>
              <button
                onClick={() => setActiveView(null)}
                className="px-8 py-3 bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                Return to Live Map
              </button>
            </div>
          </div>
        )}

        <MapView
          userLocation={userLocation}
          tileProvider={tileProvider}
          onSelectTileProvider={setTileProvider}
          followUser={followUser}
          onToggleFollowUser={() => setFollowUser(!followUser)}
          onRecenterUser={handleRecenter}
          waypoints={waypoints}
          trackPoints={trackPoints}
          showTrack={showTrack && isActivated}
          highlightLocation={highlightLocation}
          navigationRoute={navigationRoute}
          onCancelNavigation={() => setNavigationRoute(null)}
        />

        {/* Pinned Bottom Menu Bar - Conditional Content Based on Activation */}
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-2xl">
          {!isActivated ? (
            <button
              onClick={handleToggleActivation}
              className="flex flex-col items-center gap-1 group transition-transform active:scale-95"
            >
              <div className="p-2.5 rounded-2xl shadow-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Sensor Paused (Activate)
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full max-w-md px-2 sm:px-4">
              <button
                onClick={() => setActiveView('tenant')}
                className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'tenant' ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">Tenant</span>
              </button>

              <button
                onClick={() => setActiveView('referrals')}
                className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'referrals' ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">Referrals</span>
              </button>

              <button
                onClick={() => setActiveView('gigs')}
                className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'gigs' ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Briefcase className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">GiGs</span>
              </button>

              <button
                onClick={() => setActiveView('seekers')}
                className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'seekers' ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Search className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">Seekers</span>
              </button>

              <button
                onClick={() => setActiveView('profile')}
                className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'profile' ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {profilePic ? (
                  <div className={`w-6 h-6 rounded-full overflow-hidden border ${activeView === 'profile' ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="text-[9px] font-bold uppercase tracking-tight">Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



