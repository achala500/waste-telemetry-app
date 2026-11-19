'use client';

import React from 'react';
import { NavigationRail } from '@/components/NavigationRail';
import { LandingHero } from '@/components/LandingHero';
import { PricingSection } from '@/components/PricingSection';
import { useTelemetryStore } from '@/lib/telemetryStore';

export default function PricingPage() {
  const state = useTelemetryStore();

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      <NavigationRail
        syncStatus={state.isSyncing ? 'syncing' : state.isOnline ? 'live' : 'offline'}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
        <main className="flex-1 w-full space-y-12">
          <LandingHero />
          <PricingSection />
        </main>
      </div>
    </div>
  );
}
