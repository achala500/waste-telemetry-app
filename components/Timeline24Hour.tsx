'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit3, Sparkles } from 'lucide-react';
import { TelemetryBlock, BlockCategory, SubjectTag } from '@/lib/types';
import { telemetryStore } from '@/lib/telemetryStore';

interface Timeline24HourProps {
  blocks: TelemetryBlock[];
  selectedDate: string;
  onOpenQuickLogAtTime?: (timeStr: string) => void;
}

interface LayoutBlock {
  block: TelemetryBlock;
  startMins: number;
  durMins: number;
  endMins: number;
  trackIndex: number;
  totalTracks: number;
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

  // Filter blocks for selected date using local timezone matching
  const dayBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (b.startTime && b.startTime.includes('T')) {
        const d = new Date(b.startTime);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}` === selectedDate;
        }
      }
      return (b.date || b.startTime.split('T')[0]) === selectedDate;
    });
  }, [blocks, selectedDate]);

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
      const d = new Date(b.startTime);
      if (!isNaN(d.getTime())) startStr = formatClockTime(d);
    } else {
      startStr = b.startTime.slice(0, 5);
    }

    if (b.endTime && b.endTime.includes('T')) {
      const d = new Date(b.endTime);
      if (!isNaN(d.getTime())) endStr = formatClockTime(d);
    } else if (b.endTime) {
      endStr = b.endTime.slice(0, 5);
    } else {
      const dur = b.durationMinutes || 30;
      const [h, m] = startStr.split(':').map((x) => parseInt(x, 10));
      const endTotal = (h || 0) * 60 + (m || 0) + dur;
      endStr = `${Math.floor((endTotal / 60) % 24).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;
    }

