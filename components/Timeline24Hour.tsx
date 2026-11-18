'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit3, Sparkles } from 'lucide-react';
import { TelemetryBlock, BlockCategory } from '@/lib/types';
import { telemetryStore } from '@/lib/telemetryStore';

interface Timeline24HourProps {
  blocks: TelemetryBlock[];
  selectedDate: string;
  onOpenQuickLogAtTime?: (timeStr: string) => void;
}

export const Timeline24Hour: React.FC<Timeline24HourProps> = ({
  blocks,
  selectedDate,
  onOpenQuickLogAtTime
}) => {
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TelemetryBlock | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastDeletedBlock, setLastDeletedBlock] = useState<TelemetryBlock | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Timeline hours from 06:00 to 24:00 (18 hours total = 1080 minutes)
  const START_HOUR = 6;
  const END_HOUR = 24;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;

  // Filter blocks for selected date
  const dayBlocks = blocks.filter((b) => {
    const blockDate = b.startTime.includes('T') ? b.startTime.split('T')[0] : b.date;
    return blockDate === selectedDate;
  });

  const getMinutesFromDayStart = (timeStr: string): number => {
    const dateObj = new Date(timeStr);
    let hours = 0;
    let minutes = 0;
    if (!isNaN(dateObj.getTime())) {
      hours = dateObj.getHours();
      minutes = dateObj.getMinutes();
    } else {
      const parts = timeStr.split(':');
      hours = parseInt(parts[0] || '0', 10);
      minutes = parseInt(parts[1] || '0', 10);
    }
    return (hours - START_HOUR) * 60 + minutes;
  };

  const formatClockTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getBlockTimeRange = (b: TelemetryBlock) => {
    let startStr = '00:00';
    let endStr = '00:00';

    if (b.startTime.includes('T')) {
      startStr = formatClockTime(new Date(b.startTime));
    } else {
      startStr = b.startTime;
    }

    if (b.endTime && b.endTime.includes('T')) {
      endStr = formatClockTime(new Date(b.endTime));
    } else if (b.endTime) {
      endStr = b.endTime;
    } else {
      const dur = b.durationMinutes || 30;
      const [h, m] = startStr.split(':').map((x) => parseInt(x, 10));
      const endTotal = h * 60 + m + dur;
      endStr = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;
    }

    return `${startStr} – ${endStr}`;
  };

  // Live needle calculation
  const [liveNeedleMinutes, setLiveNeedleMinutes] = useState<number | null>(null);
  useEffect(() => {
    const updateNeedle = () => {
      const now = new Date();
      const nowMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      if (nowMinutes >= 0 && nowMinutes <= TOTAL_MINUTES) {
        setLiveNeedleMinutes(nowMinutes);
      } else {
        setLiveNeedleMinutes(null);
      }
    };
    updateNeedle();
    const interval = setInterval(updateNeedle, 30000);
    return () => clearInterval(interval);
  }, [START_HOUR, TOTAL_MINUTES]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const totalMins = Math.round(pct * TOTAL_MINUTES);
    const hour = Math.floor(totalMins / 60) + START_HOUR;
    const min = totalMins % 60;
    setHoverTime(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverX(null);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTime && onOpenQuickLogAtTime) {
      onOpenQuickLogAtTime(hoverTime);
    }
  };

  const handleNudge = (block: TelemetryBlock, minutesDelta: number) => {
    const newDuration = Math.max(5, block.durationMinutes + minutesDelta);
    telemetryStore.updateBlock(block.id, { durationMinutes: newDuration });
    setSelectedBlock(null);
    setToastMessage(`Adjusted by ${minutesDelta > 0 ? '+15m' : '-15m'}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleDelete = (block: TelemetryBlock) => {
    setLastDeletedBlock(block);
    telemetryStore.deleteBlock(block.id);
    setSelectedBlock(null);
    setToastMessage('Session deleted');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUndoDelete = () => {
    if (lastDeletedBlock) {
      telemetryStore.addBlock(lastDeletedBlock);
      setLastDeletedBlock(null);
      setToastMessage('Session restored');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleTagSwitch = (block: TelemetryBlock, category: BlockCategory) => {
    telemetryStore.updateBlock(block.id, { category });
    setSelectedBlock(null);
    setToastMessage(`Updated category to ${category}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleAddPreset = (label: string, category: BlockCategory, tag: string, durationMinutes: number) => {
    const now = new Date();
    const startStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    telemetryStore.addBlock({
      id: `block_${Date.now()}`,
      title: label,
      category,
      tag,
      durationMinutes,
      startTime: now.toISOString(),
      date: selectedDate,
      source: 'manual'
    });
    setToastMessage(`Added ${label} (${durationMinutes}m)`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  return (
    <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Today's Timeline</h2>
          <p className="text-xs text-zinc-400">06:00 – 00:00 full daily schedule</p>
        </div>

        {/* 1-Tap Preset Quick Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleAddPreset('Deep Work', 'focus', 'Engineering', 45)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95"
          >
            +45m Deep Work
          </button>
          <button
            onClick={() => handleAddPreset('Pomodoro', 'focus', 'Study', 25)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95"
          >
            +25m Pomodoro
          </button>
          <button
            onClick={() => handleAddPreset('Team Sync', 'routine', 'Meeting', 15)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95"
          >
            +15m Sync
          </button>
          <button
            onClick={() => handleAddPreset('Instagram Reels', 'wasted', 'Social', 30)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-300 transition-all active:scale-95"
          >
            +30m Reels
          </button>
        </div>
      </div>

      {/* Timeline Interactive Canvas */}
      <div className="relative overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-thin">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleTimelineClick}
          className="relative min-w-[1000px] h-36 bg-[#08080A] border border-white/10 rounded-2xl p-2 cursor-crosshair select-none"
        >
          {/* Hour Grid Markers */}
          <div className="absolute inset-x-2 top-0 bottom-6 flex justify-between pointer-events-none">
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
              const hourNum = START_HOUR + i;
              const hourStr = `${hourNum.toString().padStart(2, '0')}:00`;
              return (
                <div key={i} className="flex flex-col items-center h-full">
                  <div className="w-px h-full bg-white/5" />
                  <span className="text-[10px] text-zinc-500 font-medium tabular-nums mt-1">
                    {hourStr}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Needle with Glowing Pill Indicator */}
          {liveNeedleMinutes !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#A3E635] pointer-events-none z-20 shadow-[0_0_12px_#A3E635]"
              style={{ left: `${(liveNeedleMinutes / TOTAL_MINUTES) * 100}%` }}
            >
              <div className="absolute -top-3 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#A3E635] text-black text-[9px] font-bold shadow-md">
                NOW
              </div>
            </div>
          )}

          {/* Hover Crosshair */}
          {hoverX !== null && hoverTime && (
            <div
              className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none z-10"
              style={{ left: `${hoverX}px` }}
            >
              <div className="absolute -top-3 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-800 text-white text-[9px] font-semibold border border-white/20">
                + {hoverTime}
              </div>
            </div>
          )}

          {/* Timeline Cards Container */}
          <div className="absolute inset-x-2 top-3 bottom-8 flex items-center">
            {dayBlocks.length === 0 ? (
              <div className="w-full flex items-center justify-center text-xs text-zinc-500 py-6 pointer-events-none">
                Log your first focus or distraction block above
              </div>
            ) : (
              dayBlocks.map((block) => {
                const startMins = Math.max(0, getMinutesFromDayStart(block.startTime));
                const dur = block.durationMinutes || 30;
                const leftPct = (startMins / TOTAL_MINUTES) * 100;
                const widthPct = Math.max(14, (dur / TOTAL_MINUTES) * 100);

                const isFocus = block.category === 'focus';
                const isWasted = block.category === 'wasted';

                return (
                  <div
                    key={block.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlock(block);
                    }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '140px',
                      height: '84px'
                    }}
                    className={`absolute rounded-2xl p-2.5 border shadow-md flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:z-30 ${
                      isFocus
                        ? 'bg-[#182613] border-[#A3E635]/40 text-[#A3E635]'
                        : isWasted
                        ? 'bg-[#291316] border-rose-500/40 text-rose-300'
                        : 'bg-[#131c26] border-[#38BDF8]/40 text-[#38BDF8]'
                    }`}
                  >
                    {/* Line 1: Time Range */}
                    <div className="text-[10px] font-medium text-zinc-400 tabular-nums leading-none">
                      {getBlockTimeRange(block)}
                    </div>

                    {/* Line 2: Full Bold Title (NO 3-letter stubs or truncation) */}
                    <div className="text-xs font-bold text-white truncate leading-tight mt-1">
                      {block.title || block.label}
                    </div>

                    {/* Line 3: Duration + Tag */}
                    <div className="text-[10px] font-medium opacity-90 leading-none mt-1">
                      {block.durationMinutes}m • {block.tag || (isFocus ? 'Focus' : isWasted ? 'Distraction' : 'Routine')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected Block Inspection Popover */}
      {selectedBlock && (
        <div className="bg-[#08080A] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-150">
          <div>
            <div className="text-xs text-zinc-400">{getBlockTimeRange(selectedBlock)}</div>
            <div className="text-sm font-bold text-white mt-0.5">{selectedBlock.title || selectedBlock.label}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {selectedBlock.durationMinutes} minutes • Category: <span className="capitalize text-zinc-300">{selectedBlock.category}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* -15m / +15m Nudge */}
            <button
              onClick={() => handleNudge(selectedBlock, -15)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
            >
              -15m
            </button>
            <button
              onClick={() => handleNudge(selectedBlock, 15)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
            >
              +15m
            </button>

            {/* Tag Switchers */}
            <button
              onClick={() => handleTagSwitch(selectedBlock, 'focus')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                selectedBlock.category === 'focus' ? 'bg-[#A3E635] text-black border-[#A3E635]' : 'bg-white/5 border-white/10 text-zinc-300'
              }`}
            >
              Focus
            </button>
            <button
              onClick={() => handleTagSwitch(selectedBlock, 'wasted')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                selectedBlock.category === 'wasted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white/5 border-white/10 text-zinc-300'
              }`}
            >
              Wasted
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(selectedBlock)}
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 ml-2"
              title="Delete session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedBlock(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-zinc-300 hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-white/20 text-xs text-white shadow-2xl">
          <span>{toastMessage}</span>
          {lastDeletedBlock && (
            <button
              onClick={handleUndoDelete}
              className="text-[#A3E635] font-semibold hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
};
