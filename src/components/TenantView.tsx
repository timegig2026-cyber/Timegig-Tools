import React, { useState, useEffect } from 'react';
import { Wallet, Share2, Copy, Bell, Users, CheckCircle2, ChevronRight, X, Trash2, CheckSquare, Square, ShieldAlert } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';

interface TenantViewProps {
  totalProfit: number;
  tenantProfit: number;
  userProfit: number;
  currentUser: any;
  referrals: any[];
  playClickSound: () => void;
  onNavigateToReferrals?: () => void;
}

export const TenantView: React.FC<TenantViewProps> = ({ 
  totalProfit, 
  tenantProfit, 
  userProfit, 
  currentUser, 
  referrals = [],
  playClickSound,
  onNavigateToReferrals
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync deleted notifications list from Firestore settings
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'settings', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.deletedNotifications)) {
          setDeletedIds(data.deletedNotifications);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `settings/${currentUser.uid}`));

    return () => unsub();
  }, [currentUser?.uid]);

  // Active referral notifications (excluding deleted ones)
  const activeAlerts = referrals.filter(r => {
    const id = r.userId || r.email;
    return !deletedIds.includes(id);
  });

  const unreadCount = activeAlerts.filter(r => !r.referralStatus || r.referralStatus === 'pending').length;

  const handleToggleNotifications = () => {
    playClickSound();
    setShowNotifications(!showNotifications);
  };

  const handleToggleSelect = (id: string) => {
    playClickSound();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    playClickSound();
    if (selectedIds.length === activeAlerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeAlerts.map(r => r.userId || r.email));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    playClickSound();

    const updatedDeleted = Array.from(new Set([...deletedIds, ...selectedIds]));
    setDeletedIds(updatedDeleted);
    setSelectedIds([]);

    try {
      await setDoc(doc(db, 'settings', currentUser.uid), {
        userId: currentUser.uid,
        deletedNotifications: updatedDeleted,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${currentUser.uid}`);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    playClickSound();
    const updatedDeleted = Array.from(new Set([...deletedIds, id]));
    setDeletedIds(updatedDeleted);
    setSelectedIds(selectedIds.filter(i => i !== id));

    try {
      await setDoc(doc(db, 'settings', currentUser.uid), {
        userId: currentUser.uid,
        deletedNotifications: updatedDeleted,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${currentUser.uid}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-xl mx-auto">
      {/* Top Banner Card with Notification Bell */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 z-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                Tenant Portal
              </span>
              <h2 className="text-sm font-bold text-white">Passive Revenue</h2>
            </div>
          </div>

          {/* Top Corner Notification Icon */}
          <button 
            onClick={handleToggleNotifications}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl border border-white/20 relative shadow-md cursor-pointer"
            title="Referral Alerts"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5.5 h-5.5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-blue-600 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <h3 className="text-3xl font-black">R{totalProfit.toFixed(2)}</h3>

        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">Tenant Subs</p>
            <p className="font-bold text-lg">R{tenantProfit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">User Subs</p>
            <p className="font-bold text-lg">R{userProfit.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN NOTIFICATION OVERLAY */}
      {showNotifications && (
        <div className="fixed inset-0 z-[120] bg-slate-950/40 dark:bg-slate-950/65 backdrop-blur-xl backdrop-saturate-150 flex flex-col p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Referral Notifications</h2>
                <p className="text-xs text-slate-400">
                  {activeAlerts.length} total alerts ({unreadCount} pending review)
                </p>
              </div>
            </div>

            <button 
              onClick={() => { playClickSound(); setShowNotifications(false); }}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-transform active:scale-95 shadow"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar (Select / Delete) */}
          {activeAlerts.length > 0 && (
            <div className="py-3 flex items-center justify-between gap-3 shrink-0 border-b border-white/10 text-xs">
              <button
                onClick={handleSelectAll}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/15 flex items-center gap-2 active:scale-95 transition-all"
              >
                {selectedIds.length === activeAlerts.length ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedIds.length === activeAlerts.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 text-white font-bold flex items-center gap-2 shadow-lg disabled:opacity-40 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          )}

          {/* Scrollable Notifications List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500/80" />
                <div>
                  <h3 className="text-base font-bold text-white">All Caught Up!</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    You have no referral notifications. New user signups under your link will appear here.
                  </p>
                </div>
              </div>
            ) : (
              activeAlerts.map((ref, idx) => {
                const id = ref.userId || ref.email || String(idx);
                const isSelected = selectedIds.includes(id);
                const status = ref.referralStatus || 'pending';

                return (
                  <div 
                    key={id}
                    onClick={() => handleToggleSelect(id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected 
                        ? 'bg-blue-900/40 border-blue-500 text-white shadow-xl' 
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-100'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0" onClick={(e) => { e.stopPropagation(); handleToggleSelect(id); }}>
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </div>

                    {/* Avatar / Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate text-white">{ref.email}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          status === 'approved' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        Joined via tenant link ({ref.planType || 'User'} Subscription)
                      </p>
                    </div>

                    {/* Quick Review / Delete Buttons */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onNavigateToReferrals && (
                        <button
                          onClick={() => {
                            playClickSound();
                            setShowNotifications(false);
                            onNavigateToReferrals();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSingle(id)}
                        className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-xl transition-colors border border-rose-500/30"
                        title="Delete Notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Share Link Card */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl border border-white/30 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tenant Referral Link</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Invite new users or tenants to earn commission</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
          <div className="flex-1 text-xs font-mono truncate text-slate-700 dark:text-slate-200">
            https://timegig.app?ref={currentUser.uid}
          </div>
          <button 
            onClick={() => { 
              playClickSound(); 
              navigator.clipboard.writeText(`https://timegig.app?ref=${currentUser.uid}`); 
            }} 
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-transform active:scale-95"
            title="Copy Link"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
