import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, limit, addDoc
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

import { OperationType, handleFirestoreError } from './utils/firestoreDiagnostics';

import { SearchBox } from './components/SearchBox';
import { SplashScreen } from './components/SplashScreen';
import {
  LocationCoords,
  GeolocationStatus,
  Waypoint,
  TileProvider,
} from './types/map';
import { TILE_PROVIDERS } from './utils/geo';
import { 
  LogOut, Volume2, VolumeX, Settings, Building2, Users, Map as MapIcon, Search, User
} from 'lucide-react';

import { TenantView } from './components/TenantView';
import { ReferralsView } from './components/ReferralsView';
import { SeekersView } from './components/SeekersView';
import { ProfileView } from './components/ProfileView';

const MapView = lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const AuthView = lazy(() => import('./components/Auth').then(m => ({ default: m.AuthView })));

const DEFAULT_WAYPOINTS: Waypoint[] = [
  { id: 'wp-1', name: 'SF Ferry Building', latitude: 37.7955, longitude: -122.3937, category: 'poi', color: '#2563eb', description: 'Historic hub.', createdAt: Date.now() },
  { id: 'wp-2', name: 'Coit Tower', latitude: 37.8024, longitude: -122.4058, category: 'destination', color: '#16a34a', description: 'Vista point.', createdAt: Date.now() },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [tileProvider, setTileProvider] = useState<TileProvider>(TILE_PROVIDERS[0]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const [followUser, setFollowUser] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);
  const [waypoints] = useState<Waypoint[]>(DEFAULT_WAYPOINTS);
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [showTrack] = useState<boolean>(true);
  const [highlightLocation, setHighlightLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [pendingDestination, setPendingDestination] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<{ coordinates: [number, number][]; name: string; distanceKm: number; durationMins: number; arrivalTimeStr: string; } | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Profit and Referrals state
  const [referrals, setReferrals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seekers, setSeekers] = useState<any[]>([]);
  const [activeGig, setActiveGig] = useState<any>(null);
  const [hiringSeekerId, setHiringSeekerId] = useState<string | null>(null);
  const [tenantProfit, setTenantProfit] = useState(0);
  const [userProfit, setUserProfit] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    clickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    clickAudioRef.current.volume = 0.4;
    clickAudioRef.current.load();
  }, []);

  const playClickSound = () => {
    if (!isSoundEnabled || !clickAudioRef.current) return;
    try { clickAudioRef.current.currentTime = 0; clickAudioRef.current.play().catch(() => {}); } catch (e) {}
  };

  const handleIconClick = (view: string) => {
    playClickSound();
    if (view === 'gigs') {
      setActiveView(null);
    } else if (activeView === view) {
      setActiveView(null);
    } else {
      setActiveView(view);
    }
    setShowSettings(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { setCurrentUser(user); setIsAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    return onSnapshot(doc(db, 'settings', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setIsSoundEnabled(d.isSoundEnabled ?? true);
        setIsHudMinimized(d.isHudMinimized ?? false);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `settings/${currentUser.uid}`));
  }, [currentUser?.uid]);

  // Sync Referrals and Calculate Profit
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.email === 'timegig2026@gmail.com') {
      const qAll = collection(db, 'users');
      return onSnapshot(qAll, (snap) => {
        const allUsers = snap.docs.map(d => d.data());
        const userMap = new Map<string, any>();
        allUsers.forEach(u => userMap.set(u.userId, u));

        const routedReferrals = allUsers
          .filter((u: any) => {
            if (u.userId === currentUser.uid) return false;
            if (u.invitedBy === currentUser.uid) return true;
            if (!u.invitedBy) return true;
            const inviter = userMap.get(u.invitedBy);
            if (!inviter || inviter.planType === 'user') return true;
            return false;
          })
          .map((u: any) => {
            const inviter = u.invitedBy ? userMap.get(u.invitedBy) : null;
            return {
              ...u,
              inviterEmail: inviter?.email || null,
              inviterPlanType: inviter?.planType || 'user',
              isDirectTenantRef: u.invitedBy === currentUser.uid,
              isUserSubRef: inviter?.planType === 'user',
              isNoLinkRef: !u.invitedBy
            };
          });

        setReferrals(routedReferrals);

        let tProfit = 0;
        let uProfit = 0;
        routedReferrals.forEach((u: any) => {
          if (u.isActivated && u.referralStatus === 'approved') {
            if (u.planType === 'tenant') tProfit += 299.99;
            else uProfit += 29.99;
          }
        });
        setTenantProfit(tProfit);
        setUserProfit(uProfit);
        setTotalProfit(tProfit + uProfit);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users (admin referrals)'));
    } else {
      const q = query(collection(db, 'users'), where('invitedBy', '==', currentUser.uid));
      return onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => d.data());
        setReferrals(docs);
        
        let tProfit = 0;
        let uProfit = 0;
        docs.forEach((u: any) => {
          if (u.isActivated && u.referralStatus === 'approved') {
            if (u.planType === 'tenant') tProfit += 299.99;
            else uProfit += 29.99;
          }
        });
        setTenantProfit(tProfit);
        setUserProfit(uProfit);
        setTotalProfit(tProfit + uProfit);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users (referrals)'));
    }
  }, [currentUser?.uid, currentUser?.email]);

  // Sync Seekers (All activated users)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users'), where('isActivated', '==', true), limit(50));
    return onSnapshot(q, (snap) => setSeekers(snap.docs.map(d => d.data())), (err) => handleFirestoreError(err, OperationType.LIST, 'users (seekers)'));
  }, [currentUser]);

  const filteredSeekers = seekers.filter(s => 
    s.userId !== currentUser?.uid && 
    (s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const hireSeeker = async (seeker: any) => {
    if (!currentUser || !userLocation) return;
    playClickSound();
    setHiringSeekerId(seeker.userId);
    try {
      await addDoc(collection(db, 'gigs'), {
        ownerId: currentUser.uid,
        seekerId: seeker.userId,
        status: 'pending',
        destination: { lat: userLocation.latitude, lon: userLocation.longitude, name: 'Gig Start Point' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) { 
      handleFirestoreError(e, OperationType.CREATE, 'gigs');
      setHiringSeekerId(null); 
    }
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) return;
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition((p) => {
      const c = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, altitudeAccuracy: p.coords.altitudeAccuracy, heading: p.coords.heading, speed: p.coords.speed, timestamp: p.timestamp };
      setUserLocation(c); setGeoStatus('active'); setTrackPoints(prev => [...prev, [c.latitude, c.longitude]]);
    }, (e) => { 
      setGeoStatus('unavailable'); 
      if (!userLocation) {
        setUserLocation({ latitude: -33.9249, longitude: 18.4241, accuracy: 5000, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0, timestamp: Date.now() }); 
      }
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  };

  useEffect(() => { if (currentUser) requestLocation(); }, [currentUser]);

  useEffect(() => {
    if (followUser && currentUser && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition((p) => {
        const c = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, altitudeAccuracy: p.coords.altitudeAccuracy, heading: p.coords.heading, speed: p.coords.speed, timestamp: p.timestamp };
        setUserLocation(c); setGeoStatus('active');
        setTrackPoints(prev => { const last = prev[prev.length - 1]; if (!last || Math.abs(last[0] - c.latitude) > 0.0001 || Math.abs(last[1] - c.longitude) > 0.0001) return [...prev, [c.latitude, c.longitude]]; return prev; });
      }, (e) => console.warn(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 });
    } else if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [followUser, currentUser]);

  const handleLogout = () => { playClickSound(); auth.signOut(); };
  
  const handleRecenter = () => {
    if (userLocation) {
      setFollowUser(true);
      setHighlightLocation(null);
      setRecenterTrigger(prev => prev + 1);
    }
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (isAuthLoading) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!currentUser) return <Suspense fallback={null}><AuthView /></Suspense>;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden bg-slate-950 font-sans flex flex-col">
      <div className="relative flex-1 h-full w-full overflow-hidden">
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[130] w-[92%] sm:w-[480px] md:w-[540px] max-w-xl">
          {activeView !== 'tenant' && (
            activeView === 'referrals' || activeView === 'seekers' ? (
              <SearchBox placeholder={`Search ${activeView}...`} onSelectLocation={(_, __, name) => setSearchQuery(name)} className="w-full shadow-xl" />
            ) : (
              <SearchBox onSelectLocation={(lat, lon, name) => { setHighlightLocation({ lat, lon, name }); setPendingDestination({ lat, lon, name }); }} />
            )
          )}
        </div>

        {showSettings && (
          <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] right-4 z-40 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isSoundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span className="text-xs font-bold text-slate-900 dark:text-white">App Sounds</span>
              </div>
              <button onClick={async () => {
                const newVal = !isSoundEnabled;
                setIsSoundEnabled(newVal);
                try {
                  await updateDoc(doc(db, 'settings', currentUser.uid), { isSoundEnabled: newVal, updatedAt: serverTimestamp() });
                } catch (e) {}
                if (newVal) playClickSound();
              }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isSoundEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isSoundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <button onClick={handleLogout} className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" /> Log Out ({currentUser.email})
            </button>
          </div>
        )}

        {pendingDestination && (
          <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-md max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Start Navigation?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">Navigate to <strong className="text-blue-600 dark:text-blue-400">{pendingDestination.name}</strong>?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setPendingDestination(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Just View</button>
              <button onClick={async () => {
                if (!pendingDestination) return;
                try {
                  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation?.longitude || 18.4241},${userLocation?.latitude || -33.9249};${pendingDestination.lon},${pendingDestination.lat}?overview=full&geometries=geojson`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.routes?.[0]) {
                      const r = data.routes[0];
                      setNavigationRoute({ coordinates: r.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo] as [number, number]), name: pendingDestination.name, distanceKm: r.distance / 1000, durationMins: Math.round(r.duration / 60), arrivalTimeStr: new Date(Date.now() + r.duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
                    }
                  }
                } catch (e) {} finally { setPendingDestination(null); }
              }} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl">Start Navigation</button>
            </div>
          </div>
        )}

        {/* Feature Views Stack over Map Wallpaper */}
        {activeView && (
          <div className="absolute inset-0 z-30 bg-slate-950/40 dark:bg-slate-950/65 backdrop-blur-xl backdrop-saturate-150 flex flex-col pt-24 pb-20 overflow-y-auto animate-in fade-in duration-200">
            {activeView === 'tenant' && (
              <TenantView 
                totalProfit={totalProfit}
                tenantProfit={tenantProfit}
                userProfit={userProfit}
                currentUser={currentUser}
                referrals={referrals}
                playClickSound={playClickSound}
                onNavigateToReferrals={() => setActiveView('referrals')}
              />
            )}
            {activeView === 'referrals' && (
              <ReferralsView 
                referrals={referrals}
                searchQuery={searchQuery}
                currentUser={currentUser}
                activePlanType={'tenant'}
                playClickSound={playClickSound}
              />
            )}
            {activeView === 'seekers' && (
              <SeekersView 
                filteredSeekers={filteredSeekers}
                activeGig={activeGig}
                hiringSeekerId={hiringSeekerId}
                hireSeeker={hireSeeker}
                completeGig={() => {}}
                acceptGig={() => {}}
                setShowCancelDialog={() => {}}
              />
            )}
            {activeView === 'profile' && (
              <ProfileView 
                currentUser={currentUser}
                playClickSound={playClickSound}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}
          </div>
        )}

        <Suspense fallback={<div className="w-full h-full bg-slate-900 animate-pulse" />}>
          <MapView 
            userLocation={userLocation} 
            tileProvider={tileProvider} 
            onSelectTileProvider={setTileProvider} 
            followUser={followUser} 
            onToggleFollowUser={() => setFollowUser(!followUser)} 
            onRecenterUser={handleRecenter} 
            recenterTrigger={recenterTrigger}
            isHudMinimized={isHudMinimized}
            onToggleHud={async () => {
              const newVal = !isHudMinimized;
              setIsHudMinimized(newVal);
              if (currentUser) {
                try {
                  await updateDoc(doc(db, 'settings', currentUser.uid), { isHudMinimized: newVal, updatedAt: serverTimestamp() });
                } catch (e) {}
              }
            }}
            waypoints={waypoints} 
            trackPoints={trackPoints} 
            showTrack={showTrack} 
            highlightLocation={highlightLocation} 
            navigationRoute={navigationRoute} 
            onCancelNavigation={() => setNavigationRoute(null)} 
            playClickSound={playClickSound}
          />
        </Suspense>

        {/* Bottom Menu Bar */}
        <div className="absolute bottom-0 inset-x-0 z-[100] flex items-center justify-center px-4 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center justify-around w-full max-w-md px-1">
            <button onClick={() => handleIconClick('tenant')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'tenant' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
              <Building2 className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Tenant</span>
            </button>
            <button onClick={() => handleIconClick('referrals')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'referrals' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
              <Users className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Referrals</span>
            </button>
            <button onClick={() => handleIconClick('gigs')} className="flex flex-col items-center justify-center flex-1 transition-all group relative">
              <div className={`w-13 h-13 -mt-5 rounded-full flex items-center justify-center shadow-xl border-2 transition-all ${activeView === 'gigs' || activeView === null ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-blue-500/30' : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 hover:bg-blue-600'}`}>
                <MapIcon className="w-6 h-6" />
              </div>
              <span className={`text-[9px] font-bold uppercase mt-0.5 ${activeView === 'gigs' || activeView === null ? 'text-blue-600 font-extrabold' : 'text-black dark:text-white'}`}>GiGs`</span>
            </button>
            <button onClick={() => handleIconClick('seekers')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'seekers' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
              <Search className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Seekers</span>
            </button>
            <button onClick={() => handleIconClick('profile')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'profile' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
              <User className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
