import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

import { MapView } from './components/MapView';
import { SearchBox } from './components/SearchBox';
import { SplashScreen } from './components/SplashScreen';
import { AuthView } from './components/Auth';
import { SubscriptionModal } from './components/SubscriptionModal';
import {
  LocationCoords,
  GeolocationStatus,
  Waypoint,
  TileProvider,
} from './types/map';
import { TILE_PROVIDERS } from './utils/geo';
import { 
  Zap, Building2, Users, Briefcase, Search, User, ChevronLeft, Settings, LogOut, Volume2, VolumeX 
} from 'lucide-react';

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
  // App Lifecycle States
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Functional States backed by Firebase
  const [tileProvider, setTileProvider] = useState<TileProvider>(TILE_PROVIDERS[0]);
  const [isActivated, setIsActivated] = useState(false);
  const [activePlanType, setActivePlanType] = useState<'tenant' | 'user'>('user');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHudMinimized, setIsHudMinimized] = useState(false);

  // UI States
  const [showSubModal, setShowSubModal] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Geolocation states
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);

  // Waypoints state
  const [waypoints] = useState<Waypoint[]>(DEFAULT_WAYPOINTS);
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [showTrack] = useState<boolean>(true);

  // Navigation states
  const [highlightLocation, setHighlightLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [pendingDestination, setPendingDestination] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<{
    coordinates: [number, number][];
    name: string;
    distanceKm: number;
    durationMins: number;
    arrivalTimeStr: string;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Sound effect helper
  const playClickSound = () => {
    if (!isSoundEnabled) return;
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      console.warn('Sound play failed');
    }
  };

  const handleIconClick = (view: string) => {
    playClickSound();
    setActiveView(view);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync - Users
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsActivated(data.isActivated || false);
        setActivePlanType(data.planType || 'user');
        setProfilePic(data.profilePicUrl || null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Firestore Sync - Settings
  useEffect(() => {
    if (!currentUser) return;

    const settingsDocRef = doc(db, 'settings', currentUser.uid);
    const unsubscribe = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsSoundEnabled(data.isSoundEnabled ?? true);
        setIsHudMinimized(data.isHudMinimized ?? false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Geolocation logic
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unavailable');
      setGeoError('HTML5 Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('locating');
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
        setGeoStatus('unavailable');
        setGeoError(error.message);
        if (!userLocation) {
          setUserLocation({
            latitude: 37.7749, longitude: -122.4194, accuracy: 25, altitude: 15, altitudeAccuracy: 5,
            heading: 45, speed: 1.4, timestamp: Date.now(),
          });
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (currentUser) requestLocation();
  }, [currentUser]);

  useEffect(() => {
    if (followUser && isActivated && currentUser && 'geolocation' in navigator) {
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
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
      );
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [followUser, isActivated, currentUser]);

  const handleRecenter = () => {
    if (userLocation) {
      setHighlightLocation({ lat: userLocation.latitude, lon: userLocation.longitude, name: 'Your Location' });
      setFollowUser(true);
    } else requestLocation();
  };

  const handleSelectSearchLocation = (lat: number, lon: number, name: string) => {
    setHighlightLocation({ lat, lon, name });
    setPendingDestination({ lat, lon, name });
  };

  const handleAcceptNavigation = async () => {
    if (!pendingDestination) return;
    const startLat = userLocation?.latitude || 37.7749;
    const startLon = userLocation?.longitude || -122.4194;
    setRouteLoading(true);
    setPendingDestination(null);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${pendingDestination.lon},${pendingDestination.lat}?overview=full&geometries=geojson`);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setNavigationRoute({
            coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]),
            name: pendingDestination.name,
            distanceKm: route.distance / 1000,
            durationMins: Math.round(route.duration / 60),
            arrivalTimeStr: new Date(Date.now() + route.duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          setRouteLoading(false);
          return;
        }
      }
    } catch (err) { console.warn(err); }
    setRouteLoading(false);
  };

  const handleLogout = () => {
    playClickSound();
    auth.signOut();
  };

  // Rendering conditions
  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (isAuthLoading) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!currentUser) return <AuthView />;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden bg-slate-950 font-sans flex flex-col">
      <div className="relative flex-1 h-full w-full overflow-hidden">
        {/* Floating Search Bar */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-[480px] md:w-[540px] max-w-xl">
          <SearchBox onSelectLocation={handleSelectSearchLocation} />
        </div>

        {/* Navigation Prompt */}
        {pendingDestination && (
          <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-md max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Start Navigation?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Navigate to <strong className="text-blue-600 dark:text-blue-400">{pendingDestination.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setPendingDestination(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Just View</button>
              <button onClick={handleAcceptNavigation} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl shadow-md">Start Navigation</button>
            </div>
          </div>
        )}

        {/* Activation Modal */}
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="relative w-full max-w-xl max-h-[min(90dvh,calc(100dvh-2rem))] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Choose Subscription Tier</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select a subscription plan to activate.</p>
                </div>
                <button onClick={() => setShowSubModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div onClick={() => { setActivePlanType('tenant'); setShowSubModal(false); setIsKycModalOpen(true); }} className="group cursor-pointer p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 hover:shadow-lg transition-all flex flex-col justify-between">
                    <div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Passive Income</span><h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-1">Tenant Sub</h3><p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">R299.99 / mo to earn passive monthly income.</p></div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Select Tenant Sub →</span>
                  </div>
                  <div onClick={() => { setActivePlanType('user'); setShowSubModal(false); setIsKycModalOpen(true); }} className="group cursor-pointer p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 hover:shadow-lg transition-all flex flex-col justify-between">
                    <div><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Account</span><h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-1">User Sub</h3><p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">R29.99 / mo to keep account active.</p></div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Select User Sub →</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex justify-end">
                <button onClick={() => setShowSubModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* KYC Modal */}
        <SubscriptionModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          planType={activePlanType}
          onSuccess={async (plan, picUrl) => {
            setIsKycModalOpen(false);
            import('./lib/firebase').then(async ({ db }) => {
              const { doc, updateDoc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'users', currentUser!.uid), {
                isActivated: true,
                planType: plan,
                profilePicUrl: picUrl || null
              });
            });
          }}
        />

        {/* Feature Views */}
        {activeView && (
          <div className="absolute inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col h-full w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 pt-[max(1rem,env(safe-area-inset-top,0px))]">
              <div className="flex items-center gap-3">
                <button onClick={() => { playClickSound(); if (showSettings) setShowSettings(false); else setActiveView(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{showSettings ? 'Settings' : activeView}</h2>
              </div>
              {!showSettings && activeView === 'profile' && (
                <button onClick={() => { playClickSound(); setShowSettings(true); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
              )}
              <button onClick={() => { playClickSound(); setActiveView(null); setShowSettings(false); }} className="text-xs font-bold text-blue-600 hover:text-blue-700">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {showSettings ? (
                <div className="p-6 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">{isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</div>
                        <div><p className="text-sm font-bold text-slate-900 dark:text-white">App Sounds</p><p className="text-xs text-slate-500">Enable sound effects on interaction</p></div>
                      </div>
                      <button onClick={async () => {
                        const newVal = !isSoundEnabled;
                        setIsSoundEnabled(newVal);
                        import('./lib/firebase').then(async ({ db }) => {
                          const { doc, updateDoc } = await import('firebase/firestore');
                          await updateDoc(doc(db, 'settings', currentUser!.uid), { isSoundEnabled: newVal, updatedAt: new Date().toISOString() });
                        });
                        if (newVal) playClickSound();
                      }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSoundEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSoundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <button onClick={handleLogout} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 text-rose-600"><div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30"><LogOut className="w-5 h-5" /></div><div><p className="text-sm font-bold">Log Out</p><p className="text-xs text-rose-500/70">Clear all data and exit</p></div></div>
                      <ChevronLeft className="w-4 h-4 rotate-180 text-rose-300" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 h-full">
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700 overflow-hidden border-2 border-slate-200 dark:border-slate-800">
                    {activeView === 'tenant' && <Building2 className="w-12 h-12" />}
                    {activeView === 'referrals' && <Users className="w-12 h-12" />}
                    {activeView === 'gigs' && <Briefcase className="w-12 h-12" />}
                    {activeView === 'seekers' && <Search className="w-12 h-12" />}
                    {activeView === 'profile' && (profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12" />)}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">Your {activeView} is Empty</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">There is currently no data or activity to display.</p>
                  </div>
                  <button onClick={() => { playClickSound(); setActiveView(null); }} className="px-8 py-3 bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Return to Live Map</button>
                </div>
              )}
            </div>
          </div>
        )}

        <MapView
          userLocation={userLocation} tileProvider={tileProvider} onSelectTileProvider={setTileProvider}
          followUser={followUser} onToggleFollowUser={() => setFollowUser(!followUser)}
          onRecenterUser={handleRecenter} waypoints={waypoints} trackPoints={trackPoints}
          showTrack={showTrack && isActivated} highlightLocation={highlightLocation}
          navigationRoute={navigationRoute} onCancelNavigation={() => setNavigationRoute(null)}
        />

        {/* Bottom Menu */}
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-2xl">
          {!isActivated ? (
            <button onClick={() => { playClickSound(); setShowSubModal(true); }} className="flex flex-col items-center gap-1 group transition-transform active:scale-95">
              <div className="p-2.5 rounded-2xl shadow-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all"><Zap className="w-5 h-5" /></div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Sensor Paused (Activate)</span>
            </button>
          ) : (
            <div className="flex items-center justify-around w-full max-w-md px-2 sm:px-4">
              {activePlanType === 'tenant' && (
                <>
                  <button onClick={() => handleIconClick('tenant')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'tenant' ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
                    <Building2 className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-tight">Tenant</span>
                  </button>
                  <button onClick={() => handleIconClick('referrals')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'referrals' ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
                    <Users className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-tight">Referrals</span>
                  </button>
                </>
              )}
              <button onClick={() => handleIconClick('gigs')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'gigs' ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
                <Briefcase className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-tight">GiGs</span>
              </button>
              <button onClick={() => handleIconClick('seekers')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'seekers' ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
                <Search className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-tight">Seekers</span>
              </button>
              <button onClick={() => handleIconClick('profile')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'profile' ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
                {profilePic ? (
                  <div className={`w-6 h-6 rounded-full overflow-hidden border ${activeView === 'profile' ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : <User className="w-5 h-5" />}
                <span className="text-[9px] font-bold uppercase tracking-tight">Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
