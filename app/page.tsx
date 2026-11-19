'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetryStore, telemetryStore } from '@/lib/telemetryStore';
import { NavigationRail, NavViewId } from '@/components/NavigationRail';
import { TopCommandBar } from '@/components/TopCommandBar';
import { KpiBentoCards } from '@/components/KpiBentoCards';
import { Timeline24Hour } from '@/components/Timeline24Hour';
import { WeeklyOverviewSplit } from '@/components/WeeklyOverviewSplit';
import { HeatmapView } from '@/components/HeatmapView';
import { StudyRoiCalculator } from '@/components/StudyRoiCalculator';
import { LeaderboardView } from '@/components/LeaderboardView';
import { LogLedgerView } from '@/components/LogLedgerView';
import { QuickLogModal } from '@/components/QuickLogModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { AuthModal } from '@/components/AuthModal';
import { submitFeedbackTicket } from '@/lib/feedbackService';

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
              <StudyRoiCalculator />
              <HeatmapView
                heatmapData={heatmapData}
                weeklyData={weeklyData}
                blocks={state.blocks}
              />
            </div>
          )}

          {activeView === 'leaderboard' && (
            <div className="space-y-6">
              <LeaderboardView />
            </div>
          )}
        </main>
      </div>

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
