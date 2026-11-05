import React, { useState } from 'react';
import { Users, User, CheckCircle2, XCircle, ShieldAlert, Clock, Loader2 } from 'lucide-react';
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
              Only Tenant accounts can view, approve, and reject referrals. Please upgrade to a Tenant Subscription (R299.99/mo) to unlock referral tracking and revenue earning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto">
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
            const isLoading = actionLoadingId === r.userId;

            return (
              <div 
                key={r.userId || i} 
                className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/30 dark:border-slate-800 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-blue-100 dark:border-slate-700 shrink-0">
                    {r.profilePicUrl ? (
                      <img src={r.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {r.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        {r.planType || 'user'} Sub
                      </span>
                      {r.isDirectTenantRef ? (
                        <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          Tenant Link
                        </span>
                      ) : r.isUserSubRef ? (
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800" title={r.inviterEmail ? `Referred by User Sub (${r.inviterEmail})` : 'Referred by User Sub link'}>
                          User Sub Link
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          Direct App
                        </span>
                      )}
                      {r.createdAt && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Joined {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {status === 'approved' && (
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase rounded-full border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase rounded-full border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-500" /> Rejected
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase rounded-full border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" /> Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tenant Approval Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tenant Decision:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(r.userId, 'rejected')}
                      disabled={isLoading || status === 'rejected'}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 hover:dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800/80 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(r.userId, 'approved')}
                      disabled={isLoading || status === 'approved'}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
