'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Clock, BarChart3, Sparkles } from 'lucide-react';

export type NavViewId = 'dashboard' | 'timeline' | 'analytics' | 'insights' | 'changelog';

export interface NavigationRailProps {
  activeView?: NavViewId;
  onSelectView?: (view: NavViewId) => void;
  syncStatus?: 'live' | 'syncing' | 'offline';
  todayDistractionCount?: number;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeView = 'dashboard',
  onSelectView,
  syncStatus = 'live',
  todayDistractionCount = 0
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavViewId,
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'timeline' as NavViewId,
      label: 'Timeline',
      icon: Clock
    },
    {
      id: 'analytics' as NavViewId,
      label: 'Analytics',
      icon: BarChart3
    },
    {
      id: 'insights' as NavViewId,
      label: 'AI Coach',
      icon: Sparkles
    }
  ];

  return (
    <>
      {/* Desktop Persistent Left Obsidian Navigation Rail */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-[#08080A] border-r border-white/5 flex-col justify-between p-4 z-40 select-none">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-[#A3E635] flex items-center justify-center text-black font-extrabold text-base shadow-[0_0_16px_rgba(163,230,53,0.3)]">
              ✦
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">CHRONO</span>
              <p className="text-[11px] text-zinc-500 font-medium leading-none mt-0.5">Focus Analytics</p>
            </div>
          </div>

          {/* Navigation Items (4 items only) */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onSelectView) {
                      onSelectView(item.id);
                    } else if (typeof window !== 'undefined') {
                      window.location.href = `/?view=${item.id}`;
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-150 btn-tactile ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#A3E635]' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'timeline' && todayDistractionCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      {todayDistractionCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status & Links */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <Link
            href="/changelog"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <span>What's New</span>
            <span className="text-[10px] text-[#A3E635] bg-[#A3E635]/10 px-1.5 py-0.5 rounded font-medium">v1.2</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'syncing'
                  ? 'bg-amber-400 animate-ping'
                  : syncStatus === 'offline'
                  ? 'bg-zinc-600'
                  : 'bg-[#A3E635]'
              }`}
            />
            <span className="capitalize">{syncStatus === 'live' ? 'Auto-save active' : syncStatus}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Frosted Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#08080A]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 z-40 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
              <button
                key={item.id}
                onClick={() => {
                  if (onSelectView) {
                    onSelectView(item.id);
                  } else if (typeof window !== 'undefined') {
                    window.location.href = `/?view=${item.id}`;
                  }
                }}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all btn-tactile ${
                isActive ? 'text-[#A3E635]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
        <Link
          href="/changelog"
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
            activeView === 'changelog' ? 'text-[#A3E635]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span className="text-xs">✦</span>
          <span className="text-[10px] font-medium mt-1">Updates</span>
        </Link>
      </nav>
    </>
  );
};
