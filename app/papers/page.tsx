'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Download,
  Eye,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  Send,
  Plus,
  BookOpen,
  X
} from 'lucide-react';
import { NavigationRail } from '@/components/NavigationRail';
import { AuthModal } from '@/components/AuthModal';
import { PastPaperItem, ForumPost } from '@/lib/types';
import {
  getApprovedPastPapers,
  uploadQuarantinedPaper,
  checkUserUploadRateLimit,
  getForumPosts,
  createForumPost,
  addForumReply,
  likeForumPost,
  DEFAULT_DRIVE_FOLDER_ID
} from '@/lib/papersService';
import { useTelemetryStore } from '@/lib/telemetryStore';

export default function PastPapersPage() {
  const storeState = useTelemetryStore();
  const [activeTab, setActiveTab] = useState<'papers' | 'forum'>('papers');
  const [papers, setPapers] = useState<PastPaperItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Preview modal state
  const [previewPaper, setPreviewPaper] = useState<PastPaperItem | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState<PastPaperItem['subject']>('Combined Maths');
  const [uploadYear, setUploadYear] = useState<number>(2024);
  const [uploadType, setUploadType] = useState<PastPaperItem['examType']>('A/L National');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [startForumThread, setStartForumThread] = useState(true);
  const [forumPromptText, setForumPromptText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostSubject, setNewPostSubject] = useState('Combined Maths');
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Shared Navigation & Auth state
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const paperList = await getApprovedPastPapers();
    setPapers(paperList);
    const posts = await getForumPosts();
    setForumPosts(posts);
  };

  const filteredPapers = papers.filter((p) => {
    const matchesSubject = selectedSubject === 'All' || p.subject === selectedSubject;
    const matchesYear = selectedYear === 'All' || String(p.year) === selectedYear;
    const matchesType = selectedType === 'All' || p.examType === selectedType;
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesYear && matchesType && matchesSearch;
  });

  const rateLimit = storeState.user?.email
    ? checkUserUploadRateLimit(storeState.user.email)
    : { allowed: true, remaining: 3 };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a PDF document.');
      return;
    }
    if (!storeState.user?.email) {
      setIsAuthOpen(true);
      return;
    }

    setUploading(true);
    setUploadError(null);

    const paperTitle = uploadTitle.trim() || uploadFile.name.replace(/\.pdf$/i, '');
    const res = await uploadQuarantinedPaper(uploadFile, {
      title: paperTitle,
      subject: uploadSubject,
      year: uploadYear,
      examType: uploadType,
      uploaderEmail: storeState.user.email,
      uploaderName: storeState.user.displayName || 'Student'
    });

    if (res.success && startForumThread && res.paper) {
      await createForumPost({
        paperId: res.paper.id,
        paperTitle: res.paper.title,
        authorEmail: storeState.user.email,
        authorName: storeState.user.displayName || 'Student',
        subject: uploadSubject,
        title: `Discussion & Solutions: ${paperTitle}`,
        content: forumPromptText.trim() || `Discussing questions, solutions, and marking tips for ${paperTitle}.`
      });
      loadData();
    }

    setUploading(false);

    if (res.success) {
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setForumPromptText('');
      }, 1800);
    } else {
      setUploadError(res.error || 'Failed to submit document.');
    }
  };

  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    if (!storeState.user?.email) {
      setIsAuthOpen(true);
      return;
    }

    await createForumPost({
      authorEmail: storeState.user.email,
      authorName: storeState.user.displayName || 'Student',
      subject: newPostSubject,
      title: newPostTitle.trim(),
      content: newPostContent.trim()
    });

    setNewPostTitle('');
    setNewPostContent('');
    setIsNewPostOpen(false);
    loadData();
  };

  const handleAddReply = async (postId: string) => {
    if (!replyInput.trim()) return;
    if (!storeState.user?.email) {
      setIsAuthOpen(true);
      return;
    }

    await addForumReply(postId, {
      authorEmail: storeState.user.email,
      authorName: storeState.user.displayName || 'Student',
      content: replyInput.trim()
    });

    setReplyInput('');
    setActiveReplyPostId(null);
    loadData();
  };

  const handleLikePost = async (postId: string) => {
    await likeForumPost(postId);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#A3E635] selection:text-black">
      {/* Navigation Rail */}
      <NavigationRail
        activeView="papers"
        syncStatus={storeState.isSyncing ? 'syncing' : storeState.isOnline ? 'live' : 'offline'}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 pb-20 md:pb-8">
        <header className="sticky top-0 z-30 bg-[#08080A]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Past Papers & Solutions Hub</h1>
              <p className="text-xs text-zinc-400">Verified A/L past papers, Google Drive archive, and student discussion forum</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <span>Google Drive Folder</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>

            <button
              onClick={() => {
                if (!storeState.user) {
                  setIsAuthOpen(true);
                } else {
                  setIsUploadOpen(true);
                }
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all shadow-md"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit Paper</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          {/* View Mode Tabs: Papers Library vs Discussion Forum */}
          <div className="flex items-center gap-2 bg-[#141416] p-1.5 rounded-2xl border border-white/10 max-w-md">
            <button
              onClick={() => setActiveTab('papers')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'papers'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Past Papers Library
            </button>
            <button
              onClick={() => setActiveTab('forum')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'forum'
                  ? 'bg-[#A3E635] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Discussion Forum ({forumPosts.length})</span>
            </button>
          </div>

          {/* TAB 1: PAPERS LIBRARY */}
          {activeTab === 'papers' && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="bg-[#141416] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by topic, paper title, or year..."
                      className="w-full bg-[#08080A] border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                    />
                  </div>

                  {/* Subject Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {['All', 'Combined Maths', 'Physics', 'Chemistry', 'Revision'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSubject(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedSubject === s
                            ? 'bg-[#A3E635] text-black shadow-sm'
                            : 'bg-[#08080A] border border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-Filters: Year & Exam Type */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-500 font-medium">Exam Type:</span>
                    {['All', 'A/L National', 'Provincial', 'Model Paper', 'Marking Scheme'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          selectedType === t
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-[#08080A] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#A3E635]"
                    >
                      <option value="All">All Years</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Zero Dummy Data - Clean Empty State or Real Papers */}
              {filteredPapers.length === 0 ? (
                <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Past Papers in Library Yet</h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                      All uploaded papers undergo anti-virus inspection in the quarantine queue before appearing here.
                      You can contribute a PDF or open the Google Drive folder directly.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Submit First Paper</span>
                    </button>
                    <a
                      href={`https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                      <span>Open Drive Vault</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="bg-[#141416] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/25">
                            {paper.subject}
                          </span>
                          <span className="text-xs text-zinc-500 font-semibold tabular-nums">{paper.year}</span>
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug group-hover:text-[#A3E635] transition-colors">
                          {paper.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[11px]">
                            {paper.examType}
                          </span>
                          {paper.fileSizeBytes && (
                            <span className="text-[11px] text-zinc-500">
                              {(paper.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                        <button
                          onClick={() => setPreviewPaper(paper)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={paper.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-[#A3E635]/10 hover:bg-[#A3E635]/20 text-[#A3E635] border border-[#A3E635]/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          title="Open Drive Link"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Drive</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDENT DISCUSSION & SOLUTIONS FORUM */}
          {activeTab === 'forum' && (
            <div className="space-y-6">
              <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#A3E635]" />
                    <span>A/L Questions & Solutions Forum</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Discuss tricky problems, verify marking criteria, and collaborate with fellow students.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!storeState.user) setIsAuthOpen(true);
                    else setIsNewPostOpen(true);
                  }}
                  className="px-4 py-2 rounded-2xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ask Question / Share Solution</span>
                </button>
              </div>

              {isNewPostOpen && (
                <form
                  onSubmit={handleCreateForumPost}
                  className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Create New Discussion Thread</h3>
                    <button
                      type="button"
                      onClick={() => setIsNewPostOpen(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">Thread Title / Question:</label>
                      <input
                        type="text"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="e.g. How to solve 2024 Combined Maths Part B Q14?"
                        className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Subject:</label>
                      <select
                        value={newPostSubject}
                        onChange={(e) => setNewPostSubject(e.target.value)}
                        className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                      >
                        <option value="Combined Maths">Combined Maths</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="General">General Discussion</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Details & Problem Description:</label>
                    <textarea
                      rows={3}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Describe the steps you tried, where you got stuck, or share your solution walkthrough..."
                      className="w-full bg-[#08080A] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewPostOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac]"
                    >
                      Post Thread
                    </button>
                  </div>
                </form>
              )}

              {/* Forum Post Threads */}
              {forumPosts.length === 0 ? (
                <div className="bg-[#141416] border border-white/10 rounded-3xl p-12 text-center text-xs text-zinc-500">
                  No discussion threads yet. Be the first to ask a question or start a paper discussion!
                </div>
              ) : (
                <div className="space-y-4">
                  {forumPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A3E635]/15 text-[#A3E635]">
                            {post.subject}
                          </span>
                          {post.paperTitle && (
                            <span className="text-[11px] text-zinc-400 border border-white/5 px-2 py-0.5 rounded-md bg-white/5">
                              {post.paperTitle}
                            </span>
                          )}
                          <span className="text-xs text-zinc-500">
                            {new Date(post.timestamp).toLocaleDateString()} by {post.authorName}
                          </span>
                        </div>

                        <button
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-[#A3E635]" />
                          <span className="tabular-nums font-semibold">{post.likes}</span>
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-white">{post.title}</h3>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                      {/* Replies */}
                      {post.replies && post.replies.length > 0 && (
                        <div className="pl-4 border-l-2 border-[#A3E635]/30 space-y-3 pt-2">
                          {post.replies.map((reply) => (
                            <div key={reply.id} className="p-3 rounded-2xl bg-[#08080A] border border-white/5 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                <span className="font-semibold text-white">{reply.authorName}</span>
                                <span className="text-zinc-600">{new Date(reply.timestamp).toLocaleDateString()}</span>
                              </div>
                              <p className="text-zinc-300">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Box */}
                      {activeReplyPostId === post.id ? (
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder="Write your explanation or solution..."
                            className="flex-1 bg-[#08080A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddReply(post.id)}
                            className="px-3.5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => setActiveReplyPostId(null)}
                            className="px-3 py-2 rounded-xl bg-white/5 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2">
                          <button
                            onClick={() => setActiveReplyPostId(post.id)}
                            className="text-xs text-[#A3E635] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reply / Add Solution</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* In-App Read-Only PDF Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#141416] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#A3E635]" />
                <div>
                  <h3 className="text-sm font-bold text-white">{previewPaper.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {previewPaper.subject} • {previewPaper.year} • {previewPaper.examType} (Read-Only Preview)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPaper.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Drive</span>
                </a>
                <button
                  onClick={() => setPreviewPaper(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#08080A] relative">
              <iframe
                src={`${previewPaper.previewUrl || previewPaper.downloadUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title={previewPaper.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Safe Student Upload Modal with Forum Link */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Contribute Past Paper</h3>
                  <p className="text-xs text-zinc-400">Protected student upload ({rateLimit.remaining} uploads left today)</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-[#A3E635] mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-white">Submitted for Admin Approval!</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Your PDF was verified with %PDF- header byte inspection and placed in the moderation queue. A discussion thread has also been generated in the Forum!
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Paper Title:</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. 2024 Provincial Evaluation Combined Maths"
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">Subject:</label>
                    <select
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value as any)}
                      className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                    >
                      <option value="Combined Maths">Combined Maths</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Revision">Revision</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">Exam Type:</label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as any)}
                      className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                    >
                      <option value="A/L National">A/L National</option>
                      <option value="Provincial">Provincial</option>
                      <option value="Model Paper">Model Paper</option>
                      <option value="Marking Scheme">Marking Scheme</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">PDF Document (Max 25 MB):</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#A3E635] file:text-black hover:file:bg-[#86efac] cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Enforces strict %PDF- header byte inspection and malware quarantine.
                  </p>
                </div>

                {/* Forum Integration Checkbox */}
                <div className="p-3 rounded-2xl bg-[#08080A] border border-white/5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={startForumThread}
                      onChange={(e) => setStartForumThread(e.target.checked)}
                      className="accent-[#A3E635]"
                    />
                    <span className="text-xs font-semibold text-white">Create a discussion thread for this paper in the Forum</span>
                  </label>
                  {startForumThread && (
                    <input
                      type="text"
                      value={forumPromptText}
                      onChange={(e) => setForumPromptText(e.target.value)}
                      placeholder="Initial question or note (e.g. Discussing Part B Integration)..."
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all disabled:opacity-40 active:scale-95"
                  >
                    {uploading ? 'Verifying PDF...' : 'Upload for Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
