'use client';

import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { NavigationRail } from '@/components/NavigationRail';
import { TopCommandBar } from '@/components/TopCommandBar';
import { Timeline24Hour } from '@/components/Timeline24Hour';
import { LogLedgerView } from '@/components/LogLedgerView';
import { QuickLogModal } from '@/components/QuickLogModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { AuthModal } from '@/components/AuthModal';
import { NotionCalendarView } from '@/components/NotionCalendarView';
import { useTelemetryStore, telemetryStore } from '@/lib/telemetryStore';

export default function TimelinePage() {
  const state = useTelemetryStore();
  const [displayMode, setDisplayMode] = useState<'timeline' | 'calendar'>('timeline');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();

  const currentDate = new Date(`${state.selectedDate}T00:00:00`);
  const metrics = telemetryStore.getDailyKpiMetrics(state.selectedDate);

  const handleOpenQuickLogAtTime = (timeStr: string) => {
    setPrefilledTime(timeStr);
    setIsLogModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      <NavigationRail
        activeView="timeline"
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
          {/* Mode Switcher: 24H Timeline vs Notion Calendar Grid */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="inline-flex p-1 bg-[#141416] border border-white/10 rounded-2xl">
              <button
                onClick={() => setDisplayMode('timeline')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  displayMode === 'timeline'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>24-Hour Timeline</span>
              </button>

              <button
                onClick={() => setDisplayMode('calendar')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  displayMode === 'calendar'
                    ? 'bg-[#A3E635] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Notion Calendar & Sync</span>
              </button>
            </div>

            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              {displayMode === 'timeline' ? 'Linear 24-Hour Day View' : 'Multi-Day Matrix & Google Calendar'}
            </span>
          </div>

          {displayMode === 'timeline' ? (
            <>
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
            </>
          ) : (
            <NotionCalendarView
              blocks={state.blocks}
              selectedDate={state.selectedDate}
              onSelectDate={(date) => telemetryStore.setSelectedDate(date)}
            />
          )}
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
        onSubmit={async () => {}}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
