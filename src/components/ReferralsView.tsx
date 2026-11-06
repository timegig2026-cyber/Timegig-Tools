import React, { useState, useEffect } from 'react';
import { Users, User, CheckCircle2, XCircle, ShieldAlert, Clock, Loader2, Lock, Unlock, Calendar, Info, X } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';

interface ReferralsViewProps {
  referrals: any[];
  searchQuery: string;
  currentUser: any;
  activePlanType?: 'tenant' | 'user';
  playClickSound?: () => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({ 
  referrals = [], 
  searchQuery = '', 
  currentUser,
  activePlanType = 'user',
  playClickSound
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [, setTick] = useState(0);

  // Periodic tick for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isTenant = activePlanType === 'tenant' || currentUser?.email === 'timegig2026@gmail.com';

  const handleUpdateStatus = async (referralUserId: string, status: 'approved' | 'rejected') => {
    if (playClickSound) playClickSound();
    setActionLoadingId(referralUserId);
    try {
      await updateDoc(doc(db, 'users', referralUserId), {
        referralStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${referralUserId}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleFreeze = async (referralUserId: string, currentFrozen: boolean) => {
    if (playClickSound) playClickSound();
    setActionLoadingId(referralUserId);
    try {
      await updateDoc(doc(db, 'users', referralUserId), {
        isFrozen: !currentFrozen,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${referralUserId}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const calculateCountdown = (createdAtStr: string, activatedAtVal: any) => {
    const startMs = activatedAtVal?.toMillis ? activatedAtVal.toMillis() : (activatedAtVal ? new Date(activatedAtVal).getTime() : (createdAtStr ? new Date(createdAtStr).getTime() : Date.now()));
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiryMs = startMs + thirtyDaysMs;
    const remainingMs = expiryMs - Date.now();

    if (remainingMs <= 0) return 'Expired';
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Filter referrals by search query
  const filtered = referrals.filter(r => 
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If user is not a Tenant, block access to referral management
  if (!isTenant) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-6">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl p-8 border border-white/30 dark:border-slate-800 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tenant Restricted Feature
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Only Tenant accounts can view, approve, and freeze referrals. Please upgrade to a Tenant Subscription (R299.99/mo) to unlock referral tracking and revenue earning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto w-full box-border">
      {/* Info Icon Floating Header */}
      <div className="flex justify-end mb-1">
        <div className="relative">
          <button 
            onClick={() => { if (playClickSound) playClickSound(); setShowInfoPopup(!showInfoPopup); }}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 text-white/60 transition-all cursor-pointer"
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfoPopup && (
            <>
              <div className="fixed inset-0 z-[140]" onClick={() => setShowInfoPopup(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs text-white/90 leading-relaxed z-[150] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Referral Tracking</p>
                  <button onClick={() => setShowInfoPopup(false)} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                Monitor all users who joined through your links. Approve verified signups to start earning commissions, or freeze accounts that are inactive or violating terms.
              </div>
            </>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-12 rounded-3xl border border-white/30 dark:border-slate-800 text-center text-slate-400 space-y-3 shadow-xl">
          <Users className="w-12 h-12 mx-auto opacity-30 text-blue-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Referrals Found</h3>
            <p className="text-xs text-slate-400 mt-1">Share your Tenant referral link to invite users.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => {
            const status = r.referralStatus || 'pending';
            const isFrozen = r.isFrozen || false;
            const isLoading = actionLoadingId === r.userId;
            const countdownStr = calculateCountdown(r.createdAt, r.activatedAt);
            const subType = r.planType === 'tenant' ? 'Tenant Sub (R299.99/mo)' : 'User Sub (R29.99/mo)';

            return (
              <div 
                key={r.userId || i} 
                className={`bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-4 sm:p-5 rounded-3xl border shadow-xl space-y-3 box-border transition-all ${
                  isFrozen ? 'border-rose-500/60 bg-rose-950/10' : 'border-white/30 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-blue-100 dark:border-slate-700 shrink-0 relative">
                    {r.profilePicUrl ? (
                      <img src={r.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-blue-500" />
                    )}
                    {isFrozen && (
                      <div className="absolute inset-0 bg-rose-950/70 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-rose-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {r.email}
                      </p>
                      {isFrozen && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[9px] font-black uppercase rounded-full border border-rose-300 shrink-0">
                          Frozen
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        {subType}
                      </span>
                      {/* Countdown Timer Badge */}
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Sub Expires in: {countdownStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {status === 'approved' && !isFrozen && (
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase rounded-full border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase rounded-full border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-500" /> Rejected
                      </span>
                    )}
                    {status === 'pending' && !isFrozen && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase rounded-full border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" /> Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tenant Controls (Approve, Reject, Freeze/Unfreeze) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tenant Management:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleToggleFreeze(r.userId, isFrozen)}
                      disabled={isLoading}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 ${
                        isFrozen 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />)}
                      <span>{isFrozen ? 'Unfreeze Account' : 'Freeze Account'}</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(r.userId, 'rejected')}
                      disabled={isLoading || status === 'rejected'}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800/80 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(r.userId, 'approved')}
                      disabled={isLoading || (status === 'approved' && !isFrozen)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
