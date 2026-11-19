'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetryStore, telemetryStore } from '@/lib/telemetryStore';
import { NavigationRail, NavViewId } from '@/components/NavigationRail';
import { TopCommandBar } from '@/components/TopCommandBar';
import { KpiBentoCards } from '@/components/KpiBentoCards';
import { Timeline24Hour } from '@/components/Timeline24Hour';
import { WeeklyOverviewSplit } from '@/components/WeeklyOverviewSplit';
import { HeatmapView } from '@/components/HeatmapView';
import { AiInsightsView } from '@/components/AiInsightsView';
import { LogLedgerView } from '@/components/LogLedgerView';
import { QuickLogModal } from '@/components/QuickLogModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { AuthModal } from '@/components/AuthModal';
import { submitFeedbackTicket } from '@/lib/feedbackService';
import { MessageSquare } from 'lucide-react';

export default function ChronoApp() {
  const state = useTelemetryStore();
  const [activeView, setActiveView] = useState<NavViewId>('dashboard');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();

  const currentDate = new Date(`${state.selectedDate}T00:00:00`);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsLogModalOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        telemetryStore.stepDate(0);
      } else if (e.key === '[') {
        e.preventDefault();
        telemetryStore.stepDate(-1);
      } else if (e.key === ']') {
        e.preventDefault();
        telemetryStore.stepDate(1);
      } else if (e.key === 'Escape') {
        setIsLogModalOpen(false);
        setIsFeedbackOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const metrics = telemetryStore.getDailyKpiMetrics(state.selectedDate);
  const weeklyData = telemetryStore.getWeeklyActivitySummary();
  const heatmapData = telemetryStore.get7x18HeatmapData();

  const totalWeeklyFocusHours = weeklyData.reduce(
    (acc, d) => acc + d.focusMinutes / 60,
    0
  );

  const handleOpenQuickLogAtTime = (timeStr: string) => {
    setPrefilledTime(timeStr);
    setIsLogModalOpen(true);
  };

  const handleFeedbackSubmit = async (feedback: {
    category: 'bug' | 'feature' | 'ux' | 'other';
    description: string;
    annotatedScreenshotUrl?: string;
  }) => {
    try {
      await submitFeedbackTicket({
        category: feedback.category,
        description: feedback.description,
        annotatedScreenshotUrl: feedback.annotatedScreenshotUrl,
        userEmail: state.user?.email || undefined,
        userName: state.user?.displayName || undefined
      });
    } catch {
      // offline safe
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      {/* Left Navigation Rail (4 items only) */}
      <NavigationRail
        activeView={activeView}
        onSelectView={setActiveView}
        syncStatus={state.isSyncing ? 'syncing' : state.isOnline ? 'live' : 'offline'}
        todayDistractionCount={metrics.distractionCount}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
        {/* Top Command Bar */}
        <TopCommandBar
          onQuickLog={(input) => telemetryStore.parseAndAddQuickLog(input)}
          stopwatchRunning={state.stopwatch.isRunning && !state.stopwatch.isPaused}
          stopwatchElapsedSeconds={state.stopwatch.elapsedSeconds}
          stopwatchLabel={state.stopwatch.currentLabel}
          onStartStopwatch={() => telemetryStore.startStopwatch()}
          onPauseStopwatch={() => telemetryStore.pauseStopwatch()}
          onDoneStopwatch={() => telemetryStore.stopAndSaveStopwatch()}
          onOpenLogModal={() => {
            setPrefilledTime(undefined);
            setIsLogModalOpen(true);
          }}
          scope={state.filterScope === '7d' ? '7d' : 'day'}
          onScopeChange={(scope) => telemetryStore.setFilterScope(scope)}
          currentDate={currentDate}
          onStepDate={(dir) => telemetryStore.stepDate(dir)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          {activeView === 'dashboard' && (
            <>
              {/* Row 1: 4 KPI Bento Cards */}
              <KpiBentoCards
                metrics={metrics}
                onGoalChange={(newGoal) => telemetryStore.setFocusGoal(newGoal)}
              />

              {/* Row 2: Today's Timeline */}
              <Timeline24Hour
                blocks={state.blocks}
                selectedDate={state.selectedDate}
                onOpenQuickLogAtTime={handleOpenQuickLogAtTime}
              />

              {/* Row 3: Split View (Weekly Overview & Personal AI Coach) */}
              <WeeklyOverviewSplit
                weeklyData={weeklyData}
                heatmapData={heatmapData}
                insights={state.insights}
                totalWeeklyFocusHours={totalWeeklyFocusHours}
                totalLogsCount={state.blocks.length}
              />
            </>
          )}

          {activeView === 'timeline' && (
            <div className="space-y-6">
              <Timeline24Hour
                blocks={state.blocks}
                selectedDate={state.selectedDate}
                onOpenQuickLogAtTime={handleOpenQuickLogAtTime}
              />
              <LogLedgerView
                blocks={state.blocks}
                selectedDate={state.selectedDate}
                onDeleteBlock={(id) => telemetryStore.deleteBlock(id)}
                onUpdateBlock={(id, updates) => telemetryStore.updateBlock(id, updates)}
              />
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="space-y-6">
              <HeatmapView
                heatmapData={heatmapData}
                weeklyData={weeklyData}
                blocks={state.blocks}
              />
            </div>
          )}

          {activeView === 'insights' && (
            <div className="space-y-6">
              <AiInsightsView
                insights={state.insights}
                blocks={state.blocks}
                onRefreshInsights={async () => {
                  await telemetryStore.refreshInsights();
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Floating Share Feedback Button */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-30 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#141416] hover:bg-[#1f1f23] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white shadow-2xl transition-all active:scale-95"
        title="Share Feedback & Report Issues"
      >
        <MessageSquare className="w-4 h-4 text-[#A3E635]" />
        <span className="hidden sm:inline">Share Feedback</span>
      </button>

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        selectedDate={state.selectedDate}
        prefilledTime={prefilledTime}
        onSave={(block) => {
          telemetryStore.addBlock(block);
          setIsLogModalOpen(false);
        }}
      />

      {/* Visual Feedback Hub + Annotation Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Account & Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
