'use client';

import React, { useState } from 'react';
import { Clock, Flame, AlertTriangle, Sparkles, Check, Edit2 } from 'lucide-react';
import { DailyKpiMetrics } from '@/lib/types';
import { telemetryStore } from '@/lib/telemetryStore';

interface KpiBentoCardsProps {
  metrics: DailyKpiMetrics;
  onGoalChange?: (newGoalMinutes: number) => void;
}

export const KpiBentoCards: React.FC<KpiBentoCardsProps> = ({ metrics, onGoalChange }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState((metrics.focusGoalMinutes / 60).toFixed(1));

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

  // 16 waking hours = 960 minutes. 24 ticks = 40m per tick.
  const wakingWindowMinutes = 16 * 60;
  const wastedPercent = Math.min(100, Math.round((metrics.wastedMinutes / wakingWindowMinutes) * 100));
  const activeTicks = Math.min(24, Math.round((metrics.wastedMinutes / wakingWindowMinutes) * 24));

  return (
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
                ? "0h logged today — Click '+ Log Block' or start the Focus Stopwatch"
                : `${focusPercent}% of ${(metrics.focusGoalMinutes / 60).toFixed(1)}h goal`}
            </span>
            <button
              onClick={() => setIsEditingGoal(!isEditingGoal)}
              className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
              title="Edit Daily Goal"
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
              ? '45m+ unbroken focus blocks'
              : 'No sessions yet — Complete a 45m+ block to light up node 1'}
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
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
            {formatHoursMinutes(metrics.wastedMinutes)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {metrics.wastedMinutes > 0
              ? `${wastedPercent}% of 16h waking hours leaked`
              : '0m leaked — Clean waking window'}
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
          <p className="text-xs text-zinc-400 mt-1">
            {metrics.distractionCount > 0
              ? `Top offender: ${metrics.topDistractionApp || 'Social Media'}`
              : 'No interruptions recorded'}
          </p>
        </div>

        {/* Circular iOS App Badges */}
        <div className="flex items-center gap-2 pt-1">
          {['Instagram', 'YouTube', 'TikTok', 'X', 'Reddit'].map((app) => (
            <div
              key={app}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-400 font-semibold"
              title={app}
            >
              {app[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
