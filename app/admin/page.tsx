'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  Trash2,
  ExternalLink,
  RefreshCw,
  Send,
  Eye,
  History,
  X,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Crown,
  GraduationCap,
  School,
  MapPin
} from 'lucide-react';
import { NavigationRail } from '@/components/NavigationRail';
import { FeedbackTicket, PastPaperItem, AuditRecord, UserProfile } from '@/lib/types';
import {
  fetchAllFeedbackTickets,
  updateFeedbackTicketStatus,
  publishReleaseFromFixedTickets
} from '@/lib/feedbackService';
import {
  getQuarantinedPapers,
  getApprovedPastPapers,
  approveQuarantinedPaper,
  rejectQuarantinedPaper,
  deleteApprovedPaper,
  banUserUploader,
  isUserBanned
} from '@/lib/papersService';
import {
  fetchAllUsersFromFirestore,
  adminUpdateUserInFirestore,
  adminDeleteUserFromFirestore
} from '@/lib/firestoreSync';
import { PaperPreviewModal } from '@/components/PaperPreviewModal';
import { useTelemetryStore } from '@/lib/telemetryStore';
import { signInWithGoogle } from '@/lib/firebaseAuth';

const OWNER_EMAILS = [
  'aimssssff@gmail.com',
  'alwisachalaanurada@gmail.com',
  'achala500@gmail.com',
  '111077537+achala500@users.noreply.github.com'
];

