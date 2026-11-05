import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';



export const AuthView: React.FC = () => {
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('timegig_referral', ref);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const invitedBy = localStorage.getItem('timegig_referral') || null;

      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
        throw e;
      }

      if (!userDoc.exists()) {
        const isMainAccount = user.email === MAIN_ACCOUNT_EMAIL;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            userId: user.uid,
            email: user.email,
            planType: isMainAccount ? 'tenant' : 'user',
            isActivated: isMainAccount,
            invitedBy: isMainAccount ? null : invitedBy,
            createdAt: new Date().toISOString()
          });
          await setDoc(doc(db, 'settings', user.uid), {
            userId: user.uid,
            isSoundEnabled: true,
            isHudMinimized: false,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/settings/${user.uid}`);
          throw e;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignup && !acceptTerms) {
      setError('You must accept the terms and conditions to continue.');
      return;
    }

    setLoading(true);
    const sanitizedEmail = email.trim().toLowerCase();
    const invitedBy = localStorage.getItem('timegig_referral') || null;

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
        const user = userCredential.user;

        try {
          await setDoc(doc(db, 'users', user.uid), {
            userId: user.uid,
            email: user.email,
            planType: 'user',
            isActivated: false,
            invitedBy: invitedBy,
            createdAt: new Date().toISOString(),
            tenantCapacity: invitedBy ? 10 : 0,
            userCapacity: invitedBy ? 100 : 0,
            tenantSubSignups: 0,
            userSubSignups: 0
          });

          await setDoc(doc(db, 'settings', user.uid), {
            userId: user.uid,
            isSoundEnabled: true,
            isHudMinimized: false,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/settings/${user.uid}`);
          throw e;
        }

      } else {
        await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      }
    } catch (err: any) {
      const errorCode = err.code;
      switch (errorCode) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please sign in instead.');
          setIsSignup(false);
          break;
        case 'auth/invalid-credential':
          setError('Incorrect email or password.');
          break;
        default:
          setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 opacity-20 blur-md scale-105"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            TimeGiG
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isSignup ? 'Create account' : 'Welcome back'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-rose-900 dark:text-rose-200 leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-5 h-5" /></div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-5 h-5" /></div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="flex items-start gap-3 py-1">
              <div className="relative flex items-center pt-0.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-blue-600 checked:border-blue-600 transition-all"
                />
                <CheckCircle2 className="absolute left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
              </div>
              <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
                Accept <span className="text-blue-600 font-bold hover:underline">Terms</span> and <span className="text-blue-600 font-bold hover:underline">Privacy Policy</span>.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{isSignup ? 'Sign Up' : 'Sign In'}</span>}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        <div className="mt-8 text-center">
          <button onClick={() => setIsSignup(!isSignup)} className="text-xs text-slate-500 font-medium">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <span className="text-blue-600 font-bold hover:underline">{isSignup ? 'Log In' : 'Sign Up'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