    return `${startStr} – ${endStr}`;
  };

  // Compute overlapping lanes / tracks for side-by-side rendering
  const layoutBlocks = useMemo<LayoutBlock[]>(() => {
    if (dayBlocks.length === 0) return [];

    const parsed = dayBlocks.map((b) => {
      const startMins = Math.max(0, getMinutesFromDayStart(b.startTime));
      const durMins = Math.max(15, b.durationMinutes || 30);
      const endMins = startMins + durMins;
      return { block: b, startMins, durMins, endMins };
    });

    // Sort by startMins ascending
    parsed.sort((a, b) => a.startMins - b.startMins);

    // Track assignment
    const tracks: number[] = []; // tracks[i] = endMins of last block in track i
    const assigned = parsed.map((item) => {
      let chosenTrack = -1;
      for (let t = 0; t < tracks.length; t++) {
        if (tracks[t] <= item.startMins) {
          chosenTrack = t;
          tracks[t] = item.endMins;
          break;
        }
      }
      if (chosenTrack === -1) {
        chosenTrack = tracks.length;
        tracks.push(item.endMins);
      }
      return {
        ...item,
        trackIndex: chosenTrack,
        totalTracks: 1 // updated below
      };
    });

    // Compute total tracks for each overlapping cluster
    for (let i = 0; i < assigned.length; i++) {
      let maxTrackInCluster = assigned[i].trackIndex;
      for (let j = 0; j < assigned.length; j++) {
        if (i !== j) {
          // Check if intervals overlap
          if (assigned[i].startMins < assigned[j].endMins && assigned[j].startMins < assigned[i].endMins) {
            maxTrackInCluster = Math.max(maxTrackInCluster, assigned[j].trackIndex);
          }
        }
      }
      assigned[i].totalTracks = maxTrackInCluster + 1;
    }

    return assigned;
  }, [dayBlocks]);

  const maxTotalTracks = useMemo(() => {
    return Math.max(1, ...layoutBlocks.map((b) => b.totalTracks));
  }, [layoutBlocks]);

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

  const handleTimelineClick = () => {
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

  const handleAddPreset = (
    label: string,
    category: BlockCategory,
    tag: string,
    durationMinutes: number,
    subject?: SubjectTag
  ) => {
    const now = new Date();
    telemetryStore.addBlock({
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: label,
      category,
      tag,
      subject,
      durationMinutes,
      startTime: now.toISOString(),
      date: selectedDate,
      source: 'manual'
    });
    setToastMessage(`Added ${label} (${durationMinutes}m)`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Canvas height dynamically scales with overlapping tracks
  const canvasHeight = Math.max(140, 48 + maxTotalTracks * 44);

  return (
    <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Today's Timeline</h2>
          <p className="text-xs text-zinc-400">06:00 – 24:00 daily schedule</p>
        </div>

        {/* 1-Tap Preset Quick Chips with Subject Support */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleAddPreset('Deep Work', 'focus', 'Study', 45, 'Combined Maths')}
            className="px-3 py-1.5 rounded-xl bg-[#A3E635]/15 hover:bg-[#A3E635]/25 border border-[#A3E635]/30 text-xs font-semibold text-[#A3E635] transition-all active:scale-95 shadow-sm"
          >
            +45m Deep Work
          </button>
          <button
            onClick={() => handleAddPreset('Physics Revision', 'focus', 'Study', 50, 'Physics')}
            className="px-3 py-1.5 rounded-xl bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/30 text-xs font-semibold text-[#38BDF8] transition-all active:scale-95 shadow-sm"
          >
            +50m Physics
          </button>
          <button
            onClick={() => handleAddPreset('Past Paper Drill', 'focus', 'Exam', 120, 'Past Paper')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all active:scale-95 shadow-sm"
          >
            +2h Past Paper
          </button>
          <button
            onClick={() => handleAddPreset('Pomodoro Sprint', 'focus', 'Study', 25, 'Revision')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95"
          >
            +25m Pomodoro
          </button>
          <button
            onClick={() => handleAddPreset('Instagram Reels', 'wasted', 'Social', 30)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-300 transition-all active:scale-95"
          >
            +30m Reels
          </button>
        </div>
      </div>

      {/* Timeline Interactive Canvas - Fluid, no desktop horizontal scrollbar */}
      <div className="relative w-full pb-2 pt-2">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleTimelineClick}
          style={{ height: `${canvasHeight}px` }}
          className="relative w-full bg-[#08080A] border border-white/10 rounded-2xl p-2 cursor-crosshair select-none overflow-hidden"
        >
          {/* Hour Grid Markers - Even hours only to prevent 06:0007:00 axis collision */}
          <div className="absolute inset-x-3 top-0 bottom-6 flex justify-between pointer-events-none">
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
              const hourNum = START_HOUR + i;
              const hourStr = `${hourNum.toString().padStart(2, '0')}:00`;
              const isFirst = i === 0;
              const isLast = i === TOTAL_HOURS;
              const showText = hourNum % 2 === 0; // 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00, 24:00

              return (
                <div key={i} className="flex flex-col items-center h-full relative">
                  <div className={`w-px h-full ${showText ? 'bg-white/10' : 'bg-white/5'}`} />
                  {showText && (
                    <span
                      className={`absolute bottom-0 text-[10px] text-zinc-500 font-medium tabular-nums ${
                        isFirst
                          ? 'left-0 text-left'
                          : isLast
                          ? 'right-0 text-right'
                          : '-translate-x-1/2 text-center'
                      }`}
                    >
                      {hourStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Needle with Glowing Pill Indicator */}
          {liveNeedleMinutes !== null && (
            <div
              className="absolute top-0 bottom-6 w-0.5 bg-[#A3E635] pointer-events-none z-20 shadow-[0_0_12px_#A3E635]"
              style={{ left: `${(liveNeedleMinutes / TOTAL_MINUTES) * 100}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#A3E635] text-black text-[9px] font-bold shadow-md">
                NOW
              </div>
            </div>
          )}

          {/* Hover Crosshair */}
          {hoverX !== null && hoverTime && (
            <div
              className="absolute top-0 bottom-6 w-px bg-white/30 pointer-events-none z-10"
              style={{ left: `${hoverX}px` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-800 text-white text-[9px] font-semibold border border-white/20">
                + {hoverTime}
              </div>
            </div>
          )}

          {/* Timeline Cards Container - True Side-by-Side Columns on Overlap */}
          <div className="absolute inset-x-3 top-2 bottom-8">
            {layoutBlocks.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 pointer-events-none">
                Click anywhere on the timeline or use +45m Deep Work above to log a session
              </div>
            ) : (
              layoutBlocks.map((item) => {
                const { block, startMins, durMins, trackIndex, totalTracks } = item;
                const leftPct = (startMins / TOTAL_MINUTES) * 100;
                const widthPct = Math.max(4, (durMins / TOTAL_MINUTES) * 100);

                const isFocus = block.category === 'focus';
                const isWasted = block.category === 'wasted';

                // True horizontal lane distribution: each overlapping block gets its own horizontal row
                const totalHeightAvailable = canvasHeight - 44;
                const laneHeight = totalTracks > 1
                  ? Math.max(34, Math.floor((totalHeightAvailable - (totalTracks - 1) * 4) / totalTracks))
                  : totalHeightAvailable;
                const topPx = 2 + trackIndex * (laneHeight + 4);

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
                      minWidth: '65px',
                      top: `${topPx}px`,
                      height: `${laneHeight}px`
                    }}
                    className={`absolute rounded-xl px-2 py-1 border shadow-md flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] hover:z-30 overflow-hidden ${
                      isFocus
                        ? 'bg-[#182613]/95 border-[#A3E635]/40 text-[#A3E635]'
                        : isWasted
                        ? 'bg-[#291316]/95 border-rose-500/40 text-rose-300'
                        : 'bg-[#131c26]/95 border-[#38BDF8]/40 text-[#38BDF8]'
                    }`}
                  >
                    {/* Line 1: Time Range + Subject Tag */}
                    <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 tabular-nums leading-none">
                      <span className="truncate">{getBlockTimeRange(block)}</span>
                      {block.subject && (
                        <span className="ml-1 px-1 rounded bg-white/10 text-white text-[8px] font-bold shrink-0">
                          {block.subject}
                        </span>
                      )}
                    </div>

                    {/* Line 2: Full Bold Title */}
                    <div className="text-xs font-bold text-white truncate leading-tight my-auto">
                      {block.title || block.label}
                    </div>

                    {/* Line 3: Duration */}
                    <div className="text-[9px] font-medium opacity-80 leading-none truncate">
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
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{selectedBlock.title || selectedBlock.label}</span>
              {selectedBlock.subject && (
                <span className="px-2 py-0.5 rounded-md bg-[#A3E635]/15 text-[#A3E635] text-[10px] font-semibold">
                  {selectedBlock.subject}
                </span>
              )}
            </div>
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

            {/* Category Switchers */}
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
