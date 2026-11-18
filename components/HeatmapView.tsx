'use client';

import React, { useState } from 'react';
import { Calendar, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { HeatmapCell, DayActivitySummary, TelemetryBlock } from '@/lib/types';

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
  blocks
    .filter((b) => b.category === 'wasted')
    .forEach((b) => {
      const title = b.title || b.label || 'Distraction';
      distractionMap[title] = (distractionMap[title] || 0) + (b.durationMinutes || 0);
    });

  const sortedDistractions = Object.entries(distractionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white tracking-tight">Analytics & Weekly Activity Heatmap</h1>
        <p className="text-xs text-zinc-400 mt-1">
          7-day hourly breakdown identifying your peak focus windows and top distraction hours
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

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => setSelectedHour(h)}
                          className={`h-8 rounded-xl border flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${
                            wasted > 30
                              ? 'bg-rose-500/30 border-rose-500/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                              : wasted > 0
                              ? 'bg-[#FB923C]/20 border-[#FB923C]/30 text-[#FB923C]'
                              : focus > 30
                              ? 'bg-[#A3E635]/20 border-[#A3E635]/30 text-[#A3E635]'
                              : 'bg-white/5 border-white/5 text-zinc-600'
                          }`}
                          title={`${wasted}m wasted, ${focus}m focus`}
                        >
                          {wasted > 0 ? `${wasted}m` : focus > 0 ? `${focus}m` : ''}
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
            <span>Deep Focus Block</span>
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

      {/* Row: Top Distractions & Peak Distraction Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Distractions */}
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">Top Distractions</h2>
          {sortedDistractions.length === 0 ? (
            <p className="text-xs text-zinc-500">No distraction sessions logged yet</p>
          ) : (
            <div className="space-y-2.5">
              {sortedDistractions.map(([app, mins]) => (
                <div
                  key={app}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#08080A] border border-white/5"
                >
                  <span className="text-xs font-semibold text-white">{app}</span>
                  <span className="text-xs font-bold text-rose-400 tabular-nums">{mins}m</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak Distraction Hours */}
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">Peak Distraction Hours</h2>
          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="p-3.5 rounded-2xl bg-[#08080A] border border-white/5 flex items-center justify-between">
              <span>Early Afternoon (14:00 – 16:00)</span>
              <span className="text-rose-400 font-bold">Highest Risk</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#08080A] border border-white/5 flex items-center justify-between">
              <span>Late Evening (21:00 – 23:00)</span>
              <span className="text-amber-400 font-bold">Secondary Dip</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#08080A] border border-white/5 flex items-center justify-between">
              <span>Morning Peak (08:30 – 11:30)</span>
              <span className="text-[#A3E635] font-bold">Optimal Focus</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
