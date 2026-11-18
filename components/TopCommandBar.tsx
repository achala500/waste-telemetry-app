'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Plus, ChevronLeft, ChevronRight, Calendar, Search, LogOut, ExternalLink, Sheet } from 'lucide-react';
import { signInWithGoogle, logOutUser, auth } from '@/lib/firebaseAuth';
import { onAuthStateChanged, User } from 'firebase/auth';

interface TopCommandBarProps {
  onQuickLog: (input: string) => void;
  stopwatchRunning: boolean;
  stopwatchElapsedSeconds: number;
  stopwatchLabel?: string;
  onStartStopwatch: () => void;
  onPauseStopwatch: () => void;
  onDoneStopwatch: () => void;
  onOpenLogModal: () => void;
  scope: 'day' | '7d';
  onScopeChange: (scope: 'day' | '7d') => void;
  currentDate: Date;
  onStepDate: (direction: -1 | 1 | 0) => void;
  sheetUrl?: string;
  isSavedToSheet?: boolean;
  onOpenAuth?: () => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  onQuickLog,
  stopwatchRunning,
  stopwatchElapsedSeconds,
  stopwatchLabel,
  onStartStopwatch,
  onPauseStopwatch,
  onDoneStopwatch,
  onOpenLogModal,
  scope,
  onScopeChange,
  currentDate,
  onStepDate,
  sheetUrl = 'https://docs.google.com/spreadsheets/d/1_CHRONO_Live_Focus_Logs',
  isSavedToSheet = true,
  onOpenAuth
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickInput.trim()) {
      e.preventDefault();
      onQuickLog(quickInput.trim());
      setQuickInput('');
    }
  };

  const handleGoogleAuth = async () => {
    if (user) {
      await logOutUser();
    } else {
      setAuthLoading(true);
      await signInWithGoogle();
      setAuthLoading(false);
    }
  };

  const formatStopwatch = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateDisplay = (date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString();
    if (isToday) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-30 bg-[#08080A]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Quick Log Pill */}
        <div className="w-full md:w-80 relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Quick log: "50m coding", "30m Reels"...'
            className="w-full bg-[#141416] border border-white/10 rounded-2xl py-2 pl-10 pr-12 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
          />
          <kbd className="hidden md:inline-block absolute right-3 px-1.5 py-0.5 text-[10px] text-zinc-500 bg-white/5 border border-white/10 rounded">
            ↵
          </kbd>
        </div>

        {/* Center: Live Focus Stopwatch */}
        <div className="flex items-center gap-2 bg-[#141416] border border-white/10 px-3.5 py-1.5 rounded-2xl">
          <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
            {stopwatchLabel || 'Focus Timer'}:
          </span>
          <span className="text-xs font-semibold text-white tracking-wider tabular-nums">
            {formatStopwatch(stopwatchElapsedSeconds)}
          </span>
          <div className="flex items-center gap-1 ml-1">
            {!stopwatchRunning ? (
              <button
                onClick={onStartStopwatch}
                className="p-1 rounded-lg text-[#A3E635] hover:bg-white/5 transition-colors"
                title="Start Focus Timer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={onPauseStopwatch}
                className="p-1 rounded-lg text-amber-400 hover:bg-white/5 transition-colors"
                title="Pause Focus Timer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
            {stopwatchElapsedSeconds > 0 && (
              <button
                onClick={onDoneStopwatch}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Save Session"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Date Stepper, Scope Toggle, + Log Block, Google Sign-in */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end w-full md:w-auto">
          {/* Date Stepper */}
          <div className="flex items-center bg-[#141416] border border-white/10 rounded-2xl p-0.5">
            <button
              onClick={() => onStepDate(-1)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5"
              title="Previous Day ([)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onStepDate(0)}
              className="px-2.5 py-1 text-xs font-medium text-zinc-200 hover:text-white"
              title="Jump to Today (T)"
            >
              {formatDateDisplay(currentDate)}
            </button>
            <button
              onClick={() => onStepDate(1)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5"
              title="Next Day (])"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scope Toggle */}
          <div className="flex items-center bg-[#141416] border border-white/10 rounded-2xl p-0.5 text-xs font-medium">
            <button
              onClick={() => onScopeChange('day')}
              className={`px-3 py-1 rounded-xl tag-switcher-spring btn-tactile ${
                scope === 'day' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => onScopeChange('7d')}
              className={`px-3 py-1 rounded-xl tag-switcher-spring btn-tactile ${
                scope === '7d' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              7D
            </button>
          </div>

          {/* + Log Block Button */}
          <button
            onClick={onOpenLogModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all btn-tactile active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Log Block</span>
            <kbd className="hidden lg:inline text-[9px] text-zinc-400 ml-1">N</kbd>
          </button>

          {/* Google Sheets Saved Badge */}
          {user && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
              title="Open Google Sheet"
            >
              <Sheet className="w-3.5 h-3.5" />
              <span>Saved to Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Google Sign In / Profile Avatar */}
          {user ? (
            <div
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
                else if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('chrono:open-auth'));
                }
              }}
              className="flex items-center gap-2 bg-[#141416] border border-white/10 hover:border-[#A3E635]/40 px-2 py-1 rounded-2xl cursor-pointer transition-colors active:scale-95 group"
              title="Click to view profile & daily goals"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full object-cover border border-[#A3E635]/40" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#A3E635] text-black text-xs font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs text-zinc-300 font-medium group-hover:text-white transition-colors hidden sm:inline">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGoogleAuth();
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
                else handleGoogleAuth();
              }}
              disabled={authLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
              title="Sign in with Google / Email"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
