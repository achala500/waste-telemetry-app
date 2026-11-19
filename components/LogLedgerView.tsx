'use client';

import React, { useState } from 'react';
import { Search, Trash2, Calendar, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { TelemetryBlock, BlockCategory, formatLocalTime } from '@/lib/types';

interface LogLedgerViewProps {
  blocks: TelemetryBlock[];
  selectedDate: string;
  onDeleteBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<TelemetryBlock>) => void;
}

export const LogLedgerView: React.FC<LogLedgerViewProps> = ({
  blocks,
  selectedDate,
  onDeleteBlock,
  onUpdateBlock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | BlockCategory>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'selected' | 'all'>('all');

  const filteredBlocks = blocks.filter((b) => {
    // Category match
    const matchesCategory = categoryFilter === 'all' || b.category === categoryFilter;

    // Date match
    let matchesDate = true;
    if (dateFilterMode === 'selected') {
      const blockDate = b.startTime.includes('T') ? b.startTime.split('T')[0] : b.date;
      matchesDate = blockDate === selectedDate;
    }

    // Search match
    const matchesSearch =
      (b.title || b.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.tag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.subject || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesDate && matchesSearch;
  });

  const formatBlockTimeRange = (b: TelemetryBlock) => {
    const start = formatLocalTime(b.startTime);
    const end = b.endTime ? formatLocalTime(b.endTime) : '';
    if (end && end !== '--:--') {
      return `${start} – ${end}`;
    }
    return start;
  };

  return (
    <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Session History</h2>
          <p className="text-xs text-zinc-400">Complete log of all focus, study, and distraction records</p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions or subjects..."
              className="bg-[#08080A] border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          {/* Date Scope Toggle */}
          <div className="flex items-center bg-[#08080A] border border-white/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDateFilterMode('selected')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                dateFilterMode === 'selected'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Selected Date
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Records
            </button>
          </div>

          {/* Category Filter including 'rest' */}
          <div className="flex items-center gap-1 bg-[#08080A] border border-white/10 p-1 rounded-xl text-xs">
            {(['all', 'focus', 'wasted', 'routine', 'rest'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#A3E635] text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-500">
            No session records found. Log your first block above.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Session Title</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Subject / Tag</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Local Time</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBlocks.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-3 pl-2">
                    <div className="font-bold text-white">{b.title || b.label}</div>
                    {b.notes && <div className="text-[11px] text-zinc-500 truncate max-w-xs">{b.notes}</div>}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        b.category === 'focus'
                          ? 'bg-[#A3E635]/10 text-[#A3E635]'
                          : b.category === 'wasted'
                          ? 'bg-rose-500/10 text-rose-300'
                          : b.category === 'rest'
                          ? 'bg-purple-500/10 text-purple-300'
                          : 'bg-[#38BDF8]/10 text-[#38BDF8]'
                      }`}
                    >
                      {b.category}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {b.subject && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-medium">
                          {b.subject}
                        </span>
                      )}
                      <span className="text-zinc-400">{b.tag || 'General'}</span>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-white tabular-nums">{b.durationMinutes}m</td>
                  <td className="py-3 text-zinc-300 tabular-nums">
                    {formatBlockTimeRange(b)}
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          onUpdateBlock(b.id, { durationMinutes: Math.max(5, b.durationMinutes - 15) })
                        }
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px]"
                        title="Shorten by 15m"
                      >
                        -15m
                      </button>
                      <button
                        onClick={() =>
                          onUpdateBlock(b.id, { durationMinutes: b.durationMinutes + 15 })
                        }
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px]"
                        title="Extend by 15m"
                      >
                        +15m
                      </button>
                      <button
                        onClick={() => onDeleteBlock(b.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors ml-1"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
