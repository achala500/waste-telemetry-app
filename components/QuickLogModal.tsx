'use client';

import React, { useState, useEffect } from 'react';
import { BlockCategory } from '../lib/types';
import { telemetryStore } from '../lib/telemetryStore';

export interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: string;
  prefilledTime?: string;
  onSave?: (block: any) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
  prefilledTime,
  onSave,
}) => {
  const [mode, setMode] = useState<'quick' | 'manual'>('quick');
  const [quickText, setQuickText] = useState('');
  
  // Manual fields
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<BlockCategory>('focus');
  const [tag, setTag] = useState('Engineering');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    await telemetryStore.parseAndAddQuickLog(quickText.trim());
    setQuickText('');
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now.getTime() - duration * 60 * 1000).toISOString();

    const blockPayload = {
      label: label.trim(),
      category,
      tag,
      durationMinutes: duration,
      startTime: start,
      endTime: end,
      notes: notes.trim() || undefined,
      source: 'manual' as const,
    };

    if (onSave) {
      onSave(blockPayload);
    } else {
      await telemetryStore.addBlock(blockPayload);
    }

    setLabel('');
    setNotes('');
    if (onSuccess) onSuccess();
    onClose();
  };

  const durationPresets = [15, 25, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141416] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-5 spring-popover">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635] shadow-[0_0_8px_#A3E635]" />
            <h2 className="text-base font-bold font-mono tracking-wider uppercase text-zinc-100">
              Log Telemetry Block
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-black/40 rounded-xl border border-white/[0.06] flex text-xs font-mono">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-lg tag-switcher-spring btn-tactile flex items-center justify-center ${
                  mode === 'quick' ? 'bg-white/[0.12] text-white font-semibold shadow-sm' : 'text-zinc-400'
                }`}
              >
                Quick (NLP)
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-lg tag-switcher-spring btn-tactile flex items-center justify-center ${
                  mode === 'manual' ? 'bg-white/[0.12] text-white font-semibold shadow-sm' : 'text-zinc-400'
                }`}
              >
                Detailed Form
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-white/[0.08] transition-all btn-tactile active:scale-[0.97]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mode 1: Quick NLP Input */}
        {mode === 'quick' ? (
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-2">
                Type natural duration and activity (e.g. <span className="text-[#A3E635]">&quot;50m coding&quot;</span>, <span className="text-[#FB923C]">&quot;30m Reels&quot;</span>, <span className="text-[#38BDF8]">&quot;2h Deep Architecture&quot;</span>):
              </label>
              <input
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder='e.g. "45m API Engine Build"'
                autoFocus
                className="w-full min-h-[44px] bg-[#0d0d0f] text-sm text-zinc-100 placeholder-zinc-500 rounded-xl px-4 py-3 border border-white/[0.1] focus:border-[#A3E635]/60 focus:outline-none focus:ring-1 focus:ring-[#A3E635]/40 font-mono shadow-inner"
              />
            </div>

            {/* Common quick examples */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                '45m Deep Work',
                '25m Focus Sprint',
                '30m Instagram Reels',
                '15m Standup Call',
                '60m Algorithm Design',
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setQuickText(ex)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-white transition-all flex items-center justify-center active:scale-95"
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">Press Enter or click Log</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickText.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold font-mono text-xs hover:bg-[#bef452] transition-all disabled:opacity-40 flex items-center justify-center active:scale-95"
                >
                  Log Block ↵
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Mode 2: Detailed Manual Form */
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">
                Session Title / Label:
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Core System Refactor"
                required
                className="w-full bg-[#0d0d0f] text-xs text-zinc-100 placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-white/[0.1] focus:border-[#A3E635]/60 focus:outline-none font-mono"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Category:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['focus', 'wasted', 'routine', 'neutral'] as BlockCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-1.5 rounded-lg text-xs font-mono capitalize border tag-switcher-spring btn-tactile ${
                      category === cat
                        ? cat === 'focus'
                          ? 'bg-[#A3E635]/20 text-[#A3E635] border-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.3)]'
                          : cat === 'wasted'
                          ? 'bg-[#FB923C]/20 text-[#FB923C] border-[#FB923C] shadow-[0_0_8px_rgba(251,146,60,0.3)]'
                          : 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                        : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration and Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-zinc-400">Duration (Minutes):</label>
                <span className="text-xs font-mono text-white font-bold">{duration} mins</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {durationPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`py-1 rounded-lg text-xs font-mono border transition-all ${
                      duration === mins
                        ? 'bg-white/[0.15] text-white border-white/40 font-semibold'
                        : 'bg-zinc-900 border-white/[0.05] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-[#A3E635]"
              />
            </div>

            {/* Tag */}
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Tag:</label>
              <div className="flex flex-wrap gap-1.5">
                {['Engineering', 'Focus', 'Meeting', 'Distraction', 'Personal', 'Study', 'Design'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                      tag === t
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                        : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Notes (Optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context or trigger details..."
                rows={2}
                className="w-full bg-[#0d0d0f] text-xs text-zinc-100 placeholder-zinc-500 rounded-xl px-3.5 py-2 border border-white/[0.1] focus:border-[#A3E635]/60 focus:outline-none font-mono"
              />
            </div>

            {/* Submit Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!label.trim()}
                className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold font-mono text-xs hover:bg-[#bef452] transition-all disabled:opacity-40"
              >
                Save Block
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
