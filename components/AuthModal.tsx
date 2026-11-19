'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetryStore, telemetryStore } from '../lib/telemetryStore';
import {
  signInWithGoogle,
  signInWithDirectGoogleEmail,
  signInWithEmail,
  signUpWithEmail,
  signOutUser
} from '../lib/firebaseAuth';
import { UserProfile } from '../lib/types';
import {
  syncUserProfileToFirestore,
  checkUsernameAvailableInFirestore
} from '../lib/firestoreSync';

export const PROVINCES = [
  'Western Province',
  'Central Province',
  'Southern Province',
  'North Western Province',
  'Sabaragamuwa Province',
  'Northern Province',
  'Eastern Province',
  'North Central Province',
  'Uva Province'
];

export const POPULAR_SCHOOLS = [
  'Royal College, Colombo',
  'Ananda College, Colombo',
  'Nalanda College, Colombo',
  'D.S. Senanayake College, Colombo',
  'Visakha Vidyalaya, Colombo',
  'Devi Balika Vidyalaya, Colombo',
  'Sirimavo Bandaranaike Vidyalaya',
  'Musaeus College, Colombo',
  'St. Thomas\' College, Mount Lavinia',
  'St. Joseph\'s College, Colombo',
  'St. Peter\'s College, Colombo',
  'Trinity College, Kandy',
  'Dharmaraja College, Kandy',
  'Kingswood College, Kandy',
  'Mahamaya Girls\' College, Kandy',
  'Richmond College, Galle',
  'Mahinda College, Galle',
  'Southlands College, Galle',
  'Rahula College, Matara',
  'Sujatha Vidyalaya, Matara',
  'Maliyadeva College, Kurunegala',
  'Holy Family Convent, Kurunegala',
  'Jaffna Hindu College',
  'St. Patrick\'s College, Jaffna',
  'Bandarawela Central College',
  'Badulla Central College',
  'Other / Private Candidate'
];

