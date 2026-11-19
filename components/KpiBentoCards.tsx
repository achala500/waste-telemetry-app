'use client';

import React, { useState } from 'react';
import { Clock, Flame, Sparkles, Edit2, Calendar, Target, Award } from 'lucide-react';
import { DailyKpiMetrics } from '@/lib/types';
import { telemetryStore, useTelemetryStore } from '@/lib/telemetryStore';

interface KpiBentoCardsProps {
  metrics: DailyKpiMetrics;
  onGoalChange?: (newGoalMinutes: number) => void;
}

export const KpiBentoCards: React.FC<KpiBentoCardsProps> = ({ metrics, onGoalChange }) => {
  const storeState = useTelemetryStore();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState((metrics.focusGoalMinutes / 60).toFixed(1));
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [examDateInput, setExamDateInput] = useState(storeState.examCountdownDate || '2026-11-25');
  const [examTitleInput, setExamTitleInput] = useState(storeState.examCountdownTitle || 'G.C.E. A/L Examination');

  const formatHoursMinutes = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const focusPercent = Math.min(
    100,
    Math.round((metrics.focusMinutes / Math.max(1, metrics.focusGoalMinutes)) * 100)
  );

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(goalHoursInput);
    if (!isNaN(hours) && hours > 0) {
      const minutes = Math.round(hours * 60);
      if (onGoalChange) {
        onGoalChange(minutes);
      } else {
        telemetryStore.setFocusGoal(minutes);
      }
    }
    setIsEditingGoal(false);
  };

  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    telemetryStore.setExamCountdown(examDateInput, examTitleInput);
    setIsEditingExam(false);
  };

  // Exam Countdown calculation
  const targetDate = new Date(`${storeState.examCountdownDate || '2026-11-25'}T00:00:00`);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Compute exact distraction minutes per app
  const distractionAppMap: Record<string, number> = {
    Instagram: 0,
    YouTube: 0,
    TikTok: 0,
    X: 0,
    Reddit: 0
  };

  storeState.blocks
    .filter((b) => b.category === 'wasted')
    .forEach((b) => {
      const title = (b.title || b.label || '').toLowerCase();
      if (title.includes('instagram') || title.includes('reels')) {
        distractionAppMap.Instagram += b.durationMinutes;
      } else if (title.includes('youtube')) {
        distractionAppMap.YouTube += b.durationMinutes;
      } else if (title.includes('tiktok')) {
        distractionAppMap.TikTok += b.durationMinutes;
      } else if (title.includes('twitter') || title.includes('x.com') || title === 'x') {
        distractionAppMap.X += b.durationMinutes;
      } else if (title.includes('reddit')) {
        distractionAppMap.Reddit += b.durationMinutes;
      }
    });

  // 16 waking hours = 960 minutes. 24 ticks = 40m per tick.
  const wakingWindowMinutes = 16 * 60;
  const activeTicks = Math.min(24, Math.round((metrics.wastedMinutes / wakingWindowMinutes) * 24));
  const studyStreak = telemetryStore.getStudyStreak();

  return (
    <div className="space-y-4">
      {/* Student Hub Strip: Exam Countdown, Daily Study Target, and Streak */}
      <div className="bg-[#141416] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Exam Countdown */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                {storeState.examCountdownTitle || 'G.C.E. A/L Examination'}
              </span>
              <button
                onClick={() => setIsEditingExam(!isEditingExam)}
                className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors"
                title="Edit Exam Date & Title"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-amber-400 tabular-nums">
                {daysRemaining} Days Left
              </span>
              <span className="text-[11px] text-zinc-500">
                Target: {new Date(storeState.examCountdownDate || '2026-11-25').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Study Streak Counter */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#A3E635]/10 border border-[#A3E635]/20 flex items-center justify-center text-[#A3E635] shadow-[0_0_12px_rgba(163,230,53,0.25)]">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Study Streak</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-white tabular-nums">
                {studyStreak} {studyStreak === 1 ? 'Day' : 'Days'}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] text-[10px] font-bold">
                Active 🔥
              </span>
            </div>
          </div>
        </div>

        {/* Daily Study Goal Target */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400">Daily Study Target</span>
            <div className="text-sm font-bold text-white tabular-nums mt-0.5">
              {(metrics.focusGoalMinutes / 60).toFixed(1)} Hours / day
            </div>
          </div>
        </div>
      </div>

      {isEditingExam && (
        <form onSubmit={handleExamSubmit} className="bg-[#08080A] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={examTitleInput}
            onChange={(e) => setExamTitleInput(e.target.value)}
            placeholder="Exam Title (e.g. Combined Maths / A/L)"
            className="flex-1 min-w-[200px] bg-[#141416] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
          />
          <input
            type="date"
            value={examDateInput}
            onChange={(e) => setExamDateInput(e.target.value)}
            className="bg-[#141416] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs active:scale-95 transition-all"
          >
            Update Countdown
          </button>
          <button
            type="button"
            onClick={() => setIsEditingExam(false)}
            className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs"
          >
            Cancel
          </button>
        </form>
      )}

      {/* 4 KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Focus time */}
        <div className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Focus time</span>
            <div className="w-7 h-7 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/20 flex items-center justify-center text-[#A3E635]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {formatHoursMinutes(metrics.focusMinutes)}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
              <span>
                {metrics.focusMinutes === 0
                  ? "0h logged today — Click '+ Log Block' to record study"
                  : `${focusPercent}% of ${(metrics.focusGoalMinutes / 60).toFixed(1)}h goal`}
              </span>
              <button
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                title="Edit Daily Target"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isEditingGoal ? (
            <form onSubmit={handleGoalSubmit} className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={goalHoursInput}
                onChange={(e) => setGoalHoursInput(e.target.value)}
                className="w-20 bg-[#08080A] border border-white/20 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-xl bg-[#A3E635] text-black font-semibold text-xs"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-[#A3E635] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(163,230,53,0.4)]"
                style={{ width: `${focusPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Card 2: Deep sessions */}
        <div className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Deep sessions</span>
            <div className="w-7 h-7 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {metrics.deepSessionCount}{' '}
              <span className="text-sm font-normal text-zinc-500">
                {metrics.deepSessionCount === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {metrics.deepSessionCount > 0
                ? '45m+ unbroken study blocks'
                : 'Complete a 45m+ session to activate node 1'}
            </p>
          </div>

          {/* 1–6 Glowing Pill Nodes */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6].map((nodeNum) => {
              const isCompleted = nodeNum <= metrics.deepSessionCount;
              return (
                <div
                  key={nodeNum}
                  className={`h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#38BDF8] text-black shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                      : 'bg-white/5 text-zinc-600 border border-white/5'
                  }`}
                >
                  {nodeNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Wasted time */}
        <div className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Wasted time</span>
            <div className="w-7 h-7 rounded-full bg-[#FB923C]/10 border border-[#FB923C]/20 flex items-center justify-center text-[#FB923C]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {formatHoursMinutes(metrics.wastedMinutes)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {metrics.wastedMinutes > 0
                ? `${metrics.wakingLeakPercentage}% of 16h waking day leaked`
                : 'Zero distraction time recorded'}
            </p>
          </div>

          {/* 24-Segment Tick Meter */}
          <div className="flex items-center gap-0.5 w-full pt-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const isLit = i < activeTicks;
              return (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded-sm transition-all duration-300 ${
                    isLit
                      ? i > 12
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                        : 'bg-[#FB923C] shadow-[0_0_6px_rgba(251,146,60,0.5)]'
                      : 'bg-white/5'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Card 4: Distractions */}
        <div className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Distractions</span>
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {metrics.distractionCount}
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate">
              {metrics.distractionCount > 0
                ? `Top: ${metrics.topDistractionApp || 'Social Media'} (${metrics.topOffenderMinutes || 0}m)`
                : 'No interruptions recorded'}
            </p>
          </div>

          {/* Circular iOS App Badges with tooltips & active highlight */}
          <div className="flex items-center gap-2 pt-1">
            {(['Instagram', 'YouTube', 'TikTok', 'X', 'Reddit'] as const).map((app) => {
              const minutes = distractionAppMap[app] || 0;
              const isActive = minutes > 0;
              const shortLetter = app === 'YouTube' ? 'Y' : app === 'TikTok' ? 'T' : app === 'Instagram' ? 'I' : app === 'Reddit' ? 'R' : 'X';

              return (
                <div
                  key={app}
                  className="relative group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all cursor-default ${
                      isActive
                        ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.4)] scale-105'
                        : 'bg-white/5 border border-white/10 text-zinc-500'
                    }`}
                  >
                    {shortLetter}
                  </div>

                  {/* Tactile Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                    <div className="px-2 py-1 rounded-lg bg-[#08080A] border border-white/20 text-[10px] font-semibold text-white whitespace-nowrap shadow-xl">
                      {app}: {minutes > 0 ? `${minutes}m lost` : '0m clean'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
