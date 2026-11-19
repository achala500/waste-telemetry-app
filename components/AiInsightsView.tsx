'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight, BookOpen, Brain, ShieldAlert } from 'lucide-react';
import { AiInsight, TelemetryBlock } from '@/lib/types';
import { telemetryStore, useTelemetryStore } from '@/lib/telemetryStore';

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
  const storeState = useTelemetryStore();
  const [selectedLens, setSelectedLens] = useState<'all' | 'leak' | 'spiral' | 'reclaim' | 'subject'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const subjectBreakdown = telemetryStore.getSubjectBreakdown();

  // Auto-generate on mount if blocks >= 3 and no insights loaded yet
  useEffect(() => {
    if (blocks.length >= 3 && insights.length === 0 && !hasAttempted && !isRefreshing) {
      setHasAttempted(true);
      handleRefresh();
    }
  }, [blocks.length, insights.length, hasAttempted]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      await onRefreshInsights();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Unable to analyze logs. Retrying with deterministic engine...');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleAction = (id: string) => {
    setCheckedActions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredInsights = insights.filter((ins) => {
    if (selectedLens === 'all') return true;
    if (selectedLens === 'leak') return ins.type === 'leak_window';
    if (selectedLens === 'spiral') return ins.type === 'spiral_chain';
    if (selectedLens === 'reclaim') return ins.type === 'reclaim_forecast';
    if (selectedLens === 'subject') return ins.type === 'subject_balance' || ins.tags?.includes('subject');
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635] shadow-[0_0_12px_rgba(163,230,53,0.25)]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Personal AI Coach</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/20">
                Gemini 3.8 Flash
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Behavioral focus intelligence, distraction recovery, and A/L study balance</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all disabled:opacity-50 shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Analyzing Telemetry...' : 'Refresh Insights'}</span>
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
          2. Distraction Spiral
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
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Log at least 3 sessions to generate personalized AI insights</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              You currently have {blocks.length} {blocks.length === 1 ? 'session' : 'sessions'} logged. Once you log 3 focus or distraction blocks, Gemini 3.8 Flash will uncover your peak focus windows and distraction patterns.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/?log=true';
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <span>+ Log Session Now</span>
          </button>
        </div>
      ) : isRefreshing ? (
        /* Shimmer Loading State */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 animate-pulse"
            >
              <div className="h-4 bg-white/10 rounded-md w-1/3" />
              <div className="h-6 bg-white/15 rounded-md w-3/4" />
              <div className="h-16 bg-white/5 rounded-xl w-full" />
              <div className="h-10 bg-white/10 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        /* Empty / Retry Prompt instead of Blank Screen */
        <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#A3E635]/10 border border-[#A3E635]/20 flex items-center justify-center mx-auto text-[#A3E635]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Ready to Generate Insights</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Your {blocks.length} telemetry records are ready for analysis with Gemini 3.8 Flash.
            </p>
          </div>
          {errorMessage && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl max-w-sm mx-auto">
              {errorMessage}
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="px-5 py-2.5 rounded-2xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all shadow-md inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Real Insights</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3 Core AI Cards */}
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

          {/* Student Subject Study Balance Coaching Card */}
          <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Student Subject Distribution Analysis</h3>
                  <p className="text-xs text-zinc-400">Weekly allocation across core subjects and exam preparation</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#A3E635] bg-[#A3E635]/10 px-2.5 py-1 rounded-full border border-[#A3E635]/20">
                Exam Readiness
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {subjectBreakdown.map((s) => (
                <div key={s.subject} className="bg-[#08080A] border border-white/5 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span className="truncate">{s.subject}</span>
                    <span className="tabular-nums text-white">{s.hours}h</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{s.percentage}% of study time</span>
                    <span>{s.minutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
