'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, RefreshCw, AlertCircle, ArrowUpRight, Flame } from 'lucide-react';
import { DayActivitySummary, AiInsight, HeatmapCell } from '@/lib/types';
import { telemetryStore } from '@/lib/telemetryStore';

interface WeeklyOverviewSplitProps {
  weeklyData: DayActivitySummary[];
  heatmapData?: HeatmapCell[];
  heatmapCells?: HeatmapCell[];
  insights: AiInsight[];
  totalWeeklyFocusHours?: number;
  totalLogsCount?: number;
}

export const WeeklyOverviewSplit: React.FC<WeeklyOverviewSplitProps> = ({
  weeklyData,
  heatmapData,
  heatmapCells,
  insights,
  totalWeeklyFocusHours = 0,
  totalLogsCount = 0
}) => {
  const activeHeatmapData = heatmapData || heatmapCells || [];
  const [activeTab, setActiveTab] = useState<'chart' | 'heatmap'>('chart');
  const [selectedLens, setSelectedLens] = useState<'all' | 'leak' | 'spiral' | 'reclaim'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await telemetryStore.refreshInsights();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const chartData = weeklyData.map((d) => ({
    day: d.dayName,
    focus: parseFloat((d.focusMinutes / 60).toFixed(1)),
    wasted: parseFloat((d.wastedMinutes / 60).toFixed(1))
  }));

  const filteredInsights = insights.filter((ins) => {
    if (selectedLens === 'all') return true;
    if (selectedLens === 'leak') return ins.type === 'leak_window';
    if (selectedLens === 'spiral') return ins.type === 'spiral_chain';
    if (selectedLens === 'reclaim') return ins.type === 'reclaim_forecast';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 60% Column: Weekly Overview & Heatmap */}
      <div className="lg:col-span-7 bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between bento-surface">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Weekly Overview</h2>
              <div className="text-2xl font-extrabold text-[#A3E635] mt-1 tabular-nums">
                {totalWeeklyFocusHours.toFixed(1)}h{' '}
                <span className="text-xs font-normal text-zinc-400">Total focus time this week</span>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center bg-[#08080A] border border-white/10 rounded-2xl p-1 text-xs font-medium">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1.5 rounded-xl tag-switcher-spring btn-tactile ${
                  activeTab === 'chart' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`px-3 py-1.5 rounded-xl tag-switcher-spring btn-tactile ${
                  activeTab === 'heatmap' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Weekly Activity Heatmap
              </button>
            </div>
          </div>

          {activeTab === 'chart' ? (
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} unit="h" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="focus" fill="#A3E635" radius={[6, 6, 0, 0]} name="Focus (h)" />
                  <Bar dataKey="wasted" fill="#FB923C" radius={[6, 6, 0, 0]} name="Wasted (h)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="pt-2">
              <p className="text-xs text-zinc-400 mb-3">7x18 Hourly Matrix (06:00 – 23:00)</p>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-[11px] font-semibold text-zinc-400 pb-1">
                    {d}
                  </div>
                ))}
                {heatmapData.slice(0, 7 * 6).map((cell, idx) => {
                  const isHeavy = cell.wastedMinutes > 30;
                  const isModerate = cell.wastedMinutes > 10;
                  return (
                    <div
                      key={idx}
                      className={`h-7 rounded-lg border text-[10px] flex items-center justify-center font-medium transition-colors ${
                        isHeavy
                          ? 'bg-rose-500/30 border-rose-500/50 text-rose-300'
                          : isModerate
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : cell.focusMinutes > 30
                          ? 'bg-[#A3E635]/20 border-[#A3E635]/30 text-[#A3E635]'
                          : 'bg-white/5 border-white/5 text-zinc-600'
                      }`}
                      title={`${cell.wastedMinutes}m wasted, ${cell.focusMinutes}m focus`}
                    >
                      {cell.wastedMinutes > 0 ? `${cell.wastedMinutes}m` : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]" />
            <span>High-Value Focus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C]" />
            <span>Distraction & Wasted</span>
          </div>
        </div>
      </div>

      {/* Right 40% Column: Personal AI Coach */}
      <div className="lg:col-span-5 bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between bento-surface">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Personal AI Coach</h2>
                <p className="text-[11px] text-zinc-400">Powered by Gemini 3.8 Flash</p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all disabled:opacity-50 btn-tactile active:scale-[0.97]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Insights</span>
            </button>
          </div>

          {/* Lens Selector */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#08080A] border border-white/10 rounded-2xl my-3 text-xs">
            <button
              onClick={() => setSelectedLens('all')}
              className={`py-1 rounded-xl font-medium tag-switcher-spring btn-tactile ${
                selectedLens === 'all' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedLens('leak')}
              className={`py-1 rounded-xl font-medium tag-switcher-spring btn-tactile ${
                selectedLens === 'leak' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Leak Window
            </button>
            <button
              onClick={() => setSelectedLens('spiral')}
              className={`py-1 rounded-xl font-medium tag-switcher-spring btn-tactile ${
                selectedLens === 'spiral' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Spiral Chain
            </button>
            <button
              onClick={() => setSelectedLens('reclaim')}
              className={`py-1 rounded-xl font-medium tag-switcher-spring btn-tactile ${
                selectedLens === 'reclaim' ? 'bg-[#A3E635] text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              30D Reclaim
            </button>
          </div>

          {/* Insights Cards or Crisp Empty State */}
          <div className="space-y-3 mt-3">
            {totalLogsCount < 3 ? (
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-300 font-semibold">
                  Log at least 3 sessions to view personalized AI insights
                </p>
                <p className="text-[11px] text-zinc-500">
                  Insights analyze your real focus habits to identify peak productivity windows.
                </p>
              </div>
            ) : filteredInsights.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-6">
                No insights found for this lens.
              </div>
            ) : (
              filteredInsights.map((ins) => (
                <div
                  key={ins.id}
                  className="bg-[#08080A] border border-white/10 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{ins.title}</span>
                    {ins.highlight && (
                      <span className="px-2 py-0.5 rounded-full bg-[#A3E635]/10 text-[#A3E635] text-[10px] font-semibold">
                        {ins.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{ins.description}</p>
                  {ins.actionableRecommendation && (
                    <div className="text-[11px] text-[#A3E635] bg-[#A3E635]/5 border border-[#A3E635]/15 rounded-xl p-2.5">
                      💡 {ins.actionableRecommendation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-zinc-500 mt-4 border-t border-white/5 pt-3">
          Trained on your real focus telemetry. Zero data sharing.
        </p>
      </div>
    </div>
  );
};
