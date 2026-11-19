'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  Flame,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
  Trophy,
  ArrowRight,
  Zap,
  BarChart2,
  Lock
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  const [activeMetricTab, setActiveMetricTab] = useState<'focus' | 'leaks' | 'retention'>('focus');
  const [interactiveSeconds, setInteractiveSeconds] = useState(1440); // 24m 00s
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:py-24 bg-[#08080A]">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#A3E635]/15 via-emerald-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        {/* Top Hero Badge & Headline */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium backdrop-blur-xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#A3E635] animate-pulse" />
            <span className="text-white font-semibold">Chrono 2.0</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">Sri Lanka’s #1 A/L Focus & Telemetry Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Turn Every Minute into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#A3E635] via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Unshakable A/L Mastery
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate social media dopamine spirals, stream live focus metrics straight into your personal Google Sheets, and access verified A/L Past Papers with pure Apple HIG craftsmanship.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#A3E635] text-black font-extrabold text-sm hover:bg-[#86efac] active:scale-95 transition-all shadow-[0_0_25px_rgba(163,230,53,0.3)] flex items-center justify-center gap-2"
            >
              <span>Launch Focus Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/papers"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-zinc-400" />
              <span>Browse Past Papers</span>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/10 max-w-3xl mx-auto text-left">
            <div className="bg-[#141416]/60 border border-white/5 rounded-2xl p-3.5">
              <span className="text-2xl font-black text-white tabular-nums">48,000+</span>
              <p className="text-[11px] text-zinc-400 font-medium">Study Hours Logged</p>
            </div>
            <div className="bg-[#141416]/60 border border-white/5 rounded-2xl p-3.5">
              <span className="text-2xl font-black text-[#A3E635] tabular-nums">99.8%</span>
              <p className="text-[11px] text-zinc-400 font-medium">Sheets Sync Uptime</p>
            </div>
            <div className="bg-[#141416]/60 border border-white/5 rounded-2xl p-3.5">
              <span className="text-2xl font-black text-amber-400 tabular-nums">1,200+</span>
              <p className="text-[11px] text-zinc-400 font-medium">Verified PDF Papers</p>
            </div>
            <div className="bg-[#141416]/60 border border-white/5 rounded-2xl p-3.5">
              <span className="text-2xl font-black text-sky-400 tabular-nums">0%</span>
              <p className="text-[11px] text-zinc-400 font-medium">Data Tracking / Ads</p>
            </div>
          </div>
        </div>

        {/* Interactive Telemetry Showcase Card */}
        <div className="bg-gradient-to-b from-[#141416] via-[#101012] to-[#0A0A0C] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Telemetry Controls */}
            <div className="space-y-6 max-w-md w-full">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#A3E635] uppercase tracking-wider">
                  Live Interactive Telemetry Simulator
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  High-Precision Cognitive Engine
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log your study blocks with millisecond timestamp fidelity. Our background sync guarantees your Google Sheet stays up to date without zero API rate limiting.
                </p>
              </div>

              {/* Metric Tab Selector */}
              <div className="grid grid-cols-3 gap-1 bg-[#08080A] p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveMetricTab('focus')}
                  className={`py-2 rounded-xl font-semibold transition-all ${
                    activeMetricTab === 'focus'
                      ? 'bg-[#A3E635] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Focus Ratio
                </button>
                <button
                  onClick={() => setActiveMetricTab('leaks')}
                  className={`py-2 rounded-xl font-semibold transition-all ${
                    activeMetricTab === 'leaks'
                      ? 'bg-[#A3E635] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Distraction Leaks
                </button>
                <button
                  onClick={() => setActiveMetricTab('retention')}
                  className={`py-2 rounded-xl font-semibold transition-all ${
                    activeMetricTab === 'retention'
                      ? 'bg-[#A3E635] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  30D Streak
                </button>
              </div>

              {/* Dynamic Interactive Panel */}
              <div className="bg-[#08080A] border border-white/5 rounded-2xl p-4 space-y-3">
                {activeMetricTab === 'focus' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Deep Work Quality Index</span>
                      <span className="text-[#A3E635] font-bold">92.4% Optimal</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#A3E635] h-2 rounded-full w-[92%]" />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Calculated from uninterrupted study blocks of 45+ minutes.
                    </p>
                  </div>
                )}

                {activeMetricTab === 'leaks' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Reclaimed Lost Time</span>
                      <span className="text-rose-400 font-bold">+3.2 hrs / day</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-rose-500 h-2 rounded-full w-[35%]" />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Instagram reels and TikTok loops intercepted automatically.
                    </p>
                  </div>
                )}

                {activeMetricTab === 'retention' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Sustained Daily Cadence</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        28 Days Active
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-2 rounded-full w-[85%]" />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Top 1% in Sri Lanka Combined Maths cohort this month.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Interactive Obsidian Stopwatch Widget */}
            <div className="w-full max-w-sm bg-[#08080A] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635] shadow-[0_0_20px_rgba(163,230,53,0.2)]">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">
                  Exam Focus Mode
                </span>
                <div className="text-5xl font-mono font-black text-white tracking-wider tabular-nums">
                  {formatTimer(interactiveSeconds)}
                </div>
                <p className="text-xs text-zinc-400">Combined Maths • 2024 Past Paper</p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={toggleTimer}
                  className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    isTimerRunning
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-[#A3E635] text-black shadow-lg hover:bg-[#86efac]'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isTimerRunning ? 'fill-rose-300' : 'fill-black'}`} />
                  <span>{isTimerRunning ? 'Pause Session' : 'Start Focus'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 w-full flex items-center justify-between text-[11px] text-zinc-500">
                <span>Direct Sheets Export</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Showcase Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Engineered for Serious A/L Students
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Every detail built to eliminate friction and maximize focus retention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Tile 1 */}
            <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Zero-Friction Telemetry</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Log sessions in 3 keystrokes with quick command shortcuts. Synced automatically to your Google Sheets spreadsheet via Apps Script.
              </p>
            </div>

            {/* Bento Tile 2 */}
            <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Drive Past Papers Vault</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                10+ categories of past papers, provincial exams, marking schemes, and revision books with anti-virus magic-byte quarantine security.
              </p>
            </div>

            {/* Bento Tile 3 */}
            <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Live National Rankings</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Benchmark your daily study duration and streak milestones against the top-performing students across Sri Lanka in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
