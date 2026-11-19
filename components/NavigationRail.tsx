'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, BarChart3, Sparkles, FileText, Shield, Layers } from 'lucide-react';
import { useTelemetryStore } from '@/lib/telemetryStore';

export type NavViewId = 'dashboard' | 'timeline' | 'analytics' | 'insights' | 'papers' | 'changelog' | 'admin';

export interface NavigationRailProps {
  activeView?: NavViewId;
  onSelectView?: (view: NavViewId) => void;
  syncStatus?: 'live' | 'syncing' | 'offline';
  todayDistractionCount?: number;
}

const KNOWN_ADMIN_EMAILS = [
  'achala500@gmail.com',
  'achala500',
  '111077537+achala500@users.noreply.github.com',
  'alex.vance@gmail.com'
];

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeView = 'dashboard',
  onSelectView,
  syncStatus = 'live',
  todayDistractionCount = 0
}) => {
  const storeState = useTelemetryStore();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userEmail = (storeState.user?.email || '').toLowerCase().trim();
    const envAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
    const storedAdminSession = typeof window !== 'undefined' && localStorage.getItem('chrono_admin_auth') === 'true';

    const authorized =
      storedAdminSession ||
      (userEmail && (KNOWN_ADMIN_EMAILS.includes(userEmail) || userEmail === envAdminEmail || userEmail.startsWith('achala')));

    setIsAdmin(!!authorized);
  }, [storeState.user]);

  const navItems = [
    {
      id: 'dashboard' as NavViewId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/'
    },
    {
      id: 'timeline' as NavViewId,
      label: 'Timeline',
      icon: Clock,
      href: '/timeline'
    },
    {
      id: 'analytics' as NavViewId,
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics'
    },
    {
      id: 'insights' as NavViewId,
      label: 'AI Coach',
      icon: Sparkles,
      href: '/ai-coach'
    },
    {
      id: 'papers' as NavViewId,
      label: 'Past Papers',
      icon: FileText,
      href: '/papers'
    }
  ];

  return (
    <>
      {/* Desktop Persistent Left Obsidian Navigation Rail */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-[#08080A] border-r border-white/5 flex-col justify-between p-4 z-40 select-none">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-[#A3E635] flex items-center justify-center text-black font-extrabold text-base shadow-[0_0_16px_rgba(163,230,53,0.3)]">
              ✦
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">CHRONO</span>
              <p className="text-[11px] text-zinc-500 font-medium leading-none mt-0.5">Focus & Telemetry</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeView === item.id ||
                (pathname === item.href && pathname !== '/') ||
                (pathname === '/' && item.id === 'dashboard' && activeView === 'dashboard');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (onSelectView) {
                      onSelectView(item.id);
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
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {todayDistractionCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Protected Admin Portal Link - ONLY visible when authenticated as Admin */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-150 border ${
                  activeView === 'admin' || pathname === '/admin' || pathname === '/chrono-portal-ops'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin Portal</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
                  Owner
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Status & Links */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <Link
            href="/changelog"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <span>What's New</span>
            <span className="text-[10px] text-[#A3E635] bg-[#A3E635]/10 px-2 py-0.5 rounded-full font-bold border border-[#A3E635]/20">
              v1.5.0
            </span>
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
          const isActive =
            activeView === item.id ||
            (pathname === item.href && pathname !== '/') ||
            (pathname === '/' && item.id === 'dashboard');

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (onSelectView) onSelectView(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] transition-all ${
                isActive ? 'text-[#A3E635] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-col items-center justify-center py-1 px-2 text-[10px] text-amber-400 font-semibold"
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
};
