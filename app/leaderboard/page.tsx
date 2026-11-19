'use client';

import React, { useState } from 'react';
import { NavigationRail } from '@/components/NavigationRail';
import { TopCommandBar } from '@/components/TopCommandBar';
import { LeaderboardView } from '@/components/LeaderboardView';
import { QuickLogModal } from '@/components/QuickLogModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { AuthModal } from '@/components/AuthModal';
import { useTelemetryStore, telemetryStore } from '@/lib/telemetryStore';
import { submitFeedbackTicket } from '@/lib/feedbackService';

export default function LeaderboardPage() {
  const state = useTelemetryStore();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();

  const currentDate = new Date(`${state.selectedDate}T00:00:00`);
  const metrics = telemetryStore.getDailyKpiMetrics(state.selectedDate);

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
      <NavigationRail
        activeView="leaderboard"
        syncStatus={state.isSyncing ? 'syncing' : state.isOnline ? 'live' : 'offline'}
        todayDistractionCount={metrics.distractionCount}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
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

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          <LeaderboardView />
        </main>
      </div>

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

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
