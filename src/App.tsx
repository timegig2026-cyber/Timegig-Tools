import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc, 
  serverTimestamp, orderBy, limit, or, and
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
  Zap, Building2, Users, Map as MapIcon, Search, User, ChevronLeft, Settings, LogOut, Volume2, VolumeX,
  TrendingUp, Wallet, Copy, Share2, DollarSign, Loader2, CheckCircle2, MapPin, X
} from 'lucide-react';

import { TenantView } from './components/TenantView';
import { ReferralsView } from './components/ReferralsView';
import { SeekersView } from './components/SeekersView';
import { ProfileView } from './components/ProfileView';
import { PendingReferralReviewModal } from './components/PendingReferralReviewModal';

const MapView = lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const AuthView = lazy(() => import('./components/Auth').then(m => ({ default: m.AuthView })));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })));

const DEFAULT_WAYPOINTS: Waypoint[] = [
  { id: 'wp-1', name: 'SF Ferry Building', latitude: 37.7955, longitude: -122.3937, category: 'poi', color: '#2563eb', description: 'Historic hub.', createdAt: Date.now() },
  { id: 'wp-2', name: 'Coit Tower', latitude: 37.8024, longitude: -122.4058, category: 'destination', color: '#16a34a', description: 'Vista point.', createdAt: Date.now() },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [tileProvider, setTileProvider] = useState<TileProvider>(TILE_PROVIDERS[0]);
  const [isActivated, setIsActivated] = useState(false);
  const [activePlanType, setActivePlanType] = useState<'tenant' | 'user'>('user');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash ? hash : null;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);
  const [waypoints] = useState<Waypoint[]>(DEFAULT_WAYPOINTS);
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [showTrack] = useState<boolean>(true);
  const [highlightLocation, setHighlightLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [pendingDestination, setPendingDestination] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<{ coordinates: [number, number][]; name: string; distanceKm: number; durationMins: number; arrivalTimeStr: string; } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // New features state
  const [referrals, setReferrals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seekers, setSeekers] = useState<any[]>([]);
  const [activeGig, setActiveGig] = useState<any>(null);
  const [hiringSeekerId, setHiringSeekerId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
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

  // Hash Router Navigation
  useEffect(() => {
    const handleHashChange = () => {
      const view = window.location.hash.replace('#', '') || null;
      setActiveView(view);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToView = (view: string | null) => {
    setActiveView(view);
    if (view) {
      window.location.hash = view;
    } else {
      if (window.location.hash) {
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    }
  };

  const handleIconClick = (view: string) => {
    playClickSound();
    if (view === 'gigs') {
      navigateToView(null);
    } else if (activeView === view) {
      navigateToView(null);
    } else {
      navigateToView(view);
    }
    setShowSettings(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { setCurrentUser(user); setIsAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    return onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const activated = d.isActivated || false;
        setIsActivated(activated);
        setActivePlanType(d.planType || 'user');
        setProfilePic(d.profilePicUrl || null);

        // Referrals / unactivated users MUST choose subscription first to use the app
        if (!activated && currentUser.email !== 'timegig2026@gmail.com') {
          setShowSubModal(true);
        }
      } else {
        if (currentUser.email !== 'timegig2026@gmail.com') {
          setShowSubModal(true);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`));
  }, [currentUser?.uid]);

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
      // Admin timegig2026@gmail.com receives:
      // 1. Direct referrals
      // 2. Referrals who joined without any tenant referral link
      // 3. Referrals invited by non-tenants (User Sub accounts)
      const qAll = collection(db, 'users');
      return onSnapshot(qAll, (snap) => {
        const allUsers = snap.docs.map(d => d.data());
        
        const userMap = new Map<string, any>();
        allUsers.forEach(u => userMap.set(u.userId, u));

        const routedReferrals = allUsers.filter(u => {
          if (u.userId === currentUser.uid) return false;
          if (!u.invitedBy) return true; // Joined without link
          if (u.invitedBy === currentUser.uid) return true; // Direct referral
          const inviter = userMap.get(u.invitedBy);
          if (!inviter || inviter.planType !== 'tenant') return true; // Invited by User Sub account
          return false;
        });

        setReferrals(routedReferrals);

        let tProfit = 0;
        let uProfit = 0;
        routedReferrals.forEach(u => {
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
      // Standard Tenant Account receives referrals directly invited by their link
      const q = query(collection(db, 'users'), where('invitedBy', '==', currentUser.uid));
      return onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => d.data());
        setReferrals(docs);
        
        let tProfit = 0;
        let uProfit = 0;
        docs.forEach(u => {
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

  const pendingReferralsToReview = (activePlanType === 'tenant' || currentUser?.email === 'timegig2026@gmail.com')
    ? referrals.filter(r => (!r.referralStatus || r.referralStatus === 'pending') && r.userId !== currentUser?.uid)
    : [];

  // Sync Active Gig
  useEffect(() => {
    if (!currentUser) return;
    
    let q = query(
      collection(db, 'gigs'), 
      and(
        or(
          where('ownerId', '==', currentUser.uid),
          where('seekerId', '==', currentUser.uid)
        ),
        where('status', 'in', ['pending', 'accepted'])
      )
    );
    q = query(q, limit(1));

    return onSnapshot(q, (snap) => {
      const active = snap.docs[0];
      if (active) {
        const gigData = { ...active.data(), id: active.id } as any;
        setActiveGig(gigData);
      } else {
        setActiveGig(null);
        if (activeView !== 'seekers') setNavigationRoute(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'gigs'));
  }, [currentUser?.uid, activeView]);

  // Update Navigation Metrics separately with debouncing and AbortController
  useEffect(() => {
    if (!activeGig || activeGig.status !== 'accepted' || !userLocation) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const dest = activeGig.destination;
      const origin = [userLocation.latitude, userLocation.longitude];
      
      fetch(`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest.lon},${dest.lat}?overview=full&geometries=geojson`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data.routes?.[0]) {
            const r = data.routes[0];
            setNavigationRoute({
              coordinates: r.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo] as [number, number]),
              name: `Gig: ${dest.name}`,
              distanceKm: r.distance / 1000,
              durationMins: Math.round(r.duration / 60),
              arrivalTimeStr: new Date(Date.now() + r.duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        })
        .catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Navigation recalc error:', e);
          }
        });
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeGig?.id, activeGig?.status, userLocation?.latitude, userLocation?.longitude]);

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

  const cancelGig = async () => {
    if (!activeGig || !cancelReason) return;
    playClickSound();
    try {
      await updateDoc(doc(db, 'gigs', activeGig.id), {
        status: 'cancelled',
        cancelReason,
        cancelledBy: currentUser?.uid,
        updatedAt: serverTimestamp()
      });
      setCancelReason('');
      setShowCancelDialog(false);
      setNavigationRoute(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `gigs/${activeGig.id}`);
    }
  };

  const completeGig = async () => {
    if (!activeGig || activeGig.ownerId !== currentUser?.uid) return;
    playClickSound();
    try {
      await updateDoc(doc(db, 'gigs', activeGig.id), { status: 'completed', updatedAt: serverTimestamp() });
      setNavigationRoute(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `gigs/${activeGig.id}`);
    }
  };

  const acceptGig = async () => {
    if (!activeGig) return;
    playClickSound();
    try {
      await updateDoc(doc(db, 'gigs', activeGig.id), { status: 'accepted', updatedAt: serverTimestamp() });
      navigateToView(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `gigs/${activeGig.id}`);
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
    if (followUser && isActivated && currentUser && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition((p) => {
        const c = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, altitudeAccuracy: p.coords.altitudeAccuracy, heading: p.coords.heading, speed: p.coords.speed, timestamp: p.timestamp };
        setUserLocation(c); setGeoStatus('active');
        setTrackPoints(prev => { const last = prev[prev.length - 1]; if (!last || Math.abs(last[0] - c.latitude) > 0.0001 || Math.abs(last[1] - c.longitude) > 0.0001) return [...prev, [c.latitude, c.longitude]]; return prev; });
      }, (e) => console.warn(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 });
    } else if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [followUser, isActivated, currentUser]);

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
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-[480px] md:w-[540px] max-w-xl">
          <SearchBox onSelectLocation={(lat, lon, name) => { setHighlightLocation({ lat, lon, name }); setPendingDestination({ lat, lon, name }); }} />
        </div>

        {pendingDestination && (
          <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4.25rem))] left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-md max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Start Navigation?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">Navigate to <strong className="text-blue-600 dark:text-blue-400">{pendingDestination.name}</strong>?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setPendingDestination(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">Just View</button>
              <button onClick={async () => {
                if (!pendingDestination) return;
                setRouteLoading(true); setPendingDestination(null);
                try {
                  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation?.longitude || 18.4241},${userLocation?.latitude || -33.9249};${pendingDestination.lon},${pendingDestination.lat}?overview=full&geometries=geojson`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.routes?.[0]) {
                      const r = data.routes[0];
                      setNavigationRoute({ coordinates: r.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo] as [number, number]), name: pendingDestination.name, distanceKm: r.distance / 1000, durationMins: Math.round(r.duration / 60), arrivalTimeStr: new Date(Date.now() + r.duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
                    }
                  }
                } catch (e) {} finally { setRouteLoading(false); }
              }} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl">Start Navigation</button>
            </div>
          </div>
        )}

        <PendingReferralReviewModal 
          pendingReferrals={pendingReferralsToReview} 
          playClickSound={playClickSound} 
        />

        {showSubModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Subscription Required</span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Choose Subscription First To Use App</h2>
                </div>
                {(isActivated || currentUser?.email === 'timegig2026@gmail.com') && (
                  <button onClick={() => setShowSubModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div onClick={() => { setActivePlanType('tenant'); setShowSubModal(false); setIsKycModalOpen(true); }} className="p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 cursor-pointer transition-all shadow-md active:scale-98">
                  <span className="font-extrabold text-blue-600 uppercase text-xs tracking-wider">Tenant Subscription</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">R299.99 / month</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Earn passive income, recruit referrals, manage user signups, and access all platform features.</p>
                </div>
                <div onClick={() => { setActivePlanType('user'); setShowSubModal(false); setIsKycModalOpen(true); }} className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 cursor-pointer transition-all shadow-md active:scale-98">
                  <span className="font-extrabold text-emerald-600 uppercase text-xs tracking-wider">User Subscription</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">R29.99 / month</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Active seeker account, live navigation, gig requests, and full app map access.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          <SubscriptionModal
            isOpen={isKycModalOpen}
            onClose={() => setIsKycModalOpen(false)}
            planType={activePlanType}
            onSuccess={async (plan, picUrl) => {
              setIsKycModalOpen(false);
              try {
                const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
                await updateDoc(doc(db, 'users', currentUser.uid), { 
                  isActivated: true, 
                  planType: plan, 
                  profilePicUrl: picUrl || null,
                  updatedAt: serverTimestamp()
                });
              } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
              }
            }}
          />
        </Suspense>

        {/* Persistent Router View Stack */}
        {activeView && (
          <div className={`absolute inset-x-0 top-0 z-30 bottom-[max(4.25rem,calc(env(safe-area-inset-bottom,0px)+3.75rem))] bg-slate-950/40 dark:bg-slate-950/65 backdrop-blur-xl backdrop-saturate-150 flex flex-col w-full animate-in fade-in duration-200 ${activeView === 'gigs' ? 'hidden' : ''}`}>
            {/* Floating Top Header Bar */}
            <div className="absolute top-[env(safe-area-inset-top,0px)] pt-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl">
              {activeView === 'referrals' || activeView === 'seekers' ? (
                <SearchBox 
                  placeholder={`Search ${activeView}...`} 
                  onSelectLocation={(_, __, name) => setSearchQuery(name)} 
                  className="w-full shadow-xl"
                />
              ) : (
                <div className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-slate-200">
                  <div className="flex-1 px-3 py-1 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">{showSettings ? 'Settings' : activeView}</h2>
                    {activeView === 'profile' && !showSettings && (
                      <button onClick={() => { playClickSound(); setShowSettings(true); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                        <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </button>
                    )}
                    {showSettings && (
                      <button onClick={() => { playClickSound(); setShowSettings(false); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Close
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Content Panels Container */}
            <div className="flex-1 overflow-y-auto pb-6 pt-20">
              {/* Settings Panel */}
              <div className={showSettings ? 'block p-6 space-y-6' : 'hidden'}>
                <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSoundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                      <div><p className="text-sm font-bold text-slate-900">App Sounds</p><p className="text-xs text-slate-500">Feedback on clicks</p></div>
                    </div>
                    <button onClick={async () => {
                      const newVal = !isSoundEnabled;
                      setIsSoundEnabled(newVal);
                      try {
                        await updateDoc(doc(db, 'settings', currentUser.uid), { isSoundEnabled: newVal, updatedAt: serverTimestamp() });
                      } catch (e) {
                        handleFirestoreError(e, OperationType.UPDATE, `settings/${currentUser.uid}`);
                      }
                      if (newVal) playClickSound();
                    }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSoundEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSoundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <button onClick={handleLogout} className="w-full p-5 flex items-center justify-between text-rose-600 hover:bg-rose-50/50 transition-colors rounded-b-3xl">
                    <div className="flex items-center gap-3"><LogOut className="w-5 h-5" /><div><p className="text-sm font-bold">Log Out</p><p className="text-xs opacity-70">Exit account</p></div></div>
                  </button>
                </div>
              </div>

              {/* Persistent Tenant View */}
              {!showSettings && (
                <div className={activeView === 'tenant' ? 'block' : 'hidden'}>
                  <TenantView 
                    totalProfit={totalProfit}
                    tenantProfit={tenantProfit}
                    userProfit={userProfit}
                    currentUser={currentUser}
                    referrals={referrals}
                    playClickSound={playClickSound}
                    onNavigateToReferrals={() => navigateToView('referrals')}
                  />
                </div>
              )}

              {/* Persistent Referrals View */}
              {!showSettings && (
                <div className={activeView === 'referrals' ? 'block' : 'hidden'}>
                  <ReferralsView 
                    referrals={referrals}
                    searchQuery={searchQuery}
                    currentUser={currentUser}
                    activePlanType={activePlanType}
                    playClickSound={playClickSound}
                  />
                </div>
              )}

              {/* Persistent Seekers View */}
              {!showSettings && (
                <div className={activeView === 'seekers' ? 'block' : 'hidden'}>
                  <SeekersView 
                    filteredSeekers={filteredSeekers}
                    activeGig={activeGig}
                    hiringSeekerId={hiringSeekerId}
                    hireSeeker={hireSeeker}
                    completeGig={completeGig}
                    acceptGig={acceptGig}
                    setShowCancelDialog={setShowCancelDialog}
                  />
                </div>
              )}

              {/* Persistent Profile View */}
              {!showSettings && (
                <div className={activeView === 'profile' ? 'block' : 'hidden'}>
                  <ProfileView 
                    currentUser={currentUser}
                    playClickSound={playClickSound}
                    onOpenSettings={() => setShowSettings(true)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {showCancelDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-900">Cancel Gig</h3>
              <p className="text-xs text-slate-500">Please provide a reason for cancelling this gig.</p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation..." className="w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:outline-none min-h-[100px]" />
              <div className="flex gap-3">
                <button onClick={() => setShowCancelDialog(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Back</button>
                <button onClick={cancelGig} disabled={!cancelReason} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">Confirm Cancel</button>
              </div>
            </div>
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
                } catch (e) {
                  handleFirestoreError(e, OperationType.UPDATE, `settings/${currentUser.uid}`);
                }
              }
            }}
            waypoints={waypoints} 
            trackPoints={trackPoints} 
            showTrack={showTrack && isActivated} 
            highlightLocation={highlightLocation} 
            navigationRoute={navigationRoute} 
            onCancelNavigation={() => setNavigationRoute(null)} 
          />
        </Suspense>

        {!showSubModal && !isKycModalOpen && (
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
                <span className={`text-[9px] font-bold uppercase mt-0.5 ${activeView === 'gigs' || activeView === null ? 'text-blue-600 font-extrabold' : 'text-black dark:text-white'}`}>GiGs</span>
              </button>
              <button onClick={() => handleIconClick('seekers')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'seekers' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
                <Search className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase">Seekers</span>
              </button>
              <button onClick={() => handleIconClick('profile')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeView === 'profile' ? 'text-blue-600 scale-110 font-extrabold' : 'text-black dark:text-white'}`}>
                {profilePic ? (
                  <div className={`w-6 h-6 rounded-full overflow-hidden border ${activeView === 'profile' ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
                    <img src={profilePic} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="text-[9px] font-bold uppercase">Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
