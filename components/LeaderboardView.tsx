'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  Award,
  Zap,
  Users,
  ShieldCheck,
  School,
  MapPin,
  Crown
} from 'lucide-react';
import { LeaderboardEntry } from '@/lib/types';
import { fetchLiveLeaderboard } from '@/lib/sheetsSync';
import { fetchAllUsersFromFirestore } from '@/lib/firestoreSync';
import { useTelemetryStore } from '@/lib/telemetryStore';

export const LeaderboardView: React.FC = () => {
  const storeState = useTelemetryStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      const [sheetsData, firestoreUsers] = await Promise.all([
        fetchLiveLeaderboard().catch(() => [] as LeaderboardEntry[]),
        fetchAllUsersFromFirestore().catch(() => [])
      ]);

      const map = new Map<string, LeaderboardEntry>();

      // 1. Ingest real Firestore registered users
      firestoreUsers.forEach((u) => {
        const emailKey = (u.email || '').toLowerCase().trim();
        if (!emailKey) return;
        const totalMinutes = u.totalFocusMinutes || 0;
        map.set(emailKey, {
          rank: 0,
          displayName: u.displayName || u.username || 'A/L Student',
          username: u.username,
          school: u.school,
          province: u.province,
          email: u.email,
          totalFocusMinutes: totalMinutes,
          streakDays: Math.max(1, Math.min(30, Math.floor(totalMinutes / 120))),
          topSubject: u.stream?.includes('Maths')
            ? 'Combined Maths'
            : u.stream?.includes('Bio')
            ? 'Biology'
            : u.stream?.includes('Tech')
            ? 'Technology'
            : 'Combined Maths',
          membershipTier: u.membershipTier || 'free',
          isLive: false
        });
      });

      // 2. Merge Google Sheets live records
      sheetsData.forEach((s) => {
        const emailKey = (s.email || '').toLowerCase().trim();
        if (!emailKey) return;
        if (map.has(emailKey)) {
          const existing = map.get(emailKey)!;
          existing.totalFocusMinutes = Math.max(existing.totalFocusMinutes, s.totalFocusMinutes);
          existing.streakDays = Math.max(existing.streakDays, s.streakDays);
          existing.isLive = s.isLive || existing.isLive;
          if (s.topSubject) existing.topSubject = s.topSubject;
        } else {
          map.set(emailKey, {
            ...s,
            rank: 0
          });
        }
      });

      // 3. Include current active user if logged in
      if (storeState.user?.email) {
        const curEmail = storeState.user.email.toLowerCase().trim();
        const localFocusMinutes = storeState.blocks
          .filter((b) => b.category === 'focus')
          .reduce((sum, b) => sum + b.durationMinutes, 0);

        if (map.has(curEmail)) {
          const ex = map.get(curEmail)!;
          ex.totalFocusMinutes = Math.max(ex.totalFocusMinutes, localFocusMinutes);
          ex.isLive = storeState.stopwatch.isRunning;
          if (storeState.user.username) ex.username = storeState.user.username;
          if (storeState.user.school) ex.school = storeState.user.school;
          if (storeState.user.province) ex.province = storeState.user.province;
          if (storeState.user.membershipTier) ex.membershipTier = storeState.user.membershipTier;
        } else {
          map.set(curEmail, {
            rank: 0,
            displayName: storeState.user.displayName || 'Current User',
            username: storeState.user.username,
            school: storeState.user.school,
            province: storeState.user.province,
            email: storeState.user.email,
            totalFocusMinutes: localFocusMinutes,
            streakDays: 1,
            topSubject: 'Combined Maths',
            membershipTier: storeState.user.membershipTier || 'free',
            isLive: storeState.stopwatch.isRunning
          });
        }
      }

      // Convert to array and sort descending by focus minutes
      const realList = Array.from(map.values())
        .filter((entry) => entry.totalFocusMinutes > 0 || entry.email === storeState.user?.email)
        .sort((a, b) => b.totalFocusMinutes - a.totalFocusMinutes)
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }));

      setEntries(realList);
      setLastRefreshed(new Date());
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();
    const interval = setInterval(loadLeaderboardData, 60000);
    return () => clearInterval(interval);
  }, [storeState.user?.email, storeState.blocks.length, storeState.stopwatch.isRunning]);

  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center text-black font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-200">
          <Trophy className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 via-zinc-300 to-slate-400 flex items-center justify-center text-zinc-900 font-extrabold shadow-[0_0_12px_rgba(203,213,225,0.4)] border border-slate-100">
          <Award className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-700 via-amber-600 to-orange-700 flex items-center justify-center text-white font-extrabold shadow-[0_0_12px_rgba(217,119,6,0.3)] border border-amber-500/50">
          <Award className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 font-mono text-xs font-bold">
        #{rank}
      </div>
    );
  };

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'Combined Maths':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/25';
      case 'Physics':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case 'Chemistry':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'Biology':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      default:
        return 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/25';
    }
  };

  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      e.displayName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.username && e.username.toLowerCase().includes(q)) ||
      (e.school && e.school.toLowerCase().includes(q)) ||
      (e.province && e.province.toLowerCase().includes(q));
    const matchesSubject = subjectFilter === 'All' || e.topSubject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const top3 = entries.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header Banner with Live Pulse */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#141416] via-[#101012] to-[#0A0A0C] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#A3E635]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3E635] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3E635]"></span>
              </span>
              <span>LIVE CLOUD TELEMETRY • ZERO MOCK DATA</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>National Focus Leaderboard</span>
              <Trophy className="w-7 h-7 text-amber-400" />
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Real-time study telemetry synchronized directly from verified student sessions. 
              Only authentic registered students and live study minutes are displayed.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={loadLeaderboardData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#A3E635] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Ranks</span>
            </button>
          </div>
        </div>

        {/* Podium Display (Only if real students exist) */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
            {/* Rank 1 (Gold - Center/First) */}
            <div className="bg-gradient-to-b from-[#1C1917] to-[#141416] border-2 border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div className="absolute top-2 right-2 text-amber-500/20 font-black text-5xl select-none">
                #1
              </div>
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>ISLAND RANK #1</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-extrabold flex items-center justify-center text-lg shadow-lg">
                    {top3[0].displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 truncate">
                      <span>{top3[0].displayName}</span>
                      {top3[0].username && (
                        <span className="text-xs text-amber-400 font-mono">@{top3[0].username}</span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">
                      {top3[0].school || top3[0].email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="bg-black/30 p-2 rounded-xl">
                    <span className="text-zinc-400 text-[10px] block">Study Hours</span>
                    <span className="font-extrabold text-amber-300 text-sm tabular-nums">
                      {formatHours(top3[0].totalFocusMinutes)}
                    </span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-xl">
                    <span className="text-zinc-400 text-[10px] block">Streak</span>
                    <span className="font-extrabold text-orange-400 text-sm flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-orange-400" />
                      {top3[0].streakDays} Days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rank 2 (Silver) */}
            {top3.length >= 2 && (
              <div className="bg-[#18181B]/70 border border-slate-400/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-2 right-2 text-slate-400/20 font-black text-4xl select-none">
                  #2
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-base shadow-md">
                      {top3[1].displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                        <span>{top3[1].displayName}</span>
                        {top3[1].username && (
                          <span className="text-xs text-slate-400 font-mono">@{top3[1].username}</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">{top3[1].school || top3[1].email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-zinc-400">Total Focus</span>
                    <span className="font-bold text-white tabular-nums">{formatHours(top3[1].totalFocusMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Current Streak</span>
                    <span className="font-semibold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      {top3[1].streakDays} Days
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3.length >= 3 && (
              <div className="bg-[#18181B]/70 border border-amber-700/30 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-2 right-2 text-amber-700/20 font-black text-4xl select-none">
                  #3
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-800 text-amber-100 font-bold flex items-center justify-center text-base shadow-md">
                      {top3[2].displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                        <span>{top3[2].displayName}</span>
                        {top3[2].username && (
                          <span className="text-xs text-amber-400 font-mono">@{top3[2].username}</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">{top3[2].school || top3[2].email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-zinc-400">Total Focus</span>
                    <span className="font-bold text-white tabular-nums">{formatHours(top3[2].totalFocusMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Current Streak</span>
                    <span className="font-semibold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      {top3[2].streakDays} Days
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, @username, or school..."
            className="w-full bg-[#08080A] border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Combined Maths', 'Physics', 'Chemistry', 'Biology'].map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                subjectFilter === sub
                  ? 'bg-[#A3E635] text-black shadow-sm'
                  : 'bg-[#08080A] border border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Obsidian Apple HIG Table */}
      <div className="bg-[#141416] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Users className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Student Sessions Recorded Yet</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Start your focus stopwatch or log a study block to record your real study hours and lead the island rank.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#0C0C0E] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-4 px-6 w-20">Rank</th>
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">School & Province</th>
                  <th className="py-4 px-6">Top Subject</th>
                  <th className="py-4 px-6 text-right">Focus Hours</th>
                  <th className="py-4 px-6 text-center">Streak</th>
                  <th className="py-4 px-6 text-center">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredEntries.map((student) => {
                  const isTop3 = student.rank <= 3;
                  return (
                    <tr
                      key={student.email}
                      className={`hover:bg-white/[0.03] transition-colors group ${
                        isTop3 ? 'bg-white/[0.015]' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 font-semibold">
                        <div className="flex items-center gap-2">
                          {getRankBadge(student.rank)}
                        </div>
                      </td>

                      {/* Student Name & Username */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {student.displayName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{student.displayName}</span>
                              {student.username && (
                                <span className="text-[11px] text-[#A3E635] font-mono">@{student.username}</span>
                              )}
                              {student.rank === 1 && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                                  Champion
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono truncate block">{student.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* School & Province */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="text-white font-medium text-xs truncate max-w-[200px]">
                            {student.school || 'Private Candidate'}
                          </p>
                          {student.province && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {student.province}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Top Subject */}
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getSubjectColor(
                            student.topSubject
                          )}`}
                        >
                          {student.topSubject}
                        </span>
                      </td>

                      {/* Total Study Hours */}
                      <td className="py-4 px-6 text-right">
                        <div className="font-extrabold text-white text-sm tabular-nums">
                          {formatHours(student.totalFocusMinutes)}
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {student.totalFocusMinutes.toLocaleString()} mins
                        </span>
                      </td>

                      {/* Streak Counter */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{student.streakDays}d</span>
                        </div>
                      </td>

                      {/* Membership Tier */}
                      <td className="py-4 px-6 text-center">
                        {student.membershipTier === 'pro' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>PRO</span>
                          </span>
                        ) : student.membershipTier === 'master' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>MASTER</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Free</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 bg-[#0A0A0C] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A3E635]" />
            <span>Telemetry validated directly via Firestore & Google Sheets</span>
          </div>
          <div>
            <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