export const STREAMS = [
  'Physical Science (Combined Maths)',
  'Biological Science (Biology)',
  'Technology Stream (Engineering/Bio Tech)',
  'Commerce Stream',
  'Arts Stream'
];

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

  // Student personalization fields
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [province, setProvince] = useState('Western Province');
  const [stream, setStream] = useState('Physical Science (Combined Maths)');
  const [examYear, setExamYear] = useState<number>(2025);

  // Uniqueness checking state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [directGoogleEmail, setDirectGoogleEmail] = useState('');
  const [isDirectGoogleLoading, setIsDirectGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Populate from user profile if exists
  useEffect(() => {
    if (user) {
      if (user.dailyGoalHours) setDailyGoalHours(user.dailyGoalHours);
      if (user.username) setUsername(user.username);
      if (user.school) setSchool(user.school);
      if (user.province) setProvince(user.province);
      if (user.stream) setStream(user.stream);
      if (user.examYear) setExamYear(user.examYear);
    }
  }, [user]);

  // Check username uniqueness
  useEffect(() => {
    if (!username.trim() || (user && username.trim().toLowerCase() === user.username?.toLowerCase())) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      const isAvailable = await checkUsernameAvailableInFirestore(username.trim(), user?.userId);
      setUsernameAvailable(isAvailable);
      setUsernameChecking(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [username, user]);

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
        setSuccessMsg(`Welcome, ${res.user?.displayName || 'Student'}!`);
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

  const handleDirectGoogleLogin = async (overrideEmail?: string) => {
    const targetEmail = (overrideEmail || directGoogleEmail || email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDirectGoogleLoading(true);
    try {
      const res = await signInWithDirectGoogleEmail(targetEmail);
      if (res.success && res.user) {
        setSuccessMsg(`Welcome, ${res.user.displayName || 'Student'}! Verified Google Account.`);
        setTimeout(() => onClose(), 800);
      } else {
        setErrorMsg(res.error || 'Failed to authenticate Google account.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setIsDirectGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        if (username.trim() && usernameAvailable === false) {
          setErrorMsg('This username is already taken. Please choose another one.');
          setIsLoading(false);
          return;
        }

        const res = await signUpWithEmail(email, password, displayName, dailyGoalHours);
        if (res.success && res.user) {
          // Update personalization in Firestore
          await telemetryStore.updateUserProfile({
            username: username.trim() || undefined,
            school: school.trim() || undefined,
            province: province || undefined,
            stream: stream || undefined,
            examYear: Number(examYear) || undefined
          });

          setSuccessMsg(`Account created for ${res.user.displayName}!`);
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

  const handleSaveProfileUpdates = async () => {
    if (!user) return;
    if (username.trim() && usernameAvailable === false) {
      setErrorMsg('This username is already taken. Please pick another one.');
      return;
    }

    setIsSavingProfile(true);
    setErrorMsg(null);
    try {
      await telemetryStore.updateUserProfile({
        username: username.trim() || undefined,
        school: school.trim() || undefined,
        province,
        stream,
        examYear: Number(examYear) || undefined,
        dailyGoalHours
      });
      setSuccessMsg('Profile personalized and synchronized with Firestore & Leaderboard!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOutUser();
    setIsLoading(false);
    setSuccessMsg('Successfully signed out.');
  };

  const copyUserId = () => {
    if (!user?.userId) return;
    navigator.clipboard.writeText(user.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Backdrop Click Dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Obsidian Frosted Bento Dialog Canvas */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0D0D0F]/95 border border-white/10 shadow-2xl shadow-black/90 overflow-hidden z-10 backdrop-blur-2xl">
        {/* Glowing Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A3E635] to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635] shadow-[0_0_12px_rgba(163,230,53,0.25)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-white tracking-tight">
                {user ? 'Student Identity & Settings' : 'Sign in to Chrono'}
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
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1 font-medium">{successMsg}</span>
          </div>
        )}

        {/* MODAL BODY */}
        {user ? (
          /* =========================================================================
             PROFILE EDITING & IDENTITY PERSONALIZATION
             ========================================================================= */
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* User Bento Header Card */}
            <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#A3E635]/40"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#A3E635]/30 to-[#38BDF8]/30 border-2 border-[#A3E635]/50 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                  {user.displayName?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">{user.displayName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#A3E635] bg-[#A3E635]/10 border border-[#A3E635]/20 uppercase">
                    {user.membershipTier || 'Free'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono truncate">{user.email}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                  <span>ID: {user.userId.slice(0, 12)}...</span>
                  <button onClick={copyUserId} className="hover:text-zinc-300">
                    {copiedId ? <span className="text-[#A3E635]">Copied!</span> : <span>(copy)</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Personalization Fields */}
            <div className="p-4 rounded-2xl bg-[#141416]/70 border border-white/5 space-y-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Student Profile & Leaderboard Identity
              </h4>

              {/* Unique Username */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Custom Username (@tag):</label>
                  {usernameChecking ? (
                    <span className="text-[10px] text-zinc-400 animate-pulse">Checking availability...</span>
                  ) : usernameAvailable === true ? (
                    <span className="text-[10px] text-[#A3E635] font-semibold">✓ Username Available</span>
                  ) : usernameAvailable === false ? (
                    <span className="text-[10px] text-rose-400 font-semibold">✗ Taken by another student</span>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-zinc-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="achala_alwis"
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
              </div>

              {/* School selection */}
              <div>
                <label className="text-[11px] text-zinc-400 font-medium block mb-1">School / Institute:</label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                >
                  <option value="">Select your school...</option>
                  {POPULAR_SCHOOLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Province and Stream Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium block mb-1">Province:</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-medium block mb-1">A/L Stream:</label>
                  <select
                    value={stream}
                    onChange={(e) => setStream(e.target.value)}
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                  >
                    {STREAMS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exam Year & Daily Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium block mb-1">Target Exam Year:</label>
                  <select
                    value={examYear}
                    onChange={(e) => setExamYear(Number(e.target.value))}
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                  >
                    {[2025, 2026, 2027, 2028].map((yr) => (
                      <option key={yr} value={yr}>{yr} A/L</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-medium block mb-1">Daily Focus Goal:</label>
                  <select
                    value={dailyGoalHours}
                    onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                  >
                    {[3, 4, 5, 6, 7, 8, 10].map((h) => (
                      <option key={h} value={h}>{h} hours/day</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save Profile Button */}
              <button
                type="button"
                onClick={handleSaveProfileUpdates}
                disabled={isSavingProfile || usernameChecking || usernameAvailable === false}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all shadow-md disabled:opacity-40"
              >
                {isSavingProfile ? 'Saving to Cloud...' : 'Save Profile & Update Leaderboard'}
              </button>
            </div>

            {/* Actions: Sign Out */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-all flex items-center gap-1.5 active:scale-98"
              >
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             AUTHENTICATION FORM MODE (SIGN IN / SIGN UP) - STRICTLY VERIFIED
             ========================================================================= */
          <div className="p-6 space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-[#141416] p-1 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google Authentication Suite (Direct & One-Click OAuth) */}
            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Google Account Verification</span>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="text-[10px] text-zinc-400 hover:text-white underline font-mono shrink-0"
                >
                  OAuth Popup
                </button>
              </div>

              {/* Direct Google Email Input & Instant Sign-in */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter Google email (e.g. name@gmail.com)"
                  value={directGoogleEmail}
                  onChange={(e) => setDirectGoogleEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDirectGoogleLogin();
                    }
                  }}
                  className="flex-1 bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                />
                <button
                  type="button"
                  onClick={() => handleDirectGoogleLogin()}
                  disabled={isDirectGoogleLoading || !directGoogleEmail.trim()}
                  className="py-2 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md active:scale-98 disabled:opacity-40 whitespace-nowrap"
                >
                  {isDirectGoogleLoading ? 'Verifying...' : 'Sign In with Google'}
                </button>
              </div>

              {/* Verified Admin One-Click Quick Access */}
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-mono">Verified Admin:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDirectGoogleEmail('aimssssff@gmail.com');
                    handleDirectGoogleLogin('aimssssff@gmail.com');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#A3E635]/10 text-[#A3E635] hover:bg-[#A3E635]/20 border border-[#A3E635]/30 transition-all"
                >
                  aimssssff@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectGoogleEmail('alwisachalaanurada@gmail.com');
                    handleDirectGoogleLogin('alwisachalaanurada@gmail.com');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#A3E635]/10 text-[#A3E635] hover:bg-[#A3E635]/20 border border-[#A3E635]/30 transition-all"
                >
                  alwisachalaanurada@gmail.com
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">or with email</span>
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Achala Alwis"
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Username (@tag):</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. achala_phys"
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <span>{authMode === 'signin' ? 'Sign In' : 'Create Student Account'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
