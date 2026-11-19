'use client';

import React, { useState, useEffect } from 'react';
import { BlockCategory, SubjectTag } from '../lib/types';
import { telemetryStore } from '../lib/telemetryStore';
import { BookOpen, Sparkles, Clock, Tag, X } from 'lucide-react';

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
  
  // Manual & Subject fields
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<BlockCategory>('focus');
  const [tag, setTag] = useState('Study');
  const [subject, setSubject] = useState<SubjectTag>('Combined Maths');
  const [customSubject, setCustomSubject] = useState('');
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

  const resolvedSubject = subject === 'Custom' ? (customSubject.trim() || 'Custom') : subject;

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
      subject: resolvedSubject,
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
  const subjectList: SubjectTag[] = ['Combined Maths', 'Physics', 'Past Paper', 'Revision', 'Chemistry', 'Custom'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 spring-popover">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635] shadow-[0_0_10px_#A3E635]" />
            <h2 className="text-base font-bold tracking-tight text-white">
              Log Session
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher with 150ms transitions */}
            <div className="p-1 bg-[#08080A] rounded-2xl border border-white/10 flex text-xs">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-150 ${
                  mode === 'quick'
                    ? 'bg-[#A3E635] text-black shadow-[0_0_12px_rgba(163,230,53,0.35)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Quick Entry
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-150 ${
                  mode === 'manual'
                    ? 'bg-[#A3E635] text-black shadow-[0_0_12px_rgba(163,230,53,0.35)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Detailed Form
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors duration-150"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode 1: Quick Input */}
        {mode === 'quick' ? (
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-2 font-medium">
                Type natural duration and activity (e.g. <span className="text-[#A3E635]">&quot;50m physics&quot;</span>, <span className="text-rose-400">&quot;30m Reels&quot;</span>, <span className="text-[#38BDF8]">&quot;2h Past Paper&quot;</span>):
              </label>
              <input
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder='e.g. "45m Combined Maths Integration"'
                autoFocus
                className="w-full bg-[#08080A] text-sm text-zinc-100 placeholder-zinc-500 rounded-2xl px-4 py-3 border border-white/10 focus:border-[#A3E635] focus:outline-none transition-colors"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                '45m Combined Maths',
                '50m Physics Mechanics',
                '2h Past Paper Drill',
                '30m Revision',
                '25m Pomodoro Study',
                '30m Instagram Reels'
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setQuickText(ex)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all active:scale-95"
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Press Enter or click Log</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickText.trim()}
                  className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all disabled:opacity-40 active:scale-95"
                >
                  Log Session
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Mode 2: Detailed Manual Form with Subject Tagging */
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">
                Session Title / Description:
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Combined Maths - Differential Equations"
                required
                className="w-full bg-[#08080A] text-xs text-zinc-100 placeholder-zinc-500 rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-[#A3E635] focus:outline-none"
              />
            </div>

            {/* Student Subject Tagging */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#A3E635]" />
                <span>Subject Tag:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {subjectList.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSubject(subj)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center truncate ${
                      subject === subj
                        ? 'bg-[#A3E635] text-black border-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
              {subject === 'Custom' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter custom subject name..."
                  className="mt-2 w-full bg-[#08080A] text-xs text-zinc-100 placeholder-zinc-500 rounded-xl px-3 py-2 border border-white/10 focus:border-[#A3E635] focus:outline-none"
                />
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Category:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['focus', 'wasted', 'routine', 'rest'] as BlockCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      category === cat
                        ? cat === 'focus'
                          ? 'bg-[#A3E635]/20 text-[#A3E635] border-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.3)]'
                          : cat === 'wasted'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                          : cat === 'rest'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                          : 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-zinc-400 font-medium">Duration:</label>
                <span className="text-xs text-white font-bold tabular-nums">{duration} minutes</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {durationPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`py-1 rounded-xl text-xs font-semibold border transition-all ${
                      duration === mins
                        ? 'bg-white/20 text-white border-white/40'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-[#A3E635]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Study Notes (Optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key concepts covered, questions solved, or notes..."
                rows={2}
                className="w-full bg-[#08080A] text-xs text-zinc-100 placeholder-zinc-500 rounded-xl px-3.5 py-2 border border-white/10 focus:border-[#A3E635] focus:outline-none"
              />
            </div>

            {/* Submit Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!label.trim()}
                className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all disabled:opacity-40 active:scale-95"
              >
                Save Session
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
