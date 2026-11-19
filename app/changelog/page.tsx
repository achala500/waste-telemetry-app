'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Wrench,
  Palette,
  Layers,
  ArrowLeft,
  Tag
} from 'lucide-react';
import { NavigationRail } from '@/components/NavigationRail';
import { ChangelogEntry } from '@/lib/types';
import { fetchChangelogEntries } from '@/lib/feedbackService';

// Verified Production Release Baseline (Cleaned of all fake #FB ticket IDs and internal jargon)
const DEFAULT_RELEASES: ChangelogEntry[] = [
  {
    version: 'v1.5.0',
    date: 'November 19, 2026',
    headline: 'Past Papers Vault, Forum & Study Velocity',
    plainEnglishSummary:
      'Major update introducing the Past Papers Google Drive library, peer solution forums, customizable daily study targets, and Pomodoro & Past Paper exam timers.',
    fixedFeedbackIds: [],
    tag: 'major',
    isLatest: true,
    shippedFixes: [
      {
        title: 'Instant Dashboard Reactivity',
        description: 'Fixed UI state updates so starting timers, logging sessions, or switching 7D views update immediately across all KPI cards.',
        tag: 'Fix'
      },
      {
        title: 'Local Timezone Consistency',
        description: 'Resolved UTC offset mismatches in session history so table logs accurately match your device timezone.',
        tag: 'Fix'
      },
      {
        title: 'Side-by-Side Timeline Overlap',
        description: 'Overlapping focus and distraction sessions now render in parallel side-by-side columns without clipping titles.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Apple SF Pro Typography & Dark Theme',
        description: 'Refined obsidian dark mode (#08080A) with clean typography and fluid micro-animations.',
        tag: 'UX'
      },
      {
        title: 'Exam Countdown & Study Streak',
        description: 'Added a dedicated A/L exam countdown widget, customizable daily study goals, and unbroken study streak counter.',
        tag: 'UX'
      }
    ],
    communityFeatures: [
      {
        title: 'Google Drive Past Papers Hub & Solution Forum',
        description: 'Browse, preview, and download past exam papers with a discussion forum to exchange mark schemes and solutions.',
        tag: 'Feature'
      },
      {
        title: 'Pomodoro & Past Paper Countdown Modes',
        description: 'Built-in 50/10 Pomodoro and 2h/3h Past Paper countdown timers with audible completion alerts.',
        tag: 'Feature'
      }
    ]
  }
];

export default function ChangelogPage() {
  const [releases, setReleases] = useState<ChangelogEntry[]>(DEFAULT_RELEASES);
  const [selectedTag, setSelectedTag] = useState<'all' | 'major' | 'minor'>('all');

  useEffect(() => {
    loadChangelog();
  }, []);

  const loadChangelog = async () => {
    try {
      const dynamicEntries = await fetchChangelogEntries();
      if (dynamicEntries && dynamicEntries.length > 0) {
        // Merge dynamic entries with baseline, unique by version
        const versions = new Set(dynamicEntries.map((e) => e.version));
        const merged = [
          ...dynamicEntries,
          ...DEFAULT_RELEASES.filter((r) => !versions.has(r.version))
        ];
        setReleases(merged);
      }
    } catch {}
  };

  const filteredReleases = releases.filter((r) => {
    if (selectedTag === 'all') return true;
    return r.tag === selectedTag;
  });

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      <NavigationRail activeView="changelog" />

      {/* Main Content Area - Clean md:pl-64 offset preventing sidebar clipping */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-12">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-[#08080A]/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Product Changelog</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/20">
                  Release Stream
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Chronological history of verified updates and new features</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-white/10 p-1 rounded-2xl text-xs font-semibold">
            {(['all', 'major', 'minor'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-3 py-1 rounded-xl transition-all capitalize ${
                  selectedTag === t
                    ? 'bg-[#A3E635] text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        {/* Feed of Releases */}
        <main className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8 space-y-8">
          {filteredReleases.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-3xl p-16 text-center text-xs text-zinc-500">
              No releases match this filter.
            </div>
          ) : (
            filteredReleases.map((rel) => (
              <article
                key={rel.version}
                className="bg-[#141416] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden"
              >
                {/* Release Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-extrabold text-white tracking-tight">
                        {rel.version}
                      </span>
                      {rel.isLatest && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/25">
                          Latest Release
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-medium">
                        • {rel.date}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-zinc-200">
                      {rel.headline}
                    </h2>
                  </div>
                </div>

                {/* Plain English Summary */}
                <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                  {rel.plainEnglishSummary}
                </p>

                {/* Features & Fixes Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Features */}
                  {rel.communityFeatures && rel.communityFeatures.length > 0 && (
                    <div className="bg-[#08080A] border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#A3E635]">
                        <Sparkles className="w-4 h-4" />
                        <span>New Capabilities</span>
                      </div>
                      <div className="space-y-2">
                        {rel.communityFeatures.map((f, i) => (
                          <div key={i} className="text-xs space-y-0.5">
                            <span className="font-semibold text-white block">{f.title}</span>
                            <span className="text-zinc-400 block leading-relaxed">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fixes */}
                  {rel.shippedFixes && rel.shippedFixes.length > 0 && (
                    <div className="bg-[#08080A] border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#38BDF8]">
                        <Wrench className="w-4 h-4" />
                        <span>Fixes &amp; Stability</span>
                      </div>
                      <div className="space-y-2">
                        {rel.shippedFixes.map((f, i) => (
                          <div key={i} className="text-xs space-y-0.5">
                            <span className="font-semibold text-white block">{f.title}</span>
                            <span className="text-zinc-400 block leading-relaxed">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UX Refinements */}
                  {rel.uxRefinements && rel.uxRefinements.length > 0 && (
                    <div className="md:col-span-2 bg-[#08080A] border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <Palette className="w-4 h-4" />
                        <span>Experience &amp; Interface Refinements</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rel.uxRefinements.map((f, i) => (
                          <div key={i} className="text-xs space-y-0.5">
                            <span className="font-semibold text-white block">{f.title}</span>
                            <span className="text-zinc-400 block leading-relaxed">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
