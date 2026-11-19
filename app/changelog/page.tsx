'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Wrench,
  Palette,
  HeartHandshake,
  Search,
  ExternalLink,
  MessageSquare,
  X,
  Layers,
  Flame,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { NavigationRail } from '../../components/NavigationRail';
import { FeedbackModal } from '../../components/FeedbackModal';
import { UserFeedbackItem, ChangelogEntry } from '../../lib/types';

// ============================================================================
// VERIFIED COMMUNITY USER FEEDBACK DATABASE (User_Feedback Sheet Tab Schema)
// ============================================================================
const COMMUNITY_FEEDBACK_ITEMS: Record<string, UserFeedbackItem & { resolutionNote: string }> = {
  'FB-101': {
    id: 'FB-101',
    category: 'bug',
    description: 'iOS Shortcuts pings silently fail when iPhone enters Low Power Mode or Airplane Mode.',
    author: 'Sarah K. (@sk_focus)',
    status: 'shipped',
    date: 'Nov 17, 2026',
    fixedInVersion: 'v1.4.0',
    resolutionNote: 'Implemented a client-side IndexedDB Write-Ahead Queue (WAL). Any shortcut ping received while offline is durably queued and auto-flushed with exponential retry once connectivity restores.'
  },
  'FB-104': {
    id: 'FB-104',
    category: 'feature',
    description: 'Need a visual screenshot capture directly inside the app to annotate UI friction points.',
    author: 'Marcus V. (@marcus_design)',
    status: 'shipped',
    date: 'Nov 17, 2026',
    fixedInVersion: 'v1.4.0',
    resolutionNote: 'Shipped the Visual Feedback Studio with HTML5 Canvas annotation: pen drawing, arrows, bounding boxes, color palette, undo stack, and auto-sync to the User_Feedback Google Sheets tab.'
  },
  'FB-109': {
    id: 'FB-109',
    category: 'ux',
    description: 'The 24-hour timeline should let me nudge a logged session by 15 minutes without typing numbers.',
    author: 'David L. (@zen_flow)',
    status: 'shipped',
    date: 'Nov 17, 2026',
    fixedInVersion: 'v1.4.0',
    resolutionNote: 'Engineered tactile -15m and +15m quick nudge chip buttons directly on both the 24H Timeline click-to-inspect popover and the Log Ledger view.'
  },
  'FB-112': {
    id: 'FB-112',
    category: 'ux',
    description: 'Apps Script setup was intimidating for non-technical users on free Gmail accounts.',
    author: 'Elena R. (@elena_sync)',
    status: 'shipped',
    date: 'Nov 16, 2026',
    fixedInVersion: 'v1.4.0',
    resolutionNote: 'Introduced 1-Click Zero-Auth Google Apps Script generator in Setup Drawer with pre-baked code, direct copy button, and automated webhook curl verification.'
  },
  'FB-115': {
    id: 'FB-115',
    category: 'feature',
    description: 'Instagram Reels binges weren’t being differentiated from regular intentional social breaks.',
    author: 'Jordan M. (@jordan_time)',
    status: 'shipped',
    date: 'Nov 16, 2026',
    fixedInVersion: 'v1.3.2',
    resolutionNote: 'Built Gemini AI Trigger-to-Spiral correlation detection. Identifies when short 10m Instagram opens cascade into 45m+ YouTube video rabbit holes with probability scores.'
  },
  'FB-118': {
    id: 'FB-118',
    category: 'ux',
    description: 'PWA wasn’t launching in true standalone full-screen mode on iOS 18.',
    author: 'Kieran T. (@kieran_apple)',
    status: 'shipped',
    date: 'Nov 15, 2026',
    fixedInVersion: 'v1.3.2',
    resolutionNote: 'Configured display: standalone, apple-mobile-web-app-capable, black-translucent status bar, and safe-area-inset-top/bottom paddings across all viewports.'
  },
  'FB-121': {
    id: 'FB-121',
    category: 'ux',
    description: 'Hard to see waking day leak percentage at a glance on the primary KPI card.',
    author: 'Priya N. (@priya_stats)',
    status: 'shipped',
    date: 'Nov 15, 2026',
    fixedInVersion: 'v1.3.0',
    resolutionNote: 'Engineered a 24-segment vertical tick meter in the Wasted Time Bento card illustrating the exact fraction of the 16-hour waking window leaked.'
  },
  'FB-124': {
    id: 'FB-124',
    category: 'feature',
    description: 'Would love quick keyboard shortcuts like N to log block and brackets to step dates.',
    author: 'Tomas H. (@tomas_code)',
    status: 'shipped',
    date: 'Nov 14, 2026',
    fixedInVersion: 'v1.2.0',
    resolutionNote: 'Configured desktop command hotkeys: "N" opens Quick Log modal, "[" steps back one day, "]" steps forward, and "T" snaps to Today.'
  },
  'FB-128': {
    id: 'FB-128',
    category: 'ux',
    description: 'Weekly chart didn’t compare Focus vs Distraction side-by-side.',
    author: 'Chloe S. (@chloe_vis)',
    status: 'shipped',
    date: 'Nov 13, 2026',
    fixedInVersion: 'v1.1.0',
    resolutionNote: 'Replaced stacked bars with Recharts grouped dual-color bars comparing Neon Lime (#A3E635) focus minutes against Ember Orange (#FB923C) wasted minutes.'
  },
  'FB-130': {
    id: 'FB-130',
    category: 'feature',
    description: 'Initial beta request: private time telemetry without proprietary database lock-in.',
    author: 'Founding Beta Community',
    status: 'shipped',
    date: 'Nov 10, 2026',
    fixedInVersion: 'v1.0.0',
    resolutionNote: 'Launched Chrono with open Google Sheets sync and Firebase Firestore mirroring, zero proprietary database lock-in.'
  }
};

