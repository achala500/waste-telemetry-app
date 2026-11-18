'use client';

import React from 'react';
import { TelemetryState } from '../lib/telemetryStore';
import { telemetryStore } from '../lib/telemetryStore';
import { KpiBentoCards } from './KpiBentoCards';
import { Timeline24Hour } from './Timeline24Hour';
import { WeeklyOverviewSplit } from './WeeklyOverviewSplit';

export interface DashboardViewProps {
  state: TelemetryState;
  onOpenLogModal?: () => void;
  onOpenSetup?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onOpenLogModal,
  onOpenSetup,
}) => {
  const metrics = telemetryStore.getDailyKpiMetrics(state.selectedDate);
  const weeklySummary = telemetryStore.getWeeklySummary();
  const heatmapMatrix = telemetryStore.getHeatmapMatrix();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* ================= ROW 1: KPI BENTO CARDS ================= */}
      <section aria-label="Daily Key Performance Indicators">
        <KpiBentoCards
          metrics={metrics}
          onGoalChange={(goal) => telemetryStore.setFocusGoal(goal)}
        />
      </section>

      {/* ================= ROW 2: 24H INTERACTIVE TIMELINE ================= */}
      <section aria-label="24-Hour Telemetry Timeline">
        <Timeline24Hour
          blocks={state.blocks}
          selectedDate={state.selectedDate}
        />
      </section>

      {/* ================= ROW 3: WEEKLY ACTIVITY & AI INSIGHTS SPLIT ================= */}
      <section aria-label="Weekly Activity and AI Telemetry Insights">
        <WeeklyOverviewSplit
          weeklyData={weeklySummary}
          heatmapCells={heatmapMatrix}
          insights={state.insights}
        />
      </section>

      {/* Empty State Banner if no blocks recorded */}
      {state.blocks.length === 0 && (
        <div className="p-8 rounded-2xl bg-[#141416] border border-white/[0.08] text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#A3E635]/10 flex items-center justify-center text-[#A3E635]">
            ⚡
          </div>
          <h3 className="text-base font-bold font-mono text-white">
            Zero Telemetry Blocks Present
          </h3>
          <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
            Your telemetry canvas is clean. Quick log sessions using the top command bar, tap presets, or connect iOS Shortcuts to stream live telemetry.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onOpenLogModal}
              className="px-4 py-2 rounded-xl bg-[#A3E635] text-black font-semibold font-mono text-xs hover:bg-[#bef452] transition-all"
            >
              + Log First Block (N)
            </button>
            <button
              onClick={onOpenSetup}
              className="px-4 py-2 rounded-xl bg-white/[0.08] text-white font-mono text-xs hover:bg-white/[0.14] transition-all"
            >
              Setup iOS Shortcut Bridge
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
