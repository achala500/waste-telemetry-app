'use client';

import React, { useState } from 'react';
import { Calendar, AlertTriangle, Clock, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import { HeatmapCell, DayActivitySummary, TelemetryBlock } from '@/lib/types';
import { telemetryStore } from '@/lib/telemetryStore';

interface HeatmapViewProps {
  heatmapData: HeatmapCell[];
  weeklyData: DayActivitySummary[];
  blocks: TelemetryBlock[];
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({ heatmapData, weeklyData, blocks }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Compute top distractions from real blocks
  const distractionMap: Record<string, number> = {};
  const hourlyWastedMap: Record<number, number> = {};

  blocks
    .filter((b) => b.category === 'wasted')
    .forEach((b) => {
      const title = b.title || b.label || 'Distraction';
      distractionMap[title] = (distractionMap[title] || 0) + (b.durationMinutes || 0);

      const d = new Date(b.startTime);
      const h = !isNaN(d.getTime()) ? d.getHours() : parseInt(b.startTime.split(':')[0] || '14', 10);
      hourlyWastedMap[h] = (hourlyWastedMap[h] || 0) + (b.durationMinutes || 0);
    });

  const sortedDistractions = Object.entries(distractionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Compute dynamic peak distraction hours from actual data
  const sortedHourlyWasted = Object.entries(hourlyWastedMap)
    .map(([h, mins]) => ({ hour: parseInt(h, 10), minutes: mins }))
    .sort((a, b) => b.minutes - a.minutes);

  const subjectBreakdown = telemetryStore.getSubjectBreakdown();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white tracking-tight">Analytics & Weekly Activity Heatmap</h1>
        <p className="text-xs text-zinc-400 mt-1">
          7-day hourly breakdown identifying your peak focus windows, subject allocation, and distraction patterns
        </p>
      </div>

      {/* Grid: 7x18 Matrix */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Weekly Activity Heatmap</h2>
          <span className="text-xs text-zinc-500 font-medium">06:00 – 23:00 daily schedule</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-2 mb-2 text-center text-xs font-semibold text-zinc-400">
              <div className="text-left text-zinc-500">Hour</div>
              {days.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Hourly Rows */}
            <div className="space-y-1.5">
              {hours.map((h) => {
                const hourStr = `${h.toString().padStart(2, '0')}:00`;
                return (
                  <div key={h} className="grid grid-cols-8 gap-2 items-center">
                    <div className="text-xs text-zinc-500 font-medium tabular-nums">{hourStr}</div>
                    {days.map((_, dayIdx) => {
                      const cell = heatmapData.find((c) => c.dayIndex === dayIdx && c.hour === h);
                      const wasted = cell?.wastedMinutes || 0;
                      const focus = cell?.focusMinutes || 0;
                      const hasBoth = focus > 0 && wasted > 0;

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => setSelectedHour(h)}
                          className={`h-8 rounded-xl border flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                            hasBoth
                              ? 'bg-gradient-to-r from-[#A3E635]/20 to-rose-500/25 border-white/20'
                              : wasted > 30
                              ? 'bg-rose-500/30 border-rose-500/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                              : wasted > 0
                              ? 'bg-[#FB923C]/20 border-[#FB923C]/30 text-[#FB923C]'
                              : focus > 30
                              ? 'bg-[#A3E635]/20 border-[#A3E635]/30 text-[#A3E635]'
                              : focus > 0
                              ? 'bg-[#A3E635]/10 border-[#A3E635]/20 text-[#A3E635]'
                              : 'bg-white/5 border-white/5 text-zinc-600'
                          }`}
                          title={`${hourStr} on ${days[dayIdx]}: ${focus}m study & ${wasted}m distraction`}
                        >
                          {hasBoth ? (
                            <div className="flex items-center gap-0.5 px-1 leading-none">
                              <span className="text-[#A3E635]">{focus}m</span>
                              <span className="text-zinc-500 text-[8px]">/</span>
                              <span className="text-rose-300">{wasted}m</span>
                            </div>
                          ) : wasted > 0 ? (
                            `${wasted}m`
                          ) : focus > 0 ? (
                            `${focus}m`
                          ) : (
                            ''
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/5 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#A3E635]/20 border border-[#A3E635]/40" />
            <span>Study Session</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-r from-[#A3E635]/30 to-rose-500/30 border border-white/20" />
            <span>Split Study &amp; Distraction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#FB923C]/20 border border-[#FB923C]/40" />
            <span>Moderate Distraction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500/30 border border-rose-500/50" />
            <span>Heavy Distraction (&gt;30m)</span>
          </div>
        </div>
      </div>

      {/* Row: Subject Distribution Breakdown */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#A3E635]" />
            <h2 className="text-base font-bold text-white">Subject-wise Study Time</h2>
          </div>
          <span className="text-xs text-zinc-400">Combined Maths, Physics, Past Paper & Revision</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {subjectBreakdown.map((s) => (
            <div key={s.subject} className="p-4 rounded-2xl bg-[#08080A] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>{s.subject}</span>
                <span className="tabular-nums text-[#A3E635]">{s.hours}h</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>{s.percentage}% of study total</span>
                <span>{s.minutes} mins</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row: Top Distractions & Real Peak Distraction Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Distractions */}
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">Top Distractions</h2>
          {sortedDistractions.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No distraction sessions recorded. Great discipline!
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDistractions.map(([app, mins]) => (
                <div key={app} className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="font-semibold">{app}</span>
                    <span className="tabular-nums">{mins} mins</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((mins / 120) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Peak Distraction Hours - Hardcoded fake data removed */}
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">Peak Distraction Hours</h2>
          {sortedHourlyWasted.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-[#A3E635] mx-auto opacity-80" />
              <p className="text-xs font-semibold text-white">Zero distraction sessions recorded</p>
              <p className="text-[11px] text-zinc-500">
                Your focus schedule is completely clean. Any recorded distraction periods will be calculated dynamically here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-zinc-300">
              {sortedHourlyWasted.slice(0, 3).map((item, idx) => {
                const hourStr = `${item.hour.toString().padStart(2, '0')}:00 – ${((item.hour + 1) % 24).toString().padStart(2, '0')}:00`;
                const isTop = idx === 0;

                return (
                  <div
                    key={item.hour}
                    className="p-3.5 rounded-2xl bg-[#08080A] border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-white">{hourStr}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.minutes} minutes wasted</p>
                    </div>
                    <span
                      className={`font-bold text-xs ${
                        isTop ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {isTop ? 'Highest Risk' : 'Secondary Dip'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