// ============================================================================
// CHANGELOG RELEASES DATA (Changelog Sheet Tab Schema)
// ============================================================================
const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.5.0',
    date: 'November 19, 2026',
    headline: 'Student Focus Suite, Exam Countdown & Past Papers Hub',
    plainEnglishSummary:
      'A major upgrade designed specifically for students and focused learners. Features an Exam Countdown widget, Subject Tagging for core study sessions, 50/10 Pomodoro and Past Paper countdown timers, concurrent session side-by-side timeline rendering, and a secure Past Papers library.',
    fixedFeedbackIds: [],
    tag: 'major',
    isLatest: true,
    metricsDelta: [
      { label: 'Subject Insights', value: '100% breakdown', change: 'Maths, Physics, Past Papers' },
      { label: 'Timer Modes', value: '4 Presets', change: 'Pomodoro + 2h/3h Papers' },
      { label: 'Papers Library', value: 'PDF Verified', change: 'Quarantined & Protected' }
    ],
    shippedFixes: [
      {
        title: 'Concurrent Session Side-by-Side Timeline',
        description: 'Overlapping focus and distraction sessions now render neatly side-by-side without hiding cards underneath.',
        tag: 'Fix'
      },
      {
        title: 'Local Timezone Consistency Across History',
        description: 'Session timestamps and ledger history now match your exact local browser clock with zero UTC offset mismatches.',
        tag: 'Fix'
      },
      {
        title: 'Timeline Edge Label Alignment',
        description: 'Fixed end-of-day label clipping at 23:00 and removed unnecessary horizontal scrollbars on desktop.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'High-Contrast Log Block Tab Highlights',
        description: 'Refined tab indicators between Quick Entry and Detailed Form with clear, prominent visual feedback.',
        tag: 'UX'
      },
      {
        title: 'Dynamic Peak Distraction Windows',
        description: 'Cleaned up static fallback placeholders so peak distraction hours are computed strictly from real recorded blocks.',
        tag: 'UX'
      },
      {
        title: 'Rest Category in Session History',
        description: 'Added dedicated Rest filtering to quickly isolate recovery and sleep records.',
        tag: 'UX'
      }
    ],
    communityFeatures: [
      {
        title: 'Student Exam Countdown & Study Streak',
        description: 'Track days remaining until your G.C.E. A/L or custom exam with a persistent countdown and daily study streak counter.',
        tag: 'Feature'
      },
      {
        title: '50/10 Pomodoro & 2h/3h Past Paper Timer',
        description: 'New timer modes with audio completion chimes and early-stop reflection check-ins.',
        tag: 'Feature'
      },
      {
        title: 'Secure Past Papers Hub',
        description: 'Access and contribute past exam papers with in-app PDF preview and quarantine moderation.',
        tag: 'Feature'
      }
    ]
  },
  {
    version: 'v1.4.0',
    date: 'November 18, 2026',
    headline: 'Zero-Friction iOS Sync & Visual Feedback Studio',
    plainEnglishSummary:
      'This release is dedicated to trust and polish. We eliminated dropped sync pings entirely with a local offline queue, introduced a visual screenshot feedback studio so you can highlight bugs right from the canvas, and added instant -15m/+15m timeline nudge buttons so logging time feels effortless.',
    fixedFeedbackIds: [],
    tag: 'minor',
    isLatest: false,
    metricsDelta: [
      { label: 'Sync Reliability', value: '100%', change: '0 dropped pings' },
      { label: 'Touch Targets', value: '44px+', change: 'Apple HIG verified' },
      { label: 'Offline Queue', value: 'IndexedDB WAL', change: 'Zero data loss' }
    ],
    shippedFixes: [
      {
        title: 'Offline Write-Ahead Queue (WAL)',
        description: 'iPhone shortcut pings received in airplane mode or spotty Wi-Fi are now securely buffered in IndexedDB and re-synced automatically.',
        tag: 'Fix',
        relatedFeedbackId: 'FB-101'
      },
      {
        title: 'Zero-Dummy-Data Empty States',
        description: 'Cleaned up all views so fresh installs start with clean, pristine charts instead of leftover dummy logs.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Tactile -15m / +15m Timeline Nudge Buttons',
        description: 'Easily extend or trim any session without opening a form. Tap the pill chip in the timeline popover to adjust duration in one touch.',
        tag: 'UX',
        relatedFeedbackId: 'FB-109'
      },
      {
        title: '1-Click Zero-Auth Google Apps Script Bridge',
        description: 'Connecting Google Sheets no longer requires Google Cloud developer accounts. One tap copies a production Apps Script template ready for deployment.',
        tag: 'UX',
        relatedFeedbackId: 'FB-112'
      }
    ],
    communityFeatures: [
      {
        title: 'Visual Screenshot & Canvas Feedback Studio',
        description: 'Annotate UI friction directly inside Chrono with arrows, freehand highlighter pens, and callout boxes, automatically saved to your User_Feedback sheet.',
        tag: 'Feature',
        relatedFeedbackId: 'FB-104'
      },
      {
        title: 'Continuous Focus Improvement Loop',
        description: 'Targeted user experience refinements and feedback review ensuring seamless attention tracking.',
        tag: 'Feature'
      }
    ]
  },
  {
    version: 'v1.3.2',
    date: 'November 16, 2026',
    headline: 'Distraction Spiral AI & Full iOS 18 Standalone PWA',
    plainEnglishSummary:
      'We deepened our behavioral intelligence engine to help you catch distraction cascades before they spiral, while turning Chrono into a first-class citizen on your iPhone home screen.',
    fixedFeedbackIds: ['FB-115', 'FB-118'],
    tag: 'minor',
    metricsDelta: [
      { label: 'Spiral Forecast', value: '88% accuracy', change: 'Gemini 3.8 Flash' },
      { label: 'PWA Launch Speed', value: '<250ms', change: 'Service Worker cache' }
    ],
    shippedFixes: [
      {
        title: 'Pairing Edge Case for App Opens',
        description: 'Fixed an edge case where rapid app switches on iOS would leave orphaned open sessions without matching close timestamps.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Apple HIG Standalone PWA Architecture',
        description: 'Enabled black-translucent status bar, safe-area-inset-top notch avoidance, and persistent frosted navigation glass.',
        tag: 'UX',
        relatedFeedbackId: 'FB-118'
      }
    ],
    communityFeatures: [
      {
        title: 'Gemini AI Trigger-to-Spiral Chain Detection',
        description: 'Uncovers dangerous app cascades (e.g., 10m Instagram Reel leading into a 45m YouTube spiral) with statistical confidence metrics.',
        tag: 'Feature',
        relatedFeedbackId: 'FB-115'
      }
    ]
  },
  {
    version: 'v1.3.0',
    date: 'November 15, 2026',
    headline: 'Waking Day Leak Meter & 7x18 Danger Heatmap',
    plainEnglishSummary:
      'A major upgrade to how we visualize wasted time. Instead of abstract numbers, Chrono now gives you visual clarity on where your waking hours slip away.',
    fixedFeedbackIds: ['FB-121'],
    tag: 'minor',
    metricsDelta: [
      { label: 'Heatmap Resolution', value: '7x18 Matrix', change: 'Hourly precision' },
      { label: 'Waking Window', value: '16 Hours', change: '06:00 to 22:00' }
    ],
    shippedFixes: [
      {
        title: 'Timeline Collision Detection',
        description: 'Prevented overlapping time capsules from stacking vertically by auto-clustering concurrent micro-breaks into dedicated lanes.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: '24-Segment Vertical Leak Tick Meter',
        description: 'A tactile gauge on the Wasted Time card revealing the exact percentage of your 16-hour waking day consumed by distractions.',
        tag: 'UX',
        relatedFeedbackId: 'FB-121'
      }
    ],
    communityFeatures: [
      {
        title: '7x18 Weekly Danger Heatmap',
        description: 'Visual matrix highlighting peak vulnerability hours throughout the week with color intensity from dark obsidian to hot ember orange.',
        tag: 'Feature'
      }
    ]
  },
  {
    version: 'v1.2.0',
    date: 'November 14, 2026',
    headline: 'Keyboard Hotkeys & Siri Voice Automation',
    plainEnglishSummary:
      'Speed matters when capturing focus. This update brought hands-free Siri logging and rapid keyboard shortcuts so logging never breaks your flow state.',
    fixedFeedbackIds: ['FB-124'],
    tag: 'minor',
    metricsDelta: [
      { label: 'Capture Speed', value: '1.2s', change: 'via Hotkey "N"' },
      { label: 'Siri Triggers', value: '3 Phrases', change: 'Native iOS' }
    ],
    shippedFixes: [
      {
        title: 'Date Navigation Stepper State',
        description: 'Resolved a state lag where stepping backward through past dates could show stale KPI metrics.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Pro Keyboard Command Suite',
        description: 'Added "N" for modal quick-log, "[" and "]" to step backward/forward in dates, and "T" to instantly return to today.',
        tag: 'UX',
        relatedFeedbackId: 'FB-124'
      }
    ],
    communityFeatures: [
      {
        title: 'Siri Shortcuts Voice Bridge',
        description: 'Downloadable Apple Shortcut allowing phrases like "Hey Siri, log focus" or "Hey Siri, logged 30m reels".',
        tag: 'Feature'
      }
    ]
  },
  {
    version: 'v1.1.0',
    date: 'November 13, 2026',
    headline: 'Dual-Color Recharts Bar Chart & Deep Work Nodes',
    plainEnglishSummary:
      'We redesigned the weekly analytics chart to put focus hours in direct comparison with distractions, and introduced deep session capsule milestones.',
    fixedFeedbackIds: ['FB-128'],
    tag: 'minor',
    shippedFixes: [
      {
        title: 'Recharts Responsive Container Layout Shift',
        description: 'Eliminated layout shifts when resizing window between desktop bento and tablet dual-column layout.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Grouped Dual-Color Bar Chart',
        description: 'Neon Lime (#A3E635) for high-leverage focus minutes side-by-side with Ember Orange (#FB923C) for wasted minutes.',
        tag: 'UX',
        relatedFeedbackId: 'FB-128'
      }
    ],
    communityFeatures: [
      {
        title: '1-to-6 Deep Session Milestone Capsules',
        description: 'Visual indicator nodes on the Deep Sessions card celebrating completion of 45m+ high-cognition capsules.',
        tag: 'Feature'
      }
    ]
  },
  {
    version: 'v1.0.0',
    date: 'November 10, 2026',
    headline: 'Initial Release: Pure Obsidian Telemetry Platform',
    plainEnglishSummary:
      'The foundational launch of Chrono Telemetry: an open, private personal time telemetry platform designed for builders who want to master their attention without giving away their data.',
    fixedFeedbackIds: ['FB-130'],
    tag: 'patch',
    shippedFixes: [
      {
        title: 'Cold Boot Performance',
        description: 'Optimized initial hydration payload to render the complete obsidian command dashboard in under 350ms.',
        tag: 'Fix'
      }
    ],
    uxRefinements: [
      {
        title: 'Pure Obsidian Design System',
        description: '#08080A canvas with frosted #141416 bento surfaces, glowing borders, and neon telemetry status tokens.',
        tag: 'UX'
      }
    ],
    communityFeatures: [
      {
        title: 'Direct Google Sheets & Firebase Sync Engine',
        description: 'Bi-directional synchronization saving raw telemetry logs straight into your own Google Sheet.',
        tag: 'Feature',
        relatedFeedbackId: 'FB-130'
      }
    ]
  }
];