export default function AdminPage() {
  const storeState = useTelemetryStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'feedback' | 'audit' | 'release' | 'papers' | 'users'>('feedback');

  // Loading & Error States
  const [loadingData, setLoadingData] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Users Directory & Control State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState<'all' | 'starter' | 'pro' | 'master'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Feedback State
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [selectedAuditTicket, setSelectedAuditTicket] = useState<FeedbackTicket | null>(null);
  const [hideSpam, setHideSpam] = useState(true);

  // Release State
  const [releaseVersion, setReleaseVersion] = useState('v1.5.1');
  const [isPublishingRelease, setIsPublishingRelease] = useState(false);
  const [releaseSuccessNote, setReleaseSuccessNote] = useState<string | null>(null);

  // Quarantined & Published Papers State
  const [quarantinedPapers, setQuarantinedPapers] = useState<PastPaperItem[]>([]);
  const [publishedPapers, setPublishedPapers] = useState<PastPaperItem[]>([]);
  const [previewPdfPaper, setPreviewPdfPaper] = useState<PastPaperItem | null>(null);

  // Papers search, filter & toast notifications
  const [paperSearch, setPaperSearch] = useState('');
  const [paperSubjectFilter, setPaperSubjectFilter] = useState('All');
  const [paperViewFilter, setPaperViewFilter] = useState<'all' | 'quarantined' | 'published'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const currentUserEmail = (storeState.user?.email || '').toLowerCase().trim();
  const envAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
  const isOwner = Boolean(
    currentUserEmail &&
      (OWNER_EMAILS.includes(currentUserEmail) || currentUserEmail === envAdminEmail)
  );

  useEffect(() => {
    if (isOwner) {
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      setIsAuthenticated(false);
    }
  }, [currentUserEmail, isOwner]);

  const loadAdminData = async () => {
    setLoadingData(true);
    setQueryError(null);
    try {
      const [fb, qp, pub, usrList] = await Promise.all([
        fetchAllFeedbackTickets(),
        getQuarantinedPapers(),
        getApprovedPastPapers(),
        fetchAllUsersFromFirestore()
      ]);
      setTickets(fb);
      setQuarantinedPapers(qp);
      setPublishedPapers(pub);
      setUsers(usrList);
    } catch (err: any) {
      setQueryError(err?.message || 'Failed to load records from Firestore.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleUserBan = async (user: UserProfile) => {
    const newBannedState = !user.isBanned;
    setUsers((prev) =>
      prev.map((u) => (u.userId === user.userId ? { ...u, isBanned: newBannedState } : u))
    );
    showToast(`User "${user.displayName || user.email}" is now ${newBannedState ? 'BANNED' : 'UNBANNED'}.`);
    await adminUpdateUserInFirestore(user.userId, { isBanned: newBannedState });
    const fresh = await fetchAllUsersFromFirestore();
    setUsers(fresh);
  };

  const handleToggleUserTier = async (user: UserProfile) => {
    const newTier: 'starter' | 'pro' | 'master' = user.membershipTier === 'pro' ? 'starter' : 'pro';
    setUsers((prev) =>
      prev.map((u) => (u.userId === user.userId ? { ...u, membershipTier: newTier } : u))
    );
    showToast(`User "${user.displayName || user.email}" tier set to ${newTier.toUpperCase()}.`);
    await adminUpdateUserInFirestore(user.userId, { membershipTier: newTier });
    const fresh = await fetchAllUsersFromFirestore();
    setUsers(fresh);
  };

  const handleDeleteUserRecord = async (user: UserProfile) => {
    if (confirm(`Permanently delete account for "${user.displayName || user.email}" from Firestore?`)) {
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      showToast(`User account deleted.`);
      await adminDeleteUserFromFirestore(user.userId);
      const fresh = await fetchAllUsersFromFirestore();
      setUsers(fresh);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: FeedbackTicket['status']) => {
    await updateFeedbackTicketStatus(
      ticketId,
      newStatus,
      `Status updated to ${newStatus} by Owner`,
      storeState.user?.email || 'Owner'
    );
    loadAdminData();
  };

  const handlePublishRelease = async () => {
    const fixedTickets = tickets.filter((t) => t.status === 'FIXED');
    if (fixedTickets.length === 0) {
      alert('No tickets marked as FIXED yet. Mark at least one ticket as FIXED to generate release notes.');
      return;
    }

    setIsPublishingRelease(true);
    try {
      const entry = await publishReleaseFromFixedTickets(fixedTickets, releaseVersion);
      setReleaseSuccessNote(`Release ${entry.version} published! User-facing changelog updated.`);
      loadAdminData();
      setTimeout(() => setReleaseSuccessNote(null), 5000);
    } catch (err: any) {
      alert('Failed to publish release notes: ' + (err?.message || 'Error'));
    } finally {
      setIsPublishingRelease(false);
    }
  };

  const handleApprovePaper = async (paperId: string) => {
    const target = quarantinedPapers.find((p) => p.id === paperId);
    setQuarantinedPapers((prev) => prev.filter((p) => p.id !== paperId));
    if (target) {
      setPublishedPapers((prev) => [target, ...prev]);
    }
    showToast(`Paper "${target?.title || paperId}" approved and published to library.`);
    await approveQuarantinedPaper(paperId);
    const [qp, pub] = await Promise.all([getQuarantinedPapers(), getApprovedPastPapers()]);
    setQuarantinedPapers(qp);
    setPublishedPapers(pub);
  };

  const handleRejectPaper = async (paperId: string) => {
    const target = quarantinedPapers.find((p) => p.id === paperId);
    setQuarantinedPapers((prev) => prev.filter((p) => p.id !== paperId));
    showToast(`Paper "${target?.title || paperId}" rejected and removed from queue.`);
    await rejectQuarantinedPaper(paperId);
    const qp = await getQuarantinedPapers();
    setQuarantinedPapers(qp);
  };

  const handleDeleteQuarantinedPaper = async (paperId: string, title?: string) => {
    if (confirm(`Permanently delete "${title || 'paper'}" from quarantine?`)) {
      setQuarantinedPapers((prev) => prev.filter((p) => p.id !== paperId));
      showToast(`Quarantined paper "${title || paperId}" permanently deleted.`);
      await rejectQuarantinedPaper(paperId);
      const qp = await getQuarantinedPapers();
      setQuarantinedPapers(qp);
    }
  };

  const handleDeletePublishedPaper = async (paperId: string, title?: string) => {
    if (confirm(`Permanently delete "${title || 'paper'}" from library and cloud database?`)) {
      setPublishedPapers((prev) => prev.filter((p) => p.id !== paperId));
      showToast(`Paper "${title || paperId}" permanently deleted from library.`);
      await deleteApprovedPaper(paperId);
      const pub = await getApprovedPastPapers();
      setPublishedPapers(pub);
    }
  };

  const handleBanUploader = (email?: string) => {
    if (!email) return;
    if (confirm(`Restrict ${email} from uploading further past papers?`)) {
      banUserUploader(email);
      alert(`User ${email} has been restricted from uploads.`);
    }
  };

  // Compile all audit logs across all tickets
  const allAuditLogs = tickets
    .flatMap((t) =>
      (t.auditHistory || []).map((a) => ({
        ...a,
        ticketId: t.id,
        ticketTitle: t.description
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Screen for Unauthorized / Unauthenticated Users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08080A] text-zinc-100 flex items-center justify-center p-4 selection:bg-[#A3E635] selection:text-black">
        <div className="max-w-md w-full bg-[#141416] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Owner Control Plane</h1>
            <p className="text-xs text-zinc-400">
              This administrative portal is restricted strictly to the verified repository owner account.
            </p>
          </div>

          {storeState.user ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
              <p className="text-xs text-rose-300">
                Signed in as <span className="font-semibold text-white">{storeState.user.email}</span>. This account does not possess owner credentials.
              </p>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-md active:scale-95"
              >
                Switch to Owner Google Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-md active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter((t) => {
    if (hideSpam && t.isSpam) return false;
    return true;
  });

  const fixedTicketsCount = tickets.filter((t) => t.status === 'FIXED').length;

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      <NavigationRail activeView="admin" />

      {/* Main Admin Workspace */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
        <header className="sticky top-0 z-30 bg-[#08080A]/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Admin Operations Hub</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  Verified Owner
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Feedback auto-audit, Gemini release pipeline & paper quarantine</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <button
              onClick={loadAdminData}
              disabled={loadingData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-[#A3E635]' : ''}`} />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          {/* Error Banner */}
          {queryError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{queryError}</span>
              </div>
              <button
                onClick={loadAdminData}
                className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === 'feedback'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Feedback Queue ({tickets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History ({allAuditLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('release')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === 'release'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Release Publisher ({fixedTicketsCount} Ready)</span>
            </button>

            <button
              onClick={() => setActiveTab('papers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === 'papers'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Pending Papers ({quarantinedPapers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Directory & Control ({users.length})</span>
            </button>
          </div>

          {loadingData ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#A3E635]" />
              <p className="text-xs text-zinc-400 font-medium">Loading Firestore records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: FEEDBACK QUEUE */}
              {activeTab === 'feedback' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#141416] p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 font-medium">Filter Spam:</span>
                      <button
                        onClick={() => setHideSpam(!hideSpam)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                          hideSpam
                            ? 'bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30'
                            : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        {hideSpam ? 'Hiding Spam' : 'Showing All'}
                      </button>
                    </div>
                  </div>

                  {filteredTickets.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                      No feedback tickets submitted yet. Submissions from students will appear here with Gemini 3.8 Flash audits.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredTickets.map((t) => (
                        <div
                          key={t.id}
                          className="bg-[#141416] border border-white/10 rounded-2xl p-5 space-y-3 hover:border-white/20 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  t.classification === 'Bug'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : t.classification === 'Feature'
                                    ? 'bg-[#A3E635]/20 text-[#A3E635] border border-[#A3E635]/30'
                                    : 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30'
                                }`}
                              >
                                {t.classification || t.category}
                              </span>
                              <span className="text-xs font-mono text-zinc-500">{t.id}</span>
                              <span className="text-xs text-zinc-400">• {new Date(t.timestamp).toLocaleDateString()}</span>
                            </div>

                            {/* Status Stepper Buttons */}
                            <div className="flex items-center gap-1.5">
                              {(['NEW', 'AUDITED', 'IN_PROGRESS', 'FIXED', 'RELEASED'] as const).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(t.id, st)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                    t.status === st
                                      ? 'bg-white text-black font-bold shadow-sm'
                                      : 'bg-white/5 text-zinc-500 hover:text-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>

                          <p className="text-sm text-zinc-200 leading-relaxed">{t.description}</p>

                          {t.annotatedScreenshotUrl && (
                            <a
                              href={t.annotatedScreenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#38BDF8] hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View attached screenshot</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: AUDIT HISTORY */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="bg-[#141416] p-4 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-bold text-white">Immutable Status Transition Stream</h2>
                    <p className="text-xs text-zinc-400">Timestamped audit records tracking tickets from submission to release.</p>
                  </div>

                  {allAuditLogs.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                      No status transitions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allAuditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-[#141416] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{log.author}</span>
                              <span className="text-zinc-500">transitioned</span>
                              <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-bold">{log.fromStatus}</span>
                              <span className="text-zinc-500">&rarr;</span>
                              <span className="px-2 py-0.5 rounded bg-[#A3E635]/20 text-[#A3E635] font-bold">{log.toStatus}</span>
                            </div>
                            <p className="text-zinc-400">{log.note}</p>
                          </div>
                          <div className="text-zinc-500 tabular-nums">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RELEASE PUBLISHER */}
              {activeTab === 'release' && (
                <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-white">Automated Changelog Release Pipeline</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Synthesizes all tickets currently marked as <span className="text-[#A3E635] font-semibold">FIXED</span> into user-facing release notes using Gemini 3.8 Flash and publishes them directly to /changelog.
                    </p>
                  </div>

                  {releaseSuccessNote && (
                    <div className="p-4 rounded-2xl bg-[#A3E635]/10 border border-[#A3E635]/30 text-[#A3E635] text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{releaseSuccessNote}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Release Version:</label>
                      <input
                        type="text"
                        value={releaseVersion}
                        onChange={(e) => setReleaseVersion(e.target.value)}
                        className="bg-[#08080A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={handlePublishRelease}
                      disabled={isPublishingRelease || fixedTicketsCount === 0}
                      className="mt-5 px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all disabled:opacity-40 active:scale-95 shadow-md"
                    >
                      {isPublishingRelease ? 'Synthesizing with Gemini...' : `Publish Release (${fixedTicketsCount} tickets)`}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PAPERS HUB (QUARANTINED & APPROVED LIBRARY) */}
              {activeTab === 'papers' && (
                <div className="space-y-6">
                  {/* Header & Overview */}
                  <div className="bg-[#141416] p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#A3E635]" />
                        <span>Past Papers &amp; Moderation Hub</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Manage scanned PDF documents across Quarantined queue and Approved public library with instant deletion controls.
                      </p>
                    </div>

                    {/* View Filter Switcher */}
                    <div className="flex items-center gap-1.5 bg-[#08080A] p-1 rounded-2xl border border-white/10 text-xs">
                      <button
                        onClick={() => setPaperViewFilter('all')}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                          paperViewFilter === 'all'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        All ({quarantinedPapers.length + publishedPapers.length})
                      </button>
                      <button
                        onClick={() => setPaperViewFilter('quarantined')}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                          paperViewFilter === 'quarantined'
                            ? 'bg-amber-500 text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Quarantine ({quarantinedPapers.length})
                      </button>
                      <button
                        onClick={() => setPaperViewFilter('published')}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                          paperViewFilter === 'published'
                            ? 'bg-[#A3E635] text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Approved Library ({publishedPapers.length})
                      </button>
                    </div>
                  </div>

                  {/* Search and Subject Filter Bar */}
                  <div className="bg-[#141416] border border-white/10 rounded-3xl p-4 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Search */}
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={paperSearch}
                          onChange={(e) => setPaperSearch(e.target.value)}
                          placeholder="Search papers by title, subject, year, or uploader..."
                          className="w-full bg-[#08080A] border border-white/10 rounded-2xl py-2 pl-10 pr-8 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                        />
                        {paperSearch && (
                          <button
                            onClick={() => setPaperSearch('')}
                            className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Subject Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {['All', 'Combined Maths', 'Physics', 'Chemistry', 'Revision'].map((subj) => (
                          <button
                            key={subj}
                            onClick={() => setPaperSubjectFilter(subj)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                              paperSubjectFilter === subj
                                ? 'bg-[#A3E635] text-black shadow-sm'
                                : 'bg-[#08080A] border border-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {subj}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const normSearch = paperSearch.trim().toLowerCase();
                    const matchesFilter = (p: PastPaperItem) => {
                      const matchesText =
                        !normSearch ||
                        p.title.toLowerCase().includes(normSearch) ||
                        p.subject.toLowerCase().includes(normSearch) ||
                        String(p.year).includes(normSearch) ||
                        (p.uploaderEmail || '').toLowerCase().includes(normSearch) ||
                        (p.uploaderName || '').toLowerCase().includes(normSearch);
                      const matchesSubj =
                        paperSubjectFilter === 'All' || p.subject === paperSubjectFilter;
                      return matchesText && matchesSubj;
                    };

                    const filteredQuarantined = quarantinedPapers.filter(matchesFilter);
                    const filteredPublished = publishedPapers.filter(matchesFilter);

                    const showQuarantined =
                      paperViewFilter === 'all' || paperViewFilter === 'quarantined';
                    const showPublished =
                      paperViewFilter === 'all' || paperViewFilter === 'published';

                    return (
                      <div className="space-y-8">
                        {/* QUARANTINED SECTION */}
                        {showQuarantined && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Quarantined Moderation Queue</span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-mono">
                                  {filteredQuarantined.length} {filteredQuarantined.length !== quarantinedPapers.length && `of ${quarantinedPapers.length}`}
                                </span>
                              </h3>
                              <span className="text-[11px] text-zinc-500">Requires Owner Verification</span>
                            </div>

                            {filteredQuarantined.length === 0 ? (
                              <div className="border border-dashed border-white/10 rounded-3xl p-8 text-center text-xs text-zinc-500 bg-[#141416]/40">
                                {paperSearch || paperSubjectFilter !== 'All'
                                  ? 'No quarantined papers match your search and filter criteria.'
                                  : 'No papers currently awaiting quarantine moderation.'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {filteredQuarantined.map((p) => (
                                  <div
                                    key={p.id}
                                    className="bg-[#141416] border border-white/10 hover:border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all"
                                  >
                                    <div className="space-y-1.5 max-w-xl">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-white">{p.title}</span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/25">
                                          {p.subject} • {p.year}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 text-[10px]">
                                          {p.examType}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-400">
                                        Uploaded by: <span className="text-zinc-200">{p.uploaderName || 'Student'}</span>{' '}
                                        <span className="text-zinc-500">({p.uploaderEmail || 'anonymous'})</span> •{' '}
                                        <span className="font-mono text-zinc-500">{new Date(p.uploadedAt).toLocaleString()}</span>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      {p.downloadUrl && p.downloadUrl !== '#' && (
                                        <button
                                          onClick={() => setPreviewPdfPaper(p)}
                                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                          <span>Preview</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleApprovePaper(p.id)}
                                        className="px-3.5 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all shadow-md"
                                      >
                                        Approve &amp; Publish
                                      </button>
                                      <button
                                        onClick={() => handleRejectPaper(p.id)}
                                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleDeleteQuarantinedPaper(p.id, p.title)}
                                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs flex items-center gap-1.5 font-semibold transition-all active:scale-95 shadow-sm"
                                        title="Permanent Delete PDF"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Delete Paper</span>
                                      </button>
                                      {p.uploaderEmail && (
                                        <button
                                          onClick={() => handleBanUploader(p.uploaderEmail)}
                                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs transition-colors"
                                          title="Ban uploader"
                                        >
                                          Ban
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* APPROVED PUBLISHED PAPERS SECTION */}
                        {showPublished && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]" />
                                <span>Approved Library Papers</span>
                                <span className="px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] text-[11px] font-mono">
                                  {filteredPublished.length} {filteredPublished.length !== publishedPapers.length && `of ${publishedPapers.length}`}
                                </span>
                              </h3>
                              <span className="text-[11px] text-zinc-500">Live in Public Library</span>
                            </div>

                            {filteredPublished.length === 0 ? (
                              <div className="border border-dashed border-white/10 rounded-3xl p-8 text-center text-xs text-zinc-500 bg-[#141416]/40">
                                {paperSearch || paperSubjectFilter !== 'All'
                                  ? 'No published papers match your search and filter criteria.'
                                  : 'No papers published to library yet.'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {filteredPublished.map((p) => (
                                  <div
                                    key={p.id}
                                    className="bg-[#141416] border border-white/10 hover:border-[#A3E635]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all"
                                  >
                                    <div className="space-y-1.5 max-w-xl">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-white">{p.title}</span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] text-[10px] font-semibold border border-[#A3E635]/25">
                                          {p.subject} • {p.year}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 text-[10px]">
                                          {p.examType}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-400">
                                        Contributor: <span className="text-zinc-200">{p.uploaderName || 'Student'}</span> •{' '}
                                        Uploaded: <span className="font-mono text-zinc-500">{new Date(p.uploadedAt).toLocaleDateString()}</span>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      {p.downloadUrl && p.downloadUrl !== '#' && (
                                        <>
                                          <button
                                            onClick={() => setPreviewPdfPaper(p)}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Preview</span>
                                          </button>
                                          <a
                                            href={p.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Drive File</span>
                                          </a>
                                        </>
                                      )}
                                      <button
                                        onClick={() => handleDeletePublishedPaper(p.id, p.title)}
                                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs flex items-center gap-1.5 font-semibold transition-all active:scale-95 shadow-sm"
                                        title="Delete Paper from Library & Cloud"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Delete Paper</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 5: STUDENT DIRECTORY & ADMIN CONTROLS */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Metric Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-1">
                      <span className="text-[11px] font-mono text-zinc-400">Total Registered</span>
                      <p className="text-xl font-bold text-white tabular-nums">{users.length}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-1">
                      <span className="text-[11px] font-mono text-amber-400">Pro Subscribers</span>
                      <p className="text-xl font-bold text-amber-300 tabular-nums">
                        {users.filter((u) => u.membershipTier === 'pro').length}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-1">
                      <span className="text-[11px] font-mono text-rose-400">Suspended / Banned</span>
                      <p className="text-xl font-bold text-rose-300 tabular-nums">
                        {users.filter((u) => u.isBanned).length}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-1">
                      <span className="text-[11px] font-mono text-[#A3E635]">Verified Admins</span>
                      <p className="text-xl font-bold text-[#A3E635] tabular-nums">{OWNER_EMAILS.length}</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search student, @username, email, or school..."
                        className="w-full bg-[#08080A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={userTierFilter}
                        onChange={(e) => setUserTierFilter(e.target.value as any)}
                        className="bg-[#08080A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                      >
                        <option value="all">All Tiers</option>
                        <option value="starter">Starter Students</option>
                        <option value="pro">Pro Students</option>
                        <option value="master">Master Cohort</option>
                      </select>

                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value as any)}
                        className="bg-[#08080A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="banned">Banned Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-[#141416] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    {(() => {
                      const filtered = users.filter((u) => {
                        const q = userSearch.toLowerCase();
                        const matchesQuery =
                          (u.displayName || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          (u.username || '').toLowerCase().includes(q) ||
                          (u.school || '').toLowerCase().includes(q) ||
                          (u.province || '').toLowerCase().includes(q);
                        const matchesTier = userTierFilter === 'all' || u.membershipTier === userTierFilter;
                        const matchesStatus =
                          userStatusFilter === 'all' ||
                          (userStatusFilter === 'banned' ? u.isBanned : !u.isBanned);
                        return matchesQuery && matchesTier && matchesStatus;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-16 text-center space-y-2">
                            <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                            <p className="text-xs text-zinc-400">No student profiles match the filter criteria.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 bg-[#0C0C0E] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                <th className="py-3.5 px-5">Student Identity</th>
                                <th className="py-3.5 px-5">School & Province</th>
                                <th className="py-3.5 px-5">Stream / Exam</th>
                                <th className="py-3.5 px-5 text-right">Study Time</th>
                                <th className="py-3.5 px-5 text-center">Tier</th>
                                <th className="py-3.5 px-5 text-center">Status</th>
                                <th className="py-3.5 px-5 text-right">Admin Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                              {filtered.map((u) => (
                                <tr key={u.userId} className="hover:bg-white/[0.02] transition-colors">
                                  {/* Identity */}
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                                        {(u.displayName || u.email || 'S').charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                          <span>{u.displayName || 'Student'}</span>
                                          {u.username && (
                                            <span className="text-[11px] text-[#A3E635] font-mono">@{u.username}</span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-zinc-400 font-mono truncate block">{u.email}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* School & Province */}
                                  <td className="py-3.5 px-5">
                                    <p className="text-white font-medium text-xs truncate max-w-[200px]">
                                      {u.school || 'Private Candidate'}
                                    </p>
                                    <span className="text-[10px] text-zinc-500 block truncate">{u.province || '—'}</span>
                                  </td>

                                  {/* Stream / Exam */}
                                  <td className="py-3.5 px-5">
                                    <span className="text-zinc-300 block truncate max-w-[160px]">{u.stream || 'A/L'}</span>
                                    {u.examYear && <span className="text-[10px] text-zinc-500 font-mono">{u.examYear} A/L</span>}
                                  </td>

                                  {/* Study Time */}
                                  <td className="py-3.5 px-5 text-right">
                                    <span className="font-extrabold text-white tabular-nums">
                                      {Math.round((u.totalFocusMinutes || 0) / 60)}h
                                    </span>
                                    <span className="text-[10px] text-zinc-500 block">{(u.totalFocusMinutes || 0)}m</span>
                                  </td>

                                  {/* Tier */}
                                  <td className="py-3.5 px-5 text-center">
                                    {u.membershipTier === 'pro' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                        PRO
                                      </span>
                                    ) : (
                                      <span className="text-zinc-500 text-[11px]">Free</span>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3.5 px-5 text-center">
                                    {u.isBanned ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                                        BANNED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                                        ACTIVE
                                      </span>
                                    )}
                                  </td>

                                  {/* Admin Actions */}
                                  <td className="py-3.5 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleToggleUserTier(u)}
                                        className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all"
                                        title={u.membershipTier === 'pro' ? 'Downgrade to Free' : 'Promote to Pro'}
                                      >
                                        {u.membershipTier === 'pro' ? 'Revoke Pro' : 'Make Pro'}
                                      </button>

                                      <button
                                        onClick={() => handleToggleUserBan(u)}
                                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                                          u.isBanned
                                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                                            : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
                                        }`}
                                      >
                                        {u.isBanned ? 'Unban' : 'Ban'}
                                      </button>

                                      <button
                                        onClick={() => handleDeleteUserRecord(u)}
                                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        title="Delete user record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Confirmation Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141416]/95 border border-[#A3E635]/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-[#A3E635] shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white ml-2 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF In-App Preview Modal with Direct Drive Fallback */}
      <PaperPreviewModal
        paper={previewPdfPaper}
        onClose={() => setPreviewPdfPaper(null)}
        onApprove={handleApprovePaper}
        isAdmin={true}
      />
    </div>
  );
}
