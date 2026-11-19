'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Bell,
  AlertCircle,
  Timer as TimerIcon
} from 'lucide-react';
import { signInWithGoogle, logOutUser, auth } from '@/lib/firebaseAuth';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TimerCountdownMode, BlockCategory, SubjectTag } from '@/lib/types';
import { telemetryStore, useTelemetryStore } from '@/lib/telemetryStore';

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
  onOpenAuth
}) => {
  const storeState = useTelemetryStore();
  const [quickInput, setQuickInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Timer mode & countdown states
  const [timerMode, setTimerMode] = useState<TimerCountdownMode>('stopwatch');
  const [targetSeconds, setTargetSeconds] = useState(0); // 0 = standard stopwatch
  const [showDistractionPopup, setShowDistractionPopup] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectTag>('Combined Maths');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Web Audio Synthesized Chime for Timer Completion
  const playCompletionSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Chord 1 (A3E635 harmony: G4, B4, D5)
      [392.0, 493.88, 587.33].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });

      // Browser Notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Chrono Focus Complete!', {
          body: `${timerMode === 'pomodoro' ? '50m Pomodoro' : 'Study Session'} finished! Take a well-deserved break.`,
          icon: '/icon.svg'
        });
      }
    } catch {
      // Audio not permitted or interrupted
    }
  };

  // Check if countdown target reached
  useEffect(() => {
    if (targetSeconds > 0 && stopwatchRunning && stopwatchElapsedSeconds >= targetSeconds) {
      playCompletionSound();
      onPauseStopwatch();
    }
  }, [stopwatchElapsedSeconds, targetSeconds, stopwatchRunning]);

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

  const handleSelectMode = (mode: TimerCountdownMode) => {
    setTimerMode(mode);
    if (mode === 'stopwatch') {
      setTargetSeconds(0);
      telemetryStore.setTimerMode('stopwatch', 0);
    } else if (mode === 'pomodoro') {
      const sec = 50 * 60; // 50m
      setTargetSeconds(sec);
      telemetryStore.setTimerMode('pomodoro', sec);
    } else if (mode === 'paper-2h') {
      const sec = 120 * 60; // 2 hours
      setTargetSeconds(sec);
      telemetryStore.setTimerMode('paper-2h', sec);
    } else if (mode === 'paper-3h') {
      const sec = 180 * 60; // 3 hours
      setTargetSeconds(sec);
      telemetryStore.setTimerMode('paper-3h', sec);
    }
  };

  const handleStopClicked = () => {
    // If target seconds was set and user stopped early (< 80% completed), trigger check-in popup
    if (targetSeconds > 0 && stopwatchElapsedSeconds < targetSeconds * 0.8) {
      setShowDistractionPopup(true);
    } else {
      onDoneStopwatch();
    }
  };

  const formatStopwatchDisplay = (totalSec: number) => {
    if (targetSeconds > 0) {
      // Countdown mode
      const remaining = Math.max(0, targetSeconds - totalSec);
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    // Count-up mode
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateDisplay = (date: Date) => {
    if (scope === '7d') return 'Past 7 Days';
    const isToday = new Date().toDateString() === date.toDateString();
    if (isToday) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-30 bg-[#08080A]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Quick Log Input */}
        <div className="w-full md:w-72 relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Quick log: "50m physics", "30m Reels"...'
            className="w-full bg-[#141416] border border-white/10 rounded-2xl py-2 pl-10 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
          />
          <kbd className="hidden md:inline-block absolute right-3 px-1.5 py-0.5 text-[10px] text-zinc-500 bg-white/5 border border-white/10 rounded">
            ↵
          </kbd>
        </div>

        {/* Center: Upgraded Focus Timer with Pomodoro & Past Paper Modes */}
        <div className="flex items-center gap-2 bg-[#141416] border border-white/10 px-3 py-1.5 rounded-2xl">
          {/* Mode Switcher Pill */}
          <select
            value={timerMode}
            onChange={(e) => handleSelectMode(e.target.value as TimerCountdownMode)}
            disabled={stopwatchRunning}
            className="bg-transparent text-xs text-zinc-300 font-semibold focus:outline-none cursor-pointer disabled:opacity-60 pr-1 border-r border-white/10"
          >
            <option value="stopwatch" className="bg-[#141416] text-white">Stopwatch</option>
            <option value="pomodoro" className="bg-[#141416] text-white">50/10 Pomodoro</option>
            <option value="paper-2h" className="bg-[#141416] text-white">2h Past Paper</option>
            <option value="paper-3h" className="bg-[#141416] text-white">3h Past Paper</option>
          </select>

          {/* Time Display */}
          <span className="text-xs font-bold text-white tracking-wider tabular-nums px-1">
            {formatStopwatchDisplay(stopwatchElapsedSeconds)}
          </span>

          {/* Controls */}
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
                onClick={handleStopClicked}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Save Session"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Date Stepper, Scope Toggle, + Log Block, Sign in with Google */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end w-full md:w-auto">
          {/* Date Stepper with properly styled/disabled 7D arrow */}
          <div className="flex items-center bg-[#141416] border border-white/10 rounded-2xl p-0.5">
            <button
              onClick={() => onStepDate(-1)}
              disabled={scope === '7d'}
              className={`p-1.5 rounded-xl transition-all ${
                scope === '7d'
                  ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={scope === '7d' ? 'Date stepping disabled in 7D mode' : 'Previous Day ([)'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (scope !== '7d') onStepDate(0);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:text-white"
              title="Jump to Today (T)"
            >
              {formatDateDisplay(currentDate)}
            </button>
            <button
              onClick={() => onStepDate(1)}
              disabled={scope === '7d'}
              className={`p-1.5 rounded-xl transition-all ${
                scope === '7d'
                  ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={scope === '7d' ? 'Date stepping disabled in 7D mode' : 'Next Day (])'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scope Toggle */}
          <div className="flex items-center bg-[#141416] border border-white/10 rounded-2xl p-0.5 text-xs font-medium">
            <button
              onClick={() => onScopeChange('day')}
              className={`px-3 py-1 rounded-xl transition-all ${
                scope === 'day'
                  ? 'bg-[#A3E635] text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => onScopeChange('7d')}
              className={`px-3 py-1 rounded-xl transition-all ${
                scope === '7d'
                  ? 'bg-[#A3E635] text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              7D
            </button>
          </div>

          {/* + Log Block Button */}
          <button
            onClick={onOpenLogModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Log Block</span>
          </button>

          {/* Google Sign In / Profile Avatar - Unified Copy */}
          {user ? (
            <div
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
              }}
              className="flex items-center gap-2 bg-[#141416] border border-white/10 hover:border-[#A3E635]/40 px-2 py-1 rounded-2xl cursor-pointer transition-colors active:scale-95 group"
              title="Click to view profile & daily goals"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full object-cover border border-[#A3E635]/40"
                />
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
              title="Sign in with Google"
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

      {/* Early Stop Distraction Check-in Modal */}
      {showDistractionPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Stopped Early?</h3>
                <p className="text-xs text-zinc-400">Check-in to keep telemetry accurate</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              You stopped before reaching your full target ({Math.round(targetSeconds / 60)}m). What happened?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setShowDistractionPopup(false);
                  onDoneStopwatch();
                  onQuickLog('30m Distraction Spiral');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 text-left flex items-center justify-between"
              >
                <span>Caught by Distraction</span>
                <span className="text-[10px] opacity-75">Log wasted block</span>
              </button>

              <button
                onClick={() => {
                  setShowDistractionPopup(false);
                  onDoneStopwatch();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#A3E635]/15 hover:bg-[#A3E635]/25 border border-[#A3E635]/30 text-xs font-semibold text-[#A3E635] text-left flex items-center justify-between"
              >
                <span>Finished Task Early</span>
                <span className="text-[10px] opacity-75">Save as Focus</span>
              </button>

              <button
                onClick={() => {
                  setShowDistractionPopup(false);
                  onDoneStopwatch();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white text-center"
              >
                Normal Break / Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
