'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Flame,
  Award,
  Lock,
  CheckCircle2
} from 'lucide-react';
import {
  MEMBERSHIP_TIERS,
  PricingTierDetails,
  initiateStripeCheckout,
  getUserMembershipTier,
  SubscriptionTier
} from '@/lib/stripeService';
import { useTelemetryStore } from '@/lib/telemetryStore';

export const PricingSection: React.FC = () => {
  const storeState = useTelemetryStore();
  const [currency, setCurrency] = useState<'LKR' | 'USD'>('LKR');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<SubscriptionTier>('free');
  const [successNote, setSuccessNote] = useState<string | null>(null);

  useEffect(() => {
    const current = getUserMembershipTier(storeState.user?.email || undefined);
    setActiveTier(current);
  }, [storeState.user]);

  const handleSelectTier = async (tier: PricingTierDetails) => {
    if (tier.id === 'free') return;

    setLoadingTier(tier.id);
    setSuccessNote(null);

    const res = await initiateStripeCheckout({
      tier: tier.id,
      userEmail: storeState.user?.email || undefined,
      userName: storeState.user?.displayName || undefined,
      billingInterval: billingCycle
    });

    setLoadingTier(null);

    if (res.success) {
      setActiveTier(tier.id);
      setSuccessNote(res.message || `Activated ${tier.name}!`);
      setTimeout(() => setSuccessNote(null), 5000);
    }
  };

  const getPrice = (tier: PricingTierDetails) => {
    if (tier.priceLkr === 0) return 'Free';
    let val = currency === 'LKR' ? tier.priceLkr : tier.priceUsd;
    if (billingCycle === 'annual') {
      val = Math.round(val * 0.8); // 20% discount on annual
    }
    const symbol = currency === 'LKR' ? 'Rs.' : '$';
    return `${symbol} ${val.toLocaleString()}`;
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-24 bg-[#08080A]">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#A3E635]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Header Title & Toggles */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRANSPARENT STUDENT MEMBERSHIP</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Invest in Your Island Rank
          </h2>

          <p className="text-sm sm:text-base text-zinc-400">
            Zero hidden fees. Built specifically for Sri Lankan G.C.E. Advanced Level students. Cancel anytime.
          </p>

          {/* Currency & Billing Cycle Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {/* Monthly / Annual Toggle */}
            <div className="inline-flex p-1 bg-[#141416] border border-white/10 rounded-2xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-[#A3E635] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-bold">Save 20%</span>
              </button>
            </div>

            {/* Currency Toggle */}
            <div className="inline-flex p-1 bg-[#141416] border border-white/10 rounded-2xl text-xs">
              <button
                onClick={() => setCurrency('LKR')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  currency === 'LKR' ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                LKR (Rs)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  currency === 'USD' ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successNote && (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 text-[#A3E635] text-xs font-semibold flex items-center gap-2.5 animate-in fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successNote}</span>
          </div>
        )}

        {/* 3 Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {MEMBERSHIP_TIERS.map((tier) => {
            const isCurrent = activeTier === tier.id;
            const isPopular = tier.popular;

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 backdrop-blur-xl ${
                  isPopular
                    ? 'bg-gradient-to-b from-[#1C1A17] via-[#141416] to-[#0E0E10] border-2 border-[#A3E635]/60 shadow-[0_0_35px_rgba(163,230,53,0.15)] md:-translate-y-2'
                    : 'bg-[#141416]/80 border border-white/10 hover:border-white/20 shadow-xl'
                }`}
              >
                {/* Popular / Recommended Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#A3E635] text-black text-[11px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-black" />
                    <span>{tier.badge || 'Recommended'}</span>
                  </div>
                )}

                {tier.badge && !isPopular && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                    {tier.badge}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Tier Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-white">{tier.name}</h3>
                    <p className="text-xs text-zinc-400 min-h-[32px] leading-relaxed">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                        {getPrice(tier)}
                      </span>
                      {tier.priceLkr > 0 && (
                        <span className="text-xs text-zinc-500 font-medium">
                          /{billingCycle === 'monthly' ? 'month' : 'mo (billed annually)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Included Capabilities:
                    </span>
                    <ul className="space-y-2.5">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPopular
                                ? 'bg-[#A3E635]/20 text-[#A3E635]'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Call to Action Button */}
                <div className="pt-8">
                  <button
                    onClick={() => handleSelectTier(tier)}
                    disabled={isCurrent || loadingTier === tier.id}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-white/10 text-zinc-400 border border-white/10 cursor-default'
                        : isPopular
                        ? 'bg-[#A3E635] text-black hover:bg-[#86efac] shadow-lg shadow-[0_0_20px_rgba(163,230,53,0.3)]'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    {loadingTier === tier.id ? (
                      <span className="animate-pulse">Connecting to Stripe...</span>
                    ) : isCurrent ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#A3E635]" />
                        <span>Active Plan</span>
                      </span>
                    ) : (
                      <>
                        <span>{tier.ctaLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-zinc-500">
                    <Lock className="w-3 h-3" />
                    <span>256-bit Encrypted Stripe Checkout</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust & Student Guarantee Banner */}
        <div className="bg-[#141416]/50 border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#A3E635]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white">Student Honor Guarantee</p>
              <p className="text-[11px] text-zinc-500">
                100% money-back guarantee within 7 days if Chrono doesn&apos;t boost your study discipline.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span>Visa, Mastercard, Frimi, Genie accepted</span>
          </div>
        </div>
      </div>
    </section>
  );
};
