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
  Lock
} from 'lucide-react';
import { NavigationRail } from '@/components/NavigationRail';
import { FeedbackTicket, PastPaperItem, AuditRecord } from '@/lib/types';
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
import { useTelemetryStore } from '@/lib/telemetryStore';
import { signInWithGoogle } from '@/lib/firebaseAuth';

const OWNER_EMAILS = [
  'achala500@gmail.com',
  'achala500',
  '111077537+achala500@users.noreply.github.com'
];

export default function AdminPage() {
  const storeState = useTelemetryStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'feedback' | 'audit' | 'release' | 'papers'>('feedback');

  // Loading & Error States
  const [loadingData, setLoadingData] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

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

  const currentUserEmail = (storeState.user?.email || '').toLowerCase().trim();
  const envAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
  const isOwner =
    currentUserEmail &&
    (OWNER_EMAILS.includes(currentUserEmail) ||
      currentUserEmail === envAdminEmail ||
      currentUserEmail.startsWith('achala'));

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
      const fb = await fetchAllFeedbackTickets();
      setTickets(fb);
      const qp = await getQuarantinedPapers();
      setQuarantinedPapers(qp);
      const pub = await getApprovedPastPapers();
      setPublishedPapers(pub);
    } catch (err: any) {
      setQueryError(err?.message || 'Failed to load records from Firestore.');
    } finally {
      setLoadingData(false);
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
    await approveQuarantinedPaper(paperId);
    loadAdminData();
  };

  const handleRejectPaper = async (paperId: string) => {
    await rejectQuarantinedPaper(paperId);
    loadAdminData();
  };

  const handleDeleteQuarantinedPaper = async (paperId: string) => {
    if (confirm('Permanently delete this quarantined paper?')) {
      await rejectQuarantinedPaper(paperId);
      loadAdminData();
    }
  };

  const handleDeletePublishedPaper = async (paperId: string) => {
    if (confirm('Delete this published paper from the library and cloud database?')) {
      await deleteApprovedPaper(paperId);
      loadAdminData();
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
            <div className="space-y-4">
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

              {/* TAB 4: PENDING PAPERS */}
              {activeTab === 'papers' && (
                <div className="space-y-4">
                  <div className="bg-[#141416] p-4 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-bold text-white">Quarantined Student Uploads</h2>
                    <p className="text-xs text-zinc-400">Review scanned PDFs, verify accuracy, and publish to the public Google Drive past papers hub.</p>
                  </div>

                  {quarantinedPapers.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                      No quarantined papers in the moderation queue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {quarantinedPapers.map((p) => (
                        <div
                          key={p.id}
                          className="bg-[#141416] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{p.title}</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                                {p.subject} • {p.year}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              Uploaded by: {p.uploaderName || 'Student'} ({p.uploaderEmail || 'anonymous'})
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {p.downloadUrl && p.downloadUrl !== '#' && (
                              <button
                                onClick={() => setPreviewPdfPaper(p)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                              >
                                Preview PDF
                              </button>
                            )}
                            <button
                              onClick={() => handleApprovePaper(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all"
                            >
                              Approve &amp; Publish
                            </button>
                            <button
                              onClick={() => handleRejectPaper(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleDeleteQuarantinedPaper(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs flex items-center gap-1 font-semibold transition-all"
                              title="Direct Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Paper</span>
                            </button>
                            {p.uploaderEmail && (
                              <button
                                onClick={() => handleBanUploader(p.uploaderEmail)}
                                className="px-2 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs"
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

                  {/* Published Library Papers Section with Direct Delete */}
                  <div className="bg-[#141416] p-4 rounded-2xl border border-white/10 mt-8">
                    <h2 className="text-sm font-bold text-white">Published Library Papers ({publishedPapers.length})</h2>
                    <p className="text-xs text-zinc-400">Live past papers currently published and accessible in the student library.</p>
                  </div>

                  {publishedPapers.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-3xl p-8 text-center text-xs text-zinc-500">
                      No published papers in the library yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {publishedPapers.map((p) => (
                        <div
                          key={p.id}
                          className="bg-[#141416] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{p.title}</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#A3E635] text-[10px] font-semibold">
                                {p.subject} • {p.year}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 text-[10px]">
                                {p.examType}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">
                              Uploaded: {new Date(p.uploadedAt).toLocaleDateString()} • {p.uploaderName || 'Student'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {p.downloadUrl && p.downloadUrl !== '#' && (
                              <button
                                onClick={() => setPreviewPdfPaper(p)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                              >
                                Preview PDF
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePublishedPaper(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs flex items-center gap-1 font-semibold transition-all"
                              title="Delete from Library & Cloud"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Paper</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* PDF In-App Preview Modal */}
      {previewPdfPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl h-[85vh] bg-[#141416] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">{previewPdfPaper.title}</h3>
              <button
                onClick={() => setPreviewPdfPaper(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full bg-[#08080A] rounded-2xl overflow-hidden border border-white/10">
              <iframe
                src={previewPdfPaper.downloadUrl}
                title={previewPdfPaper.title}
                className="w-full h-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  handleApprovePaper(previewPdfPaper.id);
                  setPreviewPdfPaper(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs"
              >
                Approve Paper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
