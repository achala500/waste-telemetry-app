'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import { AiInsight, TelemetryBlock } from '@/lib/types';

interface AiInsightsViewProps {
  insights: AiInsight[];
  blocks: TelemetryBlock[];
  onRefreshInsights: () => Promise<void>;
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({
  insights,
  blocks,
  onRefreshInsights
}) => {
  const [selectedLens, setSelectedLens] = useState<'all' | 'leak' | 'spiral' | 'reclaim'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshInsights();
    setIsRefreshing(false);
  };

  const toggleAction = (id: string) => {
    setCheckedActions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredInsights = insights.filter((ins) => {
    if (selectedLens === 'all') return true;
    if (selectedLens === 'leak') return ins.type === 'leak_window';
    if (selectedLens === 'spiral') return ins.type === 'spiral_chain';
    if (selectedLens === 'reclaim') return ins.type === 'reclaim_forecast';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Personal AI Coach</h1>
            <p className="text-xs text-zinc-400">Personalized focus intelligence and habit recovery</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Analyzing Logs...' : 'Refresh Insights'}</span>
        </button>
      </div>

      {/* Lens Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedLens('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            selectedLens === 'all'
              ? 'bg-white text-black shadow-md'
              : 'bg-[#141416] border border-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          All Lenses
        </button>
        <button
          onClick={() => setSelectedLens('leak')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            selectedLens === 'leak'
              ? 'bg-[#A3E635] text-black shadow-md'
              : 'bg-[#141416] border border-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          1. Leak Window Alert
        </button>
        <button
          onClick={() => setSelectedLens('spiral')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            selectedLens === 'spiral'
              ? 'bg-[#38BDF8] text-black shadow-md'
              : 'bg-[#141416] border border-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          2. Trigger-to-Spiral Chain
        </button>
        <button
          onClick={() => setSelectedLens('reclaim')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            selectedLens === 'reclaim'
              ? 'bg-[#FB923C] text-black shadow-md'
              : 'bg-[#141416] border border-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          3. 30-Day Reclaim Forecast
        </button>
      </div>

      {/* Main Content Area */}
      {blocks.length < 3 ? (
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center space-y-3 shadow-xl">
          <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Log at least 3 sessions to generate personalized AI insights</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Once you have logged 3 focus or distraction blocks, your AI Coach will identify your peak focus hours and biggest daily time drains.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {insight.type === 'leak_window'
                      ? 'Daily Leak Window'
                      : insight.type === 'spiral_chain'
                      ? 'Distraction Trigger'
                      : 'Monthly Forecast'}
                  </span>
                  {insight.highlight && (
                    <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white">
                      {insight.highlight}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{insight.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">{insight.description}</p>
              </div>

              {insight.actionableRecommendation && (
                <div className="pt-3 border-t border-white/5">
                  <div
                    onClick={() => toggleAction(insight.id)}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors ${
                        checkedActions[insight.id]
                          ? 'bg-[#A3E635] border-[#A3E635] text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {checkedActions[insight.id] && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-xs text-zinc-300 leading-snug">
                      {insight.actionableRecommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
