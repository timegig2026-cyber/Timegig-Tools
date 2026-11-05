import React from 'react';
import { User, Loader2 } from 'lucide-react';

interface SeekersViewProps {
  filteredSeekers: any[];
  activeGig: any;
  hiringSeekerId: string | null;
  hireSeeker: (seeker: any) => void;
  completeGig: () => void;
  acceptGig: () => void;
  setShowCancelDialog: (show: boolean) => void;
}

export const SeekersView: React.FC<SeekersViewProps> = ({ 
  filteredSeekers, activeGig, hiringSeekerId, hireSeeker, completeGig, acceptGig, setShowCancelDialog 
}) => (
  <div className="p-6 space-y-4">
    {activeGig ? (
      <div className="bg-blue-600 rounded-3xl p-6 text-white space-y-6">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center animate-pulse"><Loader2 className="w-6 h-6" /></div><div><h3 className="text-lg font-bold">Active Gig Request</h3><p className="text-xs opacity-80">Waiting for response...</p></div></div>
        <div className="bg-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase opacity-70"><span>Status</span><span>{activeGig.status}</span></div>
          <div className="flex justify-between text-sm font-bold"><span>Point</span><span>{activeGig.destination.name}</span></div>
        </div>
        <div className="flex flex-col gap-2">
          {activeGig.status === 'accepted' && (
            <button onClick={completeGig} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg">Complete Gig</button>
          )}
          {activeGig.status === 'pending' && (
            <button onClick={acceptGig} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold shadow-lg">Accept Hiring Request</button>
          )}
          <button onClick={() => setShowCancelDialog(true)} className="w-full py-4 bg-white/20 text-white rounded-2xl font-bold border border-white/30">Cancel Gig</button>
        </div>
      </div>
    ) : (
      <>
        <div className="space-y-3">
          {filteredSeekers.map((s, i) => (
            <div key={i} className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-4 rounded-3xl border border-white/30 dark:border-slate-800 flex items-center gap-4 hover:shadow-2xl transition-shadow shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100">{s.profilePicUrl ? <img src={s.profilePicUrl} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-blue-400" />}</div>
              <div className="flex-1"><p className="text-sm font-bold text-slate-900">{s.email.split('@')[0]}</p><div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span>Hiring Ready</span></div></div>
              <button onClick={() => hireSeeker(s)} disabled={!!activeGig || hiringSeekerId === s.userId} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50 min-w-[80px] flex items-center justify-center">
                {hiringSeekerId === s.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hire'}
              </button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);
