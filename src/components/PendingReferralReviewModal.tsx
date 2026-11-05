import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';
import { ShieldAlert, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface PendingReferralReviewModalProps {
  pendingReferrals: any[];
  playClickSound: () => void;
}

export const PendingReferralReviewModal: React.FC<PendingReferralReviewModalProps> = ({
  pendingReferrals = [],
  playClickSound,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (pendingReferrals.length === 0) return null;

  const handleUpdateStatus = async (referralUserId: string, status: 'approved' | 'rejected') => {
    playClickSound();
    setLoadingId(referralUserId);
    try {
      await updateDoc(doc(db, 'users', referralUserId), {
        referralStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${referralUserId}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90dvh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2 shrink-0">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Mandatory Referral Review
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2">
              Action Required Before Using App
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              You have <strong>{pendingReferrals.length}</strong> pending referral signup{pendingReferrals.length > 1 ? 's' : ''}. You must approve or reject all pending referrals to continue.
            </p>
          </div>
        </div>

        {/* Scrollable Pending Referrals List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {pendingReferrals.map((ref) => {
            const id = ref.userId;
            const isLoading = loadingId === id;

            return (
              <div 
                key={id}
                className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-blue-200 dark:border-slate-600">
                    {ref.profilePicUrl ? (
                      <img src={ref.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {ref.email}
                    </p>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                      Joined via link ({ref.planType || 'User'} Sub)
                    </span>
                  </div>
                </div>

                {/* Approve & Reject Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleUpdateStatus(id, 'rejected')}
                    disabled={isLoading}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 hover:dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(id, 'approved')}
                    disabled={isLoading}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
