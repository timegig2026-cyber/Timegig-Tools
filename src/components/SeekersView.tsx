import React from 'react';
import { User, Loader2, Info, X, MessageSquare, CheckCircle2, XCircle } from 'lucide-react';

interface SeekersViewProps {
  filteredSeekers: any[];
  activeGig: any;
  hiringSeekerId: string | null;
  hireSeeker: (seeker: any) => void;
  completeGig: () => void;
  acceptGig: () => void;
  declineGig: () => void;
  setShowCancelDialog: (show: boolean) => void;
  onStartChat: (seeker: any) => void;
  currentUserId?: string;
}

export const SeekersView: React.FC<SeekersViewProps> = ({ 
  filteredSeekers, activeGig, hiringSeekerId, hireSeeker, completeGig, acceptGig, declineGig, setShowCancelDialog, onStartChat, currentUserId 
}) => {
  const [showInfoPopup, setShowInfoPopup] = React.useState(false);
  
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto w-full box-border">
      {/* Info Icon Floating Header */}
      <div className="flex justify-end mb-1">
        <div className="relative">
          <button 
            onClick={() => setShowInfoPopup(!showInfoPopup)}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 text-white/60 transition-all cursor-pointer"
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfoPopup && (
            <>
              <div className="fixed inset-0 z-[140]" onClick={() => setShowInfoPopup(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs text-white/90 leading-relaxed z-[150] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Service Seekers</p>
                  <button onClick={() => setShowInfoPopup(false)} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                Connect with skilled providers ready for hire. Browse the list, select a seeker to offer a gig, and track your active service requests in real-time.
              </div>
            </>
          )}
        </div>
      </div>
      {activeGig ? (
        <div className="bg-blue-600 rounded-3xl p-6 text-white space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center animate-pulse shrink-0">
              <Loader2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Active Gig Request</h3>
              <p className="text-xs opacity-80">Waiting for response...</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase opacity-70">
              <span>Status</span>
              <span>{activeGig.status}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Point</span>
              <span>{activeGig.destination.name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {activeGig.status === 'accepted' && activeGig.ownerId === currentUserId && (
              <button onClick={completeGig} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg">Complete Gig</button>
            )}
            {activeGig.status === 'accepted' && activeGig.seekerId === currentUserId && (
              <div className="p-4 bg-white/10 rounded-2xl text-center">
                <p className="text-xs font-bold uppercase text-blue-200 mb-2">Gig Accepted</p>
                <p className="text-sm">Please follow the map navigation to the destination.</p>
              </div>
            )}
            {activeGig.status === 'pending' && activeGig.seekerId === currentUserId && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={acceptGig} className="py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Accept
                </button>
                <button onClick={declineGig} className="py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" /> Decline
                </button>
              </div>
            )}
            {activeGig.status === 'pending' && activeGig.ownerId === currentUserId && (
              <button onClick={() => setShowCancelDialog(true)} className="w-full py-4 bg-white/20 text-white rounded-2xl font-bold border border-white/30">Cancel Request</button>
            )}
            {activeGig.status === 'accepted' && (
              <button onClick={() => setShowCancelDialog(true)} className="w-full py-3 bg-white/10 text-white/60 rounded-xl font-bold border border-white/10 text-xs">Cancel Gig</button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSeekers.length === 0 ? (
            <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-12 rounded-3xl border border-white/30 dark:border-slate-800 text-center text-slate-400 space-y-3 shadow-xl">
              <User className="w-12 h-12 mx-auto opacity-30 text-blue-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Seekers Found</h3>
                <p className="text-xs text-slate-400 mt-1">Activated seekers will appear here for hiring.</p>
              </div>
            </div>
          ) : (
            filteredSeekers.map((s, i) => (
              <div key={i} className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-4 rounded-3xl border border-white/30 dark:border-slate-800 flex items-center gap-4 hover:shadow-2xl transition-shadow shadow-xl box-border">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100 shrink-0">
                  {s.profilePicUrl ? <img src={s.profilePicUrl} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.email}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Hiring Ready</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => onStartChat(s)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all active:scale-95"
                    title="Message Seeker"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button onClick={() => hireSeeker(s)} disabled={!!activeGig || hiringSeekerId === s.userId} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50 min-w-[80px] flex items-center justify-center">
                    {hiringSeekerId === s.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hire'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
