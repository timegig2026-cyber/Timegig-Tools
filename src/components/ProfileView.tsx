import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';
import { 
  User, Settings, MapPin, Phone, CheckCircle2, Lock, Edit2, AlertCircle, Camera, Upload, Loader2, Save 
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: FirebaseUser;
  playClickSound: () => void;
  onOpenSettings: () => void;
}

interface LocationSuggestion {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  playClickSound,
  onOpenSettings,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [lastProfilePicUpdate, setLastProfilePicUpdate] = useState<number | null>(null);
  
  const [isLocked, setIsLocked] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Location Autocomplete state
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  // Load User Data from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setPhone(d.phone || '');
        setLocationName(d.locationName || '');
        setLocationQuery(d.locationName || '');
        if (d.locationCoords) {
          setLocationCoords(d.locationCoords);
        }
        setProfilePicUrl(d.profilePicUrl || null);
        setLastProfilePicUpdate(d.lastProfilePicUpdate || null);

        // If profile hasn't been set up yet, unlock by default for initial setup
        if (!d.firstName || !d.lastName || !d.phone) {
          setIsLocked(false);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`));

    return () => unsub();
  }, [currentUser?.uid]);

  // Handle Location Autocomplete Query
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.length < 3 || isLocked) {
      setSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.error('Location search error:', e);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [locationQuery, isLocked]);

  // Click outside listener for location dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationContainerRef.current && !locationContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (s: LocationSuggestion) => {
    const shortName = s.display_name.split(',').slice(0, 2).join(', ');
    setLocationName(shortName);
    setLocationQuery(shortName);
    setLocationCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
    setShowSuggestions(false);
  };

  // Check 30-Day limit for Profile Logo/Pic change
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const canChangeProfilePic = () => {
    if (!lastProfilePicUpdate) return true;
    return Date.now() - lastProfilePicUpdate >= THIRTY_DAYS_MS;
  };

  const daysUntilNextPicChange = () => {
    if (!lastProfilePicUpdate) return 0;
    const elapsed = Date.now() - lastProfilePicUpdate;
    const remaining = THIRTY_DAYS_MS - elapsed;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canChangeProfilePic()) {
      setErrorMessage(`Profile logo can only be changed once every month. Try again in ${daysUntilNextPicChange()} days.`);
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setProfilePicUrl(result);
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            userId: currentUser.uid,
            email: currentUser.email || '',
            profilePicUrl: result,
            lastProfilePicUpdate: Date.now(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          playClickSound();
          setErrorMessage(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMessage(null);

    if (!firstName.trim()) {
      setErrorMessage('First Name is required.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage('Surname is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Contact information (phone number) is required.');
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        userId: currentUser.uid,
        email: currentUser.email || '',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        locationName: locationName.trim() || locationQuery.trim(),
        locationCoords: locationCoords || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setIsLocked(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      setErrorMessage('Failed to save profile updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-4">
            {/* Profile Logo Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/40 overflow-hidden shadow-inner flex items-center justify-center">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/80" />
                )}
              </div>
              <label 
                className={`absolute bottom-0 right-0 p-1.5 rounded-full border shadow-md transition-all cursor-pointer ${
                  canChangeProfilePic() 
                    ? 'bg-white text-blue-600 hover:bg-slate-100 active:scale-95' 
                    : 'bg-slate-400 text-white cursor-not-allowed opacity-80'
                }`}
                title={canChangeProfilePic() ? 'Change Profile Picture' : `Available in ${daysUntilNextPicChange()} days`}
              >
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfilePicUpload} 
                  disabled={!canChangeProfilePic()} 
                  className="hidden" 
                />
              </label>
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight">
                {firstName || lastName ? `${firstName} ${lastName}` : currentUser.email?.split('@')[0]}
              </h2>
              <p className="text-xs text-blue-100">{currentUser.email}</p>
              {locationName && (
                <div className="flex items-center gap-1 text-[11px] text-blue-200 mt-1">
                  <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span className="truncate max-w-[200px]">{locationName}</span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => { playClickSound(); onOpenSettings(); }}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all active:scale-95 border border-white/20 shadow"
            title="Account Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Pic Monthly Lock Warning */}
        {!canChangeProfilePic() && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-amber-200 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-300/20">
            <span>Logo can only be changed once a month</span>
            <span className="font-bold text-amber-100">{daysUntilNextPicChange()}d left</span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-bold">Profile saved & locked successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Profile Details Form Card */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl border border-white/30 dark:border-slate-800 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            {isLocked ? <Lock className="w-5 h-5 text-emerald-600" /> : <Edit2 className="w-5 h-5 text-blue-600" />}
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isLocked ? 'Profile Details (Locked)' : 'Edit Profile Information'}
            </h3>
          </div>
          {isLocked ? (
            <button
              onClick={() => { playClickSound(); setIsLocked(false); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit Profile
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Editing Mode
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* First Name & Surname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Required"
                className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
                  isLocked 
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Surname <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Required"
                className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
                  isLocked 
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Contact Info (Phone) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Contact Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                disabled={isLocked}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
                  isLocked 
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Location Autocomplete Input */}
          <div ref={locationContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Set Location (Type & Select Suggestion)
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 absolute left-4 text-blue-500 pointer-events-none" />
              <input
                type="text"
                disabled={isLocked}
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setLocationName(e.target.value);
                  if (isLocked) setIsLocked(false);
                }}
                onFocus={() => {
                  if (suggestions.length > 0 && !isLocked) setShowSuggestions(true);
                }}
                placeholder="Type city or suburb name..."
                className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
                  isLocked 
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
                }`}
              />
              {isSearchingLocation && (
                <Loader2 className="w-4 h-4 absolute right-4 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {!isLocked && showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-tight">
                      {item.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          {!isLocked && (
            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Lock Profile</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
