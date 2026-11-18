'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetryStore, telemetryStore } from '../lib/telemetryStore';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser
} from '../lib/firebaseAuth';
import { UserProfile } from '../lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const state = useTelemetryStore();
  const user = state.user;

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  // Sync state goal if user exists
  useEffect(() => {
    if (user?.dailyGoalHours) {
      setDailyGoalHours(user.dailyGoalHours);
    }
  }, [user]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        setSuccessMsg(`Welcome, ${res.user?.displayName || 'Omni User'}!`);
        setTimeout(() => onClose(), 800);
      } else {
        setErrorMsg(res.error || 'Failed to sign in with Google');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        const res = await signUpWithEmail(email, password, displayName, dailyGoalHours);
        if (res.success) {
          setSuccessMsg(`Account created for ${res.user?.displayName}!`);
          setTimeout(() => onClose(), 800);
        } else {
          setErrorMsg(res.error || 'Failed to create account');
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (res.success) {
          setSuccessMsg(`Welcome back, ${res.user?.displayName}!`);
          setTimeout(() => onClose(), 800);
        } else {
          setErrorMsg(res.error || 'Failed to sign in');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOutUser();
    setIsLoading(false);
    setSuccessMsg('Successfully signed out.');
  };

  const handleGoalChange = async (newHours: number) => {
    const clamped = Math.max(1, Math.min(16, newHours));
    setDailyGoalHours(clamped);
    if (user) {
      await telemetryStore.updateUserProfile({ dailyGoalHours: clamped });
    } else {
      telemetryStore.setFocusGoal(clamped * 60);
    }
  };

  const handleSyncProfile = async () => {
    if (!user) return;
    setIsSyncingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await telemetryStore.syncUserProfile(user);
    setIsSyncingProfile(false);
    if (res.success) {
      setSuccessMsg('User profile synchronized with Google Sheets & Firestore!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Sync warning: credentials not yet configured in Setup Drawer');
    }
  };

  const copyUserId = () => {
    if (!user?.userId) return;
    navigator.clipboard.writeText(user.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleQuickDemo = () => {
    const demoUser: UserProfile = {
      userId: 'usr-omni-pro',
      email: 'alex.vance@omnitelemetry.io',
      displayName: 'Alex Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      dailyGoalHours: 6,
      createdAt: '2026-01-10T10:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    };
    telemetryStore.setUser(demoUser);
    setSuccessMsg('Signed in as Alex Vance (Demo Profile)');
    setTimeout(() => onClose(), 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Backdrop Click Dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Obsidian Frosted Bento Dialog Canvas */}
      <div className="relative w-full max-w-md rounded-2xl bg-[#0D0D0F]/95 border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden z-10 backdrop-blur-2xl spring-popover">
        
        {/* Glowing Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A3E635] to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635] shadow-[0_0_12px_rgba(163,230,53,0.25)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-semibold text-white tracking-tight">
                {user ? 'Account & Profile' : 'Sign in to Chrono'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {user ? user.email : 'Unified telemetry across all Apple devices'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close dialog (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notifications Banners */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* =========================================================================
            PROFILE MODE (WHEN LOGGED IN)
           ========================================================================= */}
        {user ? (
          <div className="p-6 space-y-5">
            {/* User Bento Card */}
            <div className="p-4 rounded-xl bg-[#141416]/90 border border-white/[0.08] flex items-center gap-4 shadow-inner">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#A3E635]/40 shadow-lg shadow-[#A3E635]/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#A3E635]/30 to-[#38BDF8]/30 border-2 border-[#A3E635]/50 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-[#A3E635]/15">
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate">{user.displayName}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-[#A3E635] bg-[#A3E635]/10 border border-[#A3E635]/20">
                    Active
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono truncate">{user.email}</p>
                
                {/* User ID with Copy */}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                  <span>ID: {user.userId.slice(0, 14)}...</span>
                  <button
                    onClick={copyUserId}
                    className="hover:text-zinc-300 transition-colors"
                    title="Copy full User ID"
                  >
                    {copiedId ? (
                      <span className="text-[#A3E635] text-[10px]">Copied!</span>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Focus Goal Stepper Card */}
            <div className="p-4 rounded-xl bg-[#141416]/60 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-200">Daily Focus Target</span>
                  <p className="text-[11px] text-zinc-500">Target hours for Deep Work capsules</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-[#A3E635]">{dailyGoalHours}h</span>
                  <span className="text-[10px] text-zinc-400 font-mono ml-1">({dailyGoalHours * 60}m)</span>
                </div>
              </div>

              {/* Quick Stepper Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                {[4, 5, 6, 7, 8].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => handleGoalChange(hours)}
                    className={`py-1.5 rounded-lg text-xs font-mono transition-all ${
                      dailyGoalHours === hours
                        ? 'bg-[#A3E635] text-black font-semibold shadow-sm'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>

            {/* Telemetry Multi-Cloud Sync Status */}
            <div className="p-3 rounded-xl bg-[#141416]/40 border border-white/[0.05] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635]" />
                  Firestore Users Collection
                </span>
                <span className="font-mono text-[11px] text-[#A3E635]">Synced</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${state.sheetConfig.isConnected ? 'bg-[#A3E635]' : 'bg-zinc-600'}`} />
                  Google Sheets Users Tab
                </span>
                <span className="font-mono text-[11px] text-zinc-400">
                  {state.sheetConfig.isConnected ? 'Connected' : 'Offline / Setup Ready'}
                </span>
              </div>
            </div>

            {/* Actions: Sync Profile & Sign Out */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSyncProfile}
                disabled={isSyncingProfile}
                className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                {isSyncingProfile ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-[#A3E635]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync Profile</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition-all flex items-center gap-1.5 active:scale-98"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             AUTHENTICATION FORM MODE (SIGN IN / SIGN UP)
             ========================================================================= */
          <div className="p-6 space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-[#141416] p-1 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  authMode === 'signin'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  authMode === 'signup'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Continue with Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-3 active:scale-98"
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
              <span>Continue with Google</span>
            </button>

            {/* Obsidian Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">or with email</span>
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-zinc-400">Daily Focus Goal</label>
                    <span className="text-xs font-mono text-[#A3E635] font-semibold">{dailyGoalHours} hours/day</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={dailyGoalHours}
                    onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                    className="w-full accent-[#A3E635] bg-zinc-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#A3E635] to-[#84cc16] text-[#08080A] font-semibold text-xs hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#A3E635]/15"
              >
                {isLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>{authMode === 'signin' ? 'Sign In' : 'Create Free Account'}</span>
                )}
              </button>
            </form>

            {/* Quick Demo Login Pill for Instant Testing */}
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Testing demo?</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[11px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1"
              >
                <span>⚡ 1-Click Demo Login</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthModal;
