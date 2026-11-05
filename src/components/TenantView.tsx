import React, { useState } from 'react';
import { Wallet, Share2, Copy, Bell, Users, CheckCircle2, ChevronRight, X } from 'lucide-react';

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

  // New/Pending referral alerts
  const pendingAlerts = referrals.filter(r => !r.referralStatus || r.referralStatus === 'pending');
  const unreadCount = pendingAlerts.length;

  const handleToggleNotifications = () => {
    playClickSound();
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-xl mx-auto">
      {/* Top Banner Card with Notification Bell */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
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

          {/* Top Corner Notification Icon with Sound */}
          <div className="relative">
            <button 
              onClick={handleToggleNotifications}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl border border-white/20 relative shadow-md"
              title="Referral Alerts"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-blue-600 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold">Referral Notifications</h3>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {pendingAlerts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                    <p className="text-xs font-semibold">No pending referral alerts</p>
                    <p className="text-[10px]">New referral signups will notify you here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pendingAlerts.map((ref, idx) => (
                      <div key={idx} className="p-3 bg-blue-50/80 dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {ref.email}
                          </p>
                          <span className="text-[10px] text-blue-600 font-semibold uppercase">
                            New Signup ({ref.planType || 'User'} Sub)
                          </span>
                        </div>
                        {onNavigateToReferrals && (
                          <button 
                            onClick={() => {
                              playClickSound();
                              setShowNotifications(false);
                              onNavigateToReferrals();
                            }}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 shadow-sm shrink-0"
                          >
                            Review
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
