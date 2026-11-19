'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  UserCheck,
  UserX,
  Trash2,
  ExternalLink,
  RefreshCw,
  Send,
  Eye,
  History,
  X
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
  approveQuarantinedPaper,
  rejectQuarantinedPaper,
  banUserUploader,
  isUserBanned
} from '@/lib/papersService';
import { useTelemetryStore } from '@/lib/telemetryStore';
import { signInWithGoogle } from '@/lib/firebaseAuth';

const MASTER_ADMIN_PASSWORDS = ['chrono2026!', 'admin123', 'telemetry2026'];
const AUTHORIZED_EMAILS = [
  'achala500@gmail.com',
  'achala500',
  '111077537+achala500@users.noreply.github.com',
  'alex.vance@gmail.com'
];

export default function AdminPage() {
  const storeState = useTelemetryStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'feedback' | 'release' | 'papers'>('feedback');

  // Feedback State
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [selectedAuditTicket, setSelectedAuditTicket] = useState<FeedbackTicket | null>(null);
  const [hideSpam, setHideSpam] = useState(true);

  // Release State
  const [releaseVersion, setReleaseVersion] = useState('v1.5.1');
  const [isPublishingRelease, setIsPublishingRelease] = useState(false);
  const [releaseSuccessNote, setReleaseSuccessNote] = useState<string | null>(null);

  // Quarantined Papers State
  const [quarantinedPapers, setQuarantinedPapers] = useState<PastPaperItem[]>([]);
  const [previewPdfPaper, setPreviewPdfPaper] = useState<PastPaperItem | null>(null);

  useEffect(() => {
    // Check local admin session or authorized email
    const storedAuth = typeof window !== 'undefined' && localStorage.getItem('chrono_admin_auth') === 'true';
    const email = (storeState.user?.email || '').toLowerCase().trim();
    const envAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();

    if (storedAuth || (email && (AUTHORIZED_EMAILS.includes(email) || email === envAdminEmail || email.startsWith('achala')))) {
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, [storeState.user]);

  const loadAdminData = async () => {
    setLoadingFeedback(true);
    const fb = await fetchAllFeedbackTickets();
    setTickets(fb);
    const qp = await getQuarantinedPapers();
    setQuarantinedPapers(qp);
    setLoadingFeedback(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (MASTER_ADMIN_PASSWORDS.includes(passwordInput.trim())) {
      setIsAuthenticated(true);
      setPasswordError(false);
      localStorage.setItem('chrono_admin_auth', 'true');
      loadAdminData();
    } else {
      setPasswordError(true);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: FeedbackTicket['status']) => {
    await updateFeedbackTicketStatus(
      ticketId,
      newStatus,
      `Status updated to ${newStatus} by Admin`,
      storeState.user?.email || 'Admin'
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
      setReleaseSuccessNote(`Release ${entry.version} published! User-facing changelog updated and version badge bumped.`);
      loadAdminData();
      setTimeout(() => setReleaseSuccessNote(null), 5000);
    } catch {
      alert('Failed to publish release notes.');
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

  const handleBanUploader = (email?: string) => {
    if (!email) return;
    if (confirm(`Are you sure you want to ban ${email} from uploading papers?`)) {
      banUserUploader(email);
      alert(`User ${email} has been restricted from uploads.`);
    }
  };

  // Password / Unauthorized Access Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08080A] text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141416] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Chrono Operations Gateway</h1>
            <p className="text-xs text-zinc-400">
              Restricted to authorized owner email & administrator password
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Administrator Password:</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Enter admin password (chrono2026!)"
                className="w-full bg-[#08080A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-rose-400 mt-1">Invalid administrator password.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 active:scale-95 transition-all shadow-md"
            >
              Unlock Admin Portal
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
            <span>Or sign in with owner Google email</span>
            <button
              onClick={() => signInWithGoogle()}
              className="text-[#A3E635] hover:underline font-semibold"
            >
              Sign in with Google
            </button>
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
      {/* Navigation Rail */}
      <NavigationRail
        activeView="admin"
        syncStatus={storeState.isSyncing ? 'syncing' : storeState.isOnline ? 'live' : 'offline'}
      />

      {/* Main Admin Workspace */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
        <header className="sticky top-0 z-30 bg-[#08080A]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Admin Operations Hub</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  Owner Active
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Feedback auto-audit, Gemini release pipeline & paper quarantine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('chrono_admin_auth');
                setIsAuthenticated(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-zinc-400 hover:text-white"
            >
              Lock Admin
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-[#141416] p-1.5 rounded-2xl border border-white/10 max-w-md">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'feedback'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Feedback ({filteredTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('release')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'release'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Release Sync ({fixedTicketsCount})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'papers'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pending Papers ({quarantinedPapers.length})
            </button>
          </div>

          {releaseSuccessNote && (
            <div className="p-4 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 text-[#A3E635] text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{releaseSuccessNote}</span>
            </div>
          )}

          {/* TAB 1: Auto-Audited Feedback Queue */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Auto-triaged by Gemini 3.8 Flash</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideSpam}
                    onChange={(e) => setHideSpam(e.target.checked)}
                    className="accent-[#A3E635]"
                  />
                  <span>Hide Spam submissions</span>
                </label>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                  No feedback submissions recorded yet. Submissions from &quot;Share Visual Feedback&quot; will appear here automatically.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-[#141416] border border-white/10 rounded-3xl p-5 shadow-lg space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ticket.priority === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : ticket.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            {ticket.priority || 'NORMAL'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-xs font-semibold">
                            {ticket.classification || ticket.category}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(ticket.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {/* Status Transition Selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value as any)}
                            className="bg-[#08080A] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                          >
                            <option value="NEW">New</option>
                            <option value="AUDITED">Audited</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="FIXED">Fixed</option>
                            <option value="RELEASED">Released</option>
                          </select>

                          <button
                            onClick={() => setSelectedAuditTicket(ticket)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                            title="View Immutable Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed">{ticket.description}</p>

                      {ticket.aiNotes && (
                        <div className="p-2.5 rounded-2xl bg-[#08080A] border border-white/5 text-[11px] text-[#A3E635] flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Gemini 3.8 Flash Audit: {ticket.aiNotes}</span>
                        </div>
                      )}

                      {ticket.annotatedScreenshotUrl && (
                        <div className="pt-2">
                          <button
                            onClick={() => window.open(ticket.annotatedScreenshotUrl, '_blank')}
                            className="text-xs text-zinc-400 hover:text-white underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View User Annotated Screenshot</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Gemini 3.8 Flash Auto-Changelog Sync */}
          {activeTab === 'release' && (
            <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Auto Changelog Release Pipeline</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Gemini 3.8 Flash reviews all tickets marked as &quot;Fixed&quot;, strips internal jargon and ticket IDs,
                  generates inspiring release notes, and updates /changelog.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#08080A] border border-white/5 space-y-2">
                  <span className="text-xs text-zinc-400 font-medium">Target Version:</span>
                  <input
                    type="text"
                    value={releaseVersion}
                    onChange={(e) => setReleaseVersion(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                    placeholder="e.g. v1.5.1"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#08080A] border border-white/5 space-y-2">
                  <span className="text-xs text-zinc-400 font-medium">Eligible Fixed Tickets:</span>
                  <div className="text-lg font-bold text-[#A3E635]">{fixedTicketsCount} Ready to Release</div>
                </div>
              </div>

              <button
                onClick={handlePublishRelease}
                disabled={isPublishingRelease || fixedTicketsCount === 0}
                className="px-6 py-3 rounded-2xl bg-[#A3E635] text-black font-bold text-xs hover:bg-[#86efac] active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isPublishingRelease ? 'Synthesizing with Gemini 3.8 Flash...' : 'Generate & Publish Release Notes'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: Quarantined Papers Moderation Queue */}
          {activeTab === 'papers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Pending Quarantined Papers</h2>
                  <p className="text-xs text-zinc-400">PDFs validated for anti-virus headers, held in quarantine until approved</p>
                </div>
              </div>

              {quarantinedPapers.length === 0 ? (
                <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                  Quarantine queue is empty. No pending paper submissions.
                </div>
              ) : (
                <div className="space-y-3">
                  {quarantinedPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="bg-[#141416] border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300">
                            Quarantined
                          </span>
                          <span className="text-xs font-bold text-white">{paper.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {paper.subject} • {paper.year} • {paper.examType} • Uploader: {paper.uploaderEmail || 'Anonymous'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {paper.previewUrl && (
                          <button
                            onClick={() => setPreviewPdfPaper(paper)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white"
                          >
                            Preview PDF
                          </button>
                        )}
                        <button
                          onClick={() => handleApprovePaper(paper.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectPaper(paper.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-semibold"
                        >
                          Reject
                        </button>
                        {paper.uploaderEmail && (
                          <button
                            onClick={() => handleBanUploader(paper.uploaderEmail)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400"
                            title="Ban User Uploader"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Audit History Modal */}
      {selectedAuditTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#A3E635]" />
                <h3 className="text-sm font-bold text-white">Immutable Audit History</h3>
              </div>
              <button
                onClick={() => setSelectedAuditTicket(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedAuditTicket.auditHistory.map((rec) => (
                <div key={rec.id} className="p-3 rounded-2xl bg-[#08080A] border border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rec.author}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(rec.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-400">{rec.note}</p>
                  <div className="text-[10px] text-zinc-500">
                    Transition: <span className="text-zinc-300">{rec.fromStatus}</span> → <span className="text-[#A3E635]">{rec.toStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Quarantine Preview Modal */}
      {previewPdfPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141416] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Quarantine Preview: {previewPdfPaper.title}</h3>
              <button
                onClick={() => setPreviewPdfPaper(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-[#08080A]">
              <iframe src={previewPdfPaper.previewUrl} className="w-full h-full border-none" title="Quarantine PDF" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
