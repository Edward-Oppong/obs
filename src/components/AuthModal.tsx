import React, { useState } from 'react';
import {
  signInWithPopup,
  auth,
  googleProvider,
  isEmailAllowed,
  signInWithEmailOnly,
} from '../firebase';
import {
  ShieldCheck,
  Mail,
  LogIn,
  AlertCircle,
  Stethoscope,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { INITIAL_TEAM_ROSTER } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  allowedEmails?: string[];
  deniedEmail?: string | null;
  onClearDenied?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  allowedEmails = [],
  deniedEmail,
  onClearDenied,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTeammateEmail, setActiveTeammateEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  // Google SSO Sign-in
  const handleGoogleSignIn = async () => {
    setError(null);
    if (onClearDenied) onClearDenied();
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userEmail = res.user.email?.toLowerCase().trim();
      if (!isEmailAllowed(userEmail, allowedEmails)) {
        setError(
          `Access restricted: The Google account "${userEmail}" is not in the Ob/Gyn internship 9-member allowlist. Please select your approved email from the roster below.`
        );
      } else {
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use the passwordless Email sign-in below.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try passwordless email sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Passwordless Email Sign-in (requires only email, no password)
  const handleEmailAuth = async (e?: React.FormEvent, directEmail?: string, directName?: string) => {
    if (e) e.preventDefault();
    setError(null);
    if (onClearDenied) onClearDenied();

    const targetEmail = (directEmail || email).toLowerCase().trim();

    if (!targetEmail) {
      setError('Please enter your internship email.');
      return;
    }

    if (!isEmailAllowed(targetEmail, allowedEmails)) {
      setError(
        `Email "${targetEmail}" is not recognized in the 9-person internship allowlist. Please choose your profile from the roster below or use an approved team email.`
      );
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailOnly(targetEmail, directName || name);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Passwordless Sign-In Error:', err);
      setError(err.message || 'Failed to sign in. Please verify your internet connection or email.');
    } finally {
      setLoading(false);
      setActiveTeammateEmail(null);
    }
  };

  // Instant 1-click sign in by picking a teammate from the roster
  const handleQuickSignIn = (teammate: typeof INITIAL_TEAM_ROSTER[0]) => {
    setEmail(teammate.email);
    setName(teammate.name);
    setActiveTeammateEmail(teammate.email);
    handleEmailAuth(undefined, teammate.email, teammate.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-indigo-700 p-6 text-white text-center relative">
          <div className="inline-flex p-3 bg-white/15 rounded-2xl backdrop-blur-xs mb-3 shadow-inner">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Ob/Gyn Shadowing Observation Log</h2>
          <p className="text-xs text-sky-100 mt-1">
            Clinical Internship Team Portal • 9 Students • Groups A–E
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-black/25 rounded-full text-xs font-semibold text-emerald-200 border border-emerald-400/20 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Passwordless Email Sign-In</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {(error || deniedEmail) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>{error || `Account ${deniedEmail} is not authorized in the team allowlist.`}</div>
            </div>
          )}

          {/* Quick 1-Click Roster Sign-In Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>1-Click Sign In via Team Roster:</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">9 Interns</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Click your name below to sign in instantly without typing anything:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {INITIAL_TEAM_ROSTER.map((teammate) => {
                const isSelected = activeTeammateEmail === teammate.email;
                return (
                  <button
                    key={teammate.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickSignIn(teammate)}
                    className={`text-left p-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}>
                        Gr.{teammate.group}
                      </span>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      )}
                    </div>
                    <span className="truncate mt-1 text-[11px] font-bold">
                      {teammate.name.replace('Student Intern ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <hr className="w-full border-slate-200 dark:border-slate-800" />
            <span className="absolute bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              or type your email
            </span>
          </div>

          {/* Direct Email Only Form (NO PASSWORD FIELD) */}
          <form onSubmit={(e) => handleEmailAuth(e)} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Approved Student Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. intern.a2@hospital.edu or your Google email"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Email (No Password)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secondary Google Sign-in Option */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Or sign in with Google</span>
            </button>
          </div>
        </div>

        {/* Security & Disclaimer Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>9-Intern Ob/Gyn Portal</span>
          </span>
          <span>Zero Open Writes Enforced</span>
        </div>
      </div>
    </div>
  );
};