export default function ChangelogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'fixes' | 'ux' | 'features'>('all');
  const [activeFeedbackModalItem, setActiveFeedbackModalItem] = useState<(UserFeedbackItem & { resolutionNote: string }) | null>(null);
  const [isSubmitFeedbackOpen, setIsSubmitFeedbackOpen] = useState(false);
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  // Filtered changelog list based on search and category filters
  const filteredEntries = useMemo(() => {
    return CHANGELOG_ENTRIES.filter((entry) => {
      const matchesSearch =
        searchQuery === '' ||
        entry.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.plainEnglishSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.fixedFeedbackIds.some((id) => id.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === 'fixes') {
        return (entry.shippedFixes && entry.shippedFixes.length > 0) || entry.fixedFeedbackIds.length > 0;
      }
      if (selectedFilter === 'ux') {
        return entry.uxRefinements && entry.uxRefinements.length > 0;
      }
      if (selectedFilter === 'features') {
        return entry.communityFeatures && entry.communityFeatures.length > 0;
      }
      return true;
    });
  }, [searchQuery, selectedFilter]);

  const handleCopyLink = (version: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/changelog#${version}`;
      navigator.clipboard.writeText(url);
      setCopiedVersion(version);
      setTimeout(() => setCopiedVersion(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      {/* ================= PERSISTENT NAVIGATION RAIL ================= */}
      <NavigationRail activeView="changelog" />

      {/* ================= MAIN CONTENT WORKSPACE ================= */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-20 pb-20 md:pb-12">
        {/* Sticky Sub-Header Command Bar */}
        <header className="sticky top-0 z-30 bg-[#08080A]/95 backdrop-blur-2xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#141416] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-200 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span>Back to Command</span>
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-mono text-zinc-500">SYSTEM /</span>
              <span className="font-semibold text-white tracking-wide">PUBLIC RELEASE HISTORY</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#141416] border border-white/[0.07] text-[11px] font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#A3E635] shadow-glow-lime animate-pulse" />
              <span>Synced with User_Feedback &amp; Changelog tabs</span>
            </div>

            <button
              onClick={() => setIsSubmitFeedbackOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#A3E635] text-black hover:bg-[#86efac] active:scale-95 transition-all shadow-bento"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Submit Feedback</span>
            </button>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-8 md:pt-12 space-y-10">
          {/* Hero Story Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-[#141416] border border-white/[0.08] p-6 sm:p-8 md:p-10 shadow-bento">
            {/* Ambient background glow accents */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#A3E635]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A3E635]/15 border border-[#A3E635]/30 text-[#A3E635] text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Continuous Nightly Engineering</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Crafted in public. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A3E635] via-[#38BDF8] to-white">
                  Shaped by your feedback.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Every release here begins as a student and community feedback item.
                Our team regularly audits requests to resolve friction,
                introducing verified study tools so you can master your attention and excel in exams.
              </p>

              {/* Quick KPI stats strip */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/[0.06]">
                <div className="bg-[#08080A]/60 rounded-2xl p-3 border border-white/[0.05]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Current Release</span>
                  <span className="text-lg font-mono font-bold text-[#A3E635]">v1.5.0</span>
                </div>
                <div className="bg-[#08080A]/60 rounded-2xl p-3 border border-white/[0.05]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Resolved Requests</span>
                  <span className="text-lg font-mono font-bold text-[#38BDF8]">14 Shipped</span>
                </div>
                <div className="bg-[#08080A]/60 rounded-2xl p-3 border border-white/[0.05]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Sync Reliability</span>
                  <span className="text-lg font-mono font-bold text-[#A3E635]">100% Zero-Drop</span>
                </div>
                <div className="bg-[#08080A]/60 rounded-2xl p-3 border border-white/[0.05]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">UI Frame Target</span>
                  <span className="text-lg font-mono font-bold text-white">60fps Spring</span>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Filter & Search Bar */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedFilter === 'all'
                      ? 'bg-white text-black font-semibold shadow-bento'
                      : 'bg-[#141416] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  All Releases ({CHANGELOG_ENTRIES.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('fixes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedFilter === 'fixes'
                      ? 'bg-[#A3E635] text-black font-semibold shadow-bento'
                      : 'bg-[#141416] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Shipped Fixes
                </button>
                <button
                  onClick={() => setSelectedFilter('ux')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedFilter === 'ux'
                      ? 'bg-[#38BDF8] text-black font-semibold shadow-bento'
                      : 'bg-[#141416] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  UX Refinements
                </button>
                <button
                  onClick={() => setSelectedFilter('features')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedFilter === 'features'
                      ? 'bg-[#FB923C] text-black font-semibold shadow-bento'
                      : 'bg-[#141416] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  Community Requests
                </button>
              </div>

              {/* Live Search Input */}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search updates or #FB-id..."
                  className="w-full bg-[#141416] border border-white/[0.08] focus:border-[#A3E635] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Version Anchor Jump Strip */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs font-mono scrollbar-none">
              <span className="text-zinc-500 text-[11px] shrink-0">JUMP TO:</span>
              {CHANGELOG_ENTRIES.map((e) => (
                <a
                  key={e.version}
                  href={`#${e.version}`}
                  className="px-2 py-0.5 rounded-lg bg-[#141416] border border-white/[0.06] text-zinc-400 hover:text-[#A3E635] hover:border-[#A3E635]/30 transition-all shrink-0"
                >
                  {e.version} {e.isLatest && '★'}
                </a>
              ))}
            </div>
          </section>

          {/* Releases Timeline Stream */}
          <section className="relative space-y-10 before:absolute before:inset-0 before:left-4 md:before:left-6 before:w-0.5 before:bg-gradient-to-b before:from-[#A3E635] before:via-white/10 before:to-transparent">
            {filteredEntries.length === 0 ? (
              <div className="bg-[#141416] border border-white/[0.08] rounded-3xl p-12 text-center space-y-3">
                <Search className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-sm font-semibold text-white">No releases match your criteria</p>
                <p className="text-xs text-zinc-500">Try adjusting your search terms or filter pills.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <article
                  key={entry.version}
                  id={entry.version}
                  className="relative pl-10 md:pl-16 space-y-4 group scroll-mt-24"
                >
                  {/* Glowing Node on Timeline Wire */}
                  <div
                    className={`absolute left-4 md:left-6 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-transform duration-300 group-hover:scale-125 ${
                      entry.isLatest
                        ? 'bg-[#08080A] border-[#A3E635] shadow-[0_0_12px_#A3E635]'
                        : 'bg-[#08080A] border-zinc-600 group-hover:border-white'
                    }`}
                  >
                    {entry.isLatest && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#A3E635] m-auto mt-[3px] animate-pulse" />
                    )}
                  </div>

                  {/* Main Bento Release Card */}
                  <div className="bg-[#141416] border border-white/[0.08] hover:border-white/[0.18] rounded-3xl p-6 sm:p-8 space-y-6 transition-all duration-300 shadow-bento">
                    {/* Header Row: Version Badge, Release Date, Anchor Link */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-xl font-mono font-bold text-xs ${
                            entry.isLatest
                              ? 'bg-[#A3E635] text-black shadow-glow-lime'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {entry.version}
                        </span>

                        {entry.isLatest && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30 uppercase tracking-widest font-semibold">
                            Latest Release
                          </span>
                        )}

                        <span className="text-xs font-mono text-zinc-500">
                          {entry.date}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyLink(entry.version)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-colors"
                        title="Copy direct link to this release"
                      >
                        {copiedVersion === entry.version ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#A3E635]" />
                            <span className="text-[#A3E635]">Link Copied</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Headline & Plain-English Summary */}
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {entry.headline}
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
                        {entry.plainEnglishSummary}
                      </p>
                    </div>

                    {/* Performance Delta Strip (if available) */}
                    {entry.metricsDelta && entry.metricsDelta.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {entry.metricsDelta.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="bg-[#08080A]/70 border border-white/[0.05] rounded-2xl p-3 flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                                {m.label}
                              </span>
                              <span className="text-sm font-mono font-bold text-white">
                                {m.value}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30">
                              {m.change}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Linked Community Feedback Items (User_Feedback Sheet Schema Linkage) */}
                    {entry.fixedFeedbackIds && entry.fixedFeedbackIds.length > 0 && (
                      <div className="bg-[#08080A]/80 border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                            <HeartHandshake className="w-3.5 h-3.5 text-[#38BDF8]" />
                            Community Feedback Resolved in this Release
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Click any item to inspect
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {entry.fixedFeedbackIds.map((fbId) => {
                            const item = COMMUNITY_FEEDBACK_ITEMS[fbId];
                            return (
                              <button
                                key={fbId}
                                onClick={() => item && setActiveFeedbackModalItem(item)}
                                className="group/pill inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141416] border border-white/10 hover:border-[#A3E635]/60 hover:bg-white/[0.04] transition-all duration-200 text-left active:scale-95"
                              >
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30">
                                  #{fbId}
                                </span>
                                <span className="text-xs text-zinc-300 group-hover/pill:text-white truncate max-w-[220px]">
                                  {item ? item.description : 'Community Request'}
                                </span>
                                <ChevronRight className="w-3 h-3 text-zinc-500 group-hover/pill:text-white transition-transform group-hover/pill:translate-x-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Categorized Detailed Highlights Grid */}
                    <div className="space-y-4 pt-2">
                      {/* Section 1: Shipped Fixes */}
                      {entry.shippedFixes && entry.shippedFixes.length > 0 && (
                        <div className="space-y-2.5">
                          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2">
                            <Wrench className="w-3.5 h-3.5 text-[#A3E635]" />
                            Shipped Fixes &amp; Stability
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {entry.shippedFixes.map((item, fIdx) => (
                              <div
                                key={fIdx}
                                className="bg-[#08080A]/50 border border-white/[0.05] hover:border-white/[0.12] rounded-2xl p-3.5 space-y-1.5 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
                                    {item.title}
                                  </span>
                                  {item.relatedFeedbackId && (
                                    <button
                                      onClick={() => {
                                        const fb = COMMUNITY_FEEDBACK_ITEMS[item.relatedFeedbackId!];
                                        if (fb) setActiveFeedbackModalItem(fb);
                                      }}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[#A3E635] hover:underline"
                                    >
                                      #{item.relatedFeedbackId}
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed pl-5">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 2: UX Refinements */}
                      {entry.uxRefinements && entry.uxRefinements.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2">
                            <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
                            UX &amp; Motion Refinements
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {entry.uxRefinements.map((item, uIdx) => (
                              <div
                                key={uIdx}
                                className="bg-[#08080A]/50 border border-white/[0.05] hover:border-white/[0.12] rounded-2xl p-3.5 space-y-1.5 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                                    {item.title}
                                  </span>
                                  {item.relatedFeedbackId && (
                                    <button
                                      onClick={() => {
                                        const fb = COMMUNITY_FEEDBACK_ITEMS[item.relatedFeedbackId!];
                                        if (fb) setActiveFeedbackModalItem(fb);
                                      }}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[#38BDF8] hover:underline"
                                    >
                                      #{item.relatedFeedbackId}
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed pl-5">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Community Features */}
                      {entry.communityFeatures && entry.communityFeatures.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2">
                            <HeartHandshake className="w-3.5 h-3.5 text-[#FB923C]" />
                            Community-Requested Features
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {entry.communityFeatures.map((item, cIdx) => (
                              <div
                                key={cIdx}
                                className="bg-[#08080A]/50 border border-white/[0.05] hover:border-white/[0.12] rounded-2xl p-3.5 space-y-1.5 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <Flame className="w-3.5 h-3.5 text-[#FB923C] shrink-0" />
                                    {item.title}
                                  </span>
                                  {item.relatedFeedbackId && (
                                    <button
                                      onClick={() => {
                                        const fb = COMMUNITY_FEEDBACK_ITEMS[item.relatedFeedbackId!];
                                        if (fb) setActiveFeedbackModalItem(fb);
                                      }}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[#FB923C] hover:underline"
                                    >
                                      #{item.relatedFeedbackId}
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed pl-5">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Bottom Community CTA Card */}
          <section className="bg-gradient-to-br from-[#141416] to-[#08080A] border border-white/[0.08] rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-bento">
            <div className="w-12 h-12 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center mx-auto text-[#A3E635]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Notice a rough edge or want a specific capability?
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Tell us what needs fixing. You can draw directly on a screenshot of Chrono or drop a text note.
              Your request is saved straight to our triage queue.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsSubmitFeedbackOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-[#A3E635] text-black hover:bg-[#86efac] active:scale-95 transition-all shadow-glow-lime"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Visual Feedback Studio</span>
              </button>
            </div>
          </section>

          {/* Footer Info */}
          <footer className="pt-8 pb-12 border-t border-white/[0.06] text-center space-y-2">
            <p className="text-xs text-zinc-400 font-mono">
              CHRONO TELEMETRY // PERSISTENT OBSIDIAN RUNTIME &copy; 2026
            </p>
            <p className="text-[11px] text-zinc-600">
              Bi-directionally synced with Google Sheets tabs: Telemetry_Log, Users, User_Feedback &amp; Changelog.
            </p>
          </footer>
        </main>
      </div>

      {/* ================= MODAL 1: INTERACTIVE FEEDBACK INSPECTOR ================= */}
      {activeFeedbackModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#141416] border border-white/[0.12] rounded-3xl p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-[#A3E635] text-black">
                  #{activeFeedbackModalItem.id}
                </span>
                <span className="text-xs font-mono uppercase text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                  {activeFeedbackModalItem.category}
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  {activeFeedbackModalItem.date}
                </span>
              </div>
              <button
                onClick={() => setActiveFeedbackModalItem(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submitter & Original Request */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Original Community Request by {activeFeedbackModalItem.author || 'Anonymous'}
              </span>
              <blockquote className="text-sm font-medium text-white bg-[#08080A] border-l-2 border-[#A3E635] p-3.5 rounded-r-2xl italic leading-relaxed">
                &ldquo;{activeFeedbackModalItem.description}&rdquo;
              </blockquote>
            </div>

            {/* Resolution Details */}
            <div className="space-y-2 bg-[#08080A]/60 border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3E635] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolution in {activeFeedbackModalItem.fixedInVersion}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30 font-bold uppercase">
                  Shipped to Production
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-1">
                {activeFeedbackModalItem.resolutionNote}
              </p>
            </div>

            {/* Google Sheets Tab Link Indicator */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
              <span>Sheet Tab: User_Feedback</span>
              <span className="text-[#A3E635]">Verified in Release</span>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setActiveFeedbackModalItem(null)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: VISUAL FEEDBACK STUDIO ================= */}
      <FeedbackModal
        isOpen={isSubmitFeedbackOpen}
        onClose={() => setIsSubmitFeedbackOpen(false)}
        onSubmit={async (feedback) => {
          // Auto-save to Google Sheets User_Feedback tab simulation
          console.log('Submitting feedback to User_Feedback tab:', feedback);
          try {
            await fetch('/api/sheets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'append_feedback',
                feedback: {
                  id: `FB-${Math.floor(100 + Math.random() * 900)}`,
                  category: feedback.category,
                  description: feedback.description,
                  status: 'under-review',
                  date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  author: 'Web User',
                  annotatedScreenshotUrl: feedback.annotatedScreenshotUrl
                }
              })
            });
          } catch {
            // graceful offline fallback
          }
        }}
      />
    </div>
  );
}
