'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { TelemetryBlock } from '@/lib/types';

interface NotionCalendarViewProps {
  blocks: TelemetryBlock[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export const NotionCalendarView: React.FC<NotionCalendarViewProps> = ({
  blocks,
  selectedDate,
  onSelectDate
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const [syncedGoogle, setSyncedGoogle] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleConnectGoogleCalendar = () => {
    // Generate Google Calendar export / webcal link
    const calTitle = encodeURIComponent('CHRONO Focus Study Schedule');
    const calDetails = encodeURIComponent('Live Study & Past Paper Schedule synced from CHRONO PWA');
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDetails}`;
    window.open(gCalUrl, '_blank', 'noopener,noreferrer');
    setSyncedGoogle(true);
    setTimeout(() => setSyncedGoogle(false), 5000);
  };

  // Group blocks by YYYY-MM-DD
  const blocksByDate: Record<string, TelemetryBlock[]> = {};
  blocks.forEach((b) => {
    const dStr = b.date || (b.startTime.includes('T') ? b.startTime.split('T')[0] : selectedDate);
    if (!blocksByDate[dStr]) blocksByDate[dStr] = [];
    blocksByDate[dStr].push(b);
  });

  // Today string
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 bento-surface">
      {/* Notion + Google Calendar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{monthName}</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] font-medium text-zinc-400 border border-white/10">
                Notion & Google Synced
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Interactive focus calendar, exam milestones, and deep work ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Google Calendar Connect Button */}
          <button
            onClick={handleConnectGoogleCalendar}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95"
            title="Connect / Sync to Google Calendar"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{syncedGoogle ? 'Syncing...' : 'Sync Google Calendar'}</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </button>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-[#08080A] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-zinc-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Notion Calendar Matrix */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Previous month padding */}
        {Array.from({ length: firstDay }).map((_, i) => {
          const dayNum = prevMonthDays - firstDay + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="min-h-[85px] p-2 rounded-2xl bg-white/[0.01] border border-white/[0.03] text-zinc-700 select-none"
            >
              <span className="text-[11px] font-semibold">{dayNum}</span>
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const dayBlocks = blocksByDate[dateStr] || [];

          const totalFocus = dayBlocks
            .filter((b) => b.category === 'focus')
            .reduce((acc, b) => acc + b.durationMinutes, 0);

          const totalWasted = dayBlocks
            .filter((b) => b.category === 'wasted')
            .reduce((acc, b) => acc + b.durationMinutes, 0);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[85px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all group ${
                isSelected
                  ? 'border-[#A3E635] bg-[#A3E635]/10 shadow-[0_0_15px_rgba(163,230,53,0.15)] ring-1 ring-[#A3E635]'
                  : isToday
                  ? 'border-white/20 bg-white/[0.04]'
                  : 'border-white/5 bg-[#08080A]/60 hover:border-white/15 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold tabular-nums ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-[#A3E635] text-black flex items-center justify-center font-extrabold text-[11px]'
                      : isSelected
                      ? 'text-[#A3E635]'
                      : 'text-zinc-300'
                  }`}
                >
                  {dayNum}
                </span>

                {totalFocus > 0 && (
                  <span className="text-[10px] font-semibold text-[#A3E635] tabular-nums">
                    {(totalFocus / 60).toFixed(1)}h
                  </span>
                )}
              </div>

              {/* Day Capsules */}
              <div className="space-y-1 mt-1">
                {totalFocus > 0 && (
                  <div className="h-1.5 rounded-full bg-[#A3E635]/70 w-full" title={`${totalFocus}m focus`} />
                )}
                {totalWasted > 0 && (
                  <div className="h-1.5 rounded-full bg-[#FB923C]/70 w-full" title={`${totalWasted}m wasted`} />
                )}
                {dayBlocks.length > 0 && (
                  <p className="text-[9px] text-zinc-500 font-medium truncate">
                    {dayBlocks.length} session{dayBlocks.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]" />
            <span>Focus Deep Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C]" />
            <span>Distraction Log</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500">
          Click any day to jump timeline & inspect session telemetry
        </div>
      </div>
    </div>
  );
};
