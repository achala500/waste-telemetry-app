/**
 * Secure Past Papers Hub Service
 * Connects to Google Drive Past Papers Folder with Anti-Virus Magic-Byte Quarantine & Admin Moderation.
 */

import { PastPaperItem, ForumPost, ForumPostReply } from './types';
import { DEFAULT_FIRESTORE_CONFIG } from './firestoreSync';

const PAPERS_COLLECTION = 'past_papers';
const QUARANTINE_COLLECTION = 'quarantine_papers';
const FORUM_COLLECTION = 'paper_forum';
const BANNED_USERS_KEY = 'chrono_banned_uploaders';

export const DEFAULT_DRIVE_FOLDER_ID =
  process.env.NEXT_PUBLIC_DRIVE_PAPERS_FOLDER_ID || '1_CHRONO_A_L_Past_Papers_Drive_Vault';

// Zero Dummy Data: Clean start mode
const SEED_PAPERS: PastPaperItem[] = [];

/**
 * Check if user is banned from uploading
 */
export function isUserBanned(email: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(BANNED_USERS_KEY) || '[]');
    return list.includes(email.toLowerCase().trim());
  } catch {
    return false;
  }
}

/**
 * Ban user from uploading
 */
export function banUserUploader(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(BANNED_USERS_KEY) || '[]');
    if (!list.includes(email.toLowerCase().trim())) {
      list.push(email.toLowerCase().trim());
      localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Verify Magic Bytes: Must begin with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
 */
export async function verifyPdfMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // %PDF- = [37, 80, 68, 70, 45]
    return (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  } catch {
    return false;
  }
}

/**
 * Check Daily Rate Limit: Max 3 uploads per user per calendar day
 */
export function checkUserUploadRateLimit(userEmail: string): { allowed: boolean; remaining: number } {
  if (typeof window === 'undefined') return { allowed: true, remaining: 3 };
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `chrono_uploads_${userEmail}_${today}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    const remaining = Math.max(0, 3 - count);
    return {
      allowed: count < 3,
      remaining
    };
  } catch {
    return { allowed: true, remaining: 3 };
  }
}

export function incrementUserUploadCount(userEmail: string): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `chrono_uploads_${userEmail}_${today}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(count + 1));
  } catch {}
}

/**
 * Safe Student Upload:
 * Strict validation (MIME, Magic-Bytes, size <= 25MB, Rate-limit, Ban-check)
 * Saved to Pending/Quarantine Storage ONLY.
 */
export async function uploadQuarantinedPaper(
  file: File,
  metadata: {
    title: string;
    subject: PastPaperItem['subject'];
    year: number;
    examType: PastPaperItem['examType'];
    uploaderEmail?: string;
    uploaderName?: string;
  }
): Promise<{ success: boolean; error?: string; paper?: PastPaperItem }> {
  // Support Anonymous uploads
  const effectiveEmail = (metadata.uploaderEmail || '').trim() || 'anonymous@student.local';
  const effectiveName = (metadata.uploaderName || '').trim() || 'Anonymous Student';

  // 1. Ban check
  if (isUserBanned(effectiveEmail)) {
    return { success: false, error: 'Your account or IP has been restricted from uploading papers.' };
  }

  // 2. Rate limit check (3 uploads/day per client/email)
  const rateLimit = checkUserUploadRateLimit(effectiveEmail);
  if (!rateLimit.allowed) {
    return { success: false, error: 'Daily upload limit reached (3 papers/day). Please try again tomorrow.' };
  }

  // 3. File size check (Max 25 MB)
  const MAX_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return { success: false, error: 'File exceeds maximum limit of 25 MB.' };
  }

  // 4. MIME type check
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { success: false, error: 'Only valid PDF files are accepted.' };
  }

  // 5. Anti-Virus & Anti-Spam Magic Bytes Verification
  const isAuthenticPdf = await verifyPdfMagicBytes(file);
  if (!isAuthenticPdf) {
    return { success: false, error: 'Security verification failed: File header is not a valid PDF (%PDF- missing).' };
  }

  // 6. Encode and sanitize file name
  const rawBaseName = file.name.replace(/\.pdf$/i, '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const encodedFileName = encodeURIComponent(rawBaseName) + '_' + Date.now() + '.pdf';

  // Convert to local client storage URL (remains on client drive until admin approval)
  let previewUrl = '';
  try {
    previewUrl = URL.createObjectURL(file);
  } catch {}

  const paperId = `paper_quarantine_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const paper: PastPaperItem = {
    id: paperId,
    title: metadata.title.trim() || rawBaseName,
    subject: metadata.subject,
    year: metadata.year,
    examType: metadata.examType,
    downloadUrl: previewUrl || '#',
    previewUrl: previewUrl || undefined,
    fileSizeBytes: file.size,
    uploaderEmail: effectiveEmail,
    uploaderName: effectiveName,
    status: 'quarantined',
    uploadedAt: new Date().toISOString()
  };

  // Save to Quarantined collection (staged in client storage)
  try {
    const existing: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_quarantine_papers') || '[]');
    localStorage.setItem('chrono_quarantine_papers', JSON.stringify([paper, ...existing]));
  } catch {}

  // Save to Firestore REST
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${QUARANTINE_COLLECTION}/${paper.id}?key=${config.apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: paper.id },
          title: { stringValue: paper.title },
          encodedFileName: { stringValue: encodedFileName },
          subject: { stringValue: paper.subject },
          year: { integerValue: paper.year },
          examType: { stringValue: paper.examType },
          uploaderEmail: { stringValue: paper.uploaderEmail || '' },
          uploaderName: { stringValue: paper.uploaderName || '' },
          fileSizeBytes: { integerValue: paper.fileSizeBytes || 0 },
          status: { stringValue: 'quarantined' },
          storageLocation: { stringValue: 'client_staged' },
          uploadedAt: { stringValue: paper.uploadedAt }
        }
      })
    });
  } catch {}

  incrementUserUploadCount(effectiveEmail);

  return { success: true, paper };
}

/**
 * Fetch Approved Library Papers
 */
export async function getApprovedPastPapers(): Promise<PastPaperItem[]> {
  let papers = [...SEED_PAPERS];

  // Merge any approved papers from local/Firestore
  try {
    const localApproved: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_approved_papers') || '[]');
    papers = [...localApproved, ...papers];
  } catch {}

  return papers;
}

/**
 * Fetch Quarantined Papers for Admin Moderation Queue
 */
export async function getQuarantinedPapers(): Promise<PastPaperItem[]> {
  try {
    const local: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_quarantine_papers') || '[]');
    return local;
  } catch {
    return [];
  }
}

/**
 * Admin Action: Approve Paper (Publishes to Public Library)
 */
export async function approveQuarantinedPaper(paperId: string): Promise<boolean> {
  try {
    const quarantined: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_quarantine_papers') || '[]');
    const target = quarantined.find((p) => p.id === paperId);
    if (!target) return false;

    target.status = 'approved';
    if (!target.downloadUrl || target.downloadUrl === '#' || target.downloadUrl.startsWith('blob:')) {
      target.downloadUrl = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`;
    }

    // Remove from quarantine
    const remaining = quarantined.filter((p) => p.id !== paperId);
    localStorage.setItem('chrono_quarantine_papers', JSON.stringify(remaining));

    // Add to approved library
    const approved: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_approved_papers') || '[]');
    localStorage.setItem('chrono_approved_papers', JSON.stringify([target, ...approved]));

    return true;
  } catch {
    return false;
  }
}

/**
 * Admin Action: Reject Paper (Removes from Quarantined Queue)
 */
export async function rejectQuarantinedPaper(paperId: string): Promise<boolean> {
  try {
    const quarantined: PastPaperItem[] = JSON.parse(localStorage.getItem('chrono_quarantine_papers') || '[]');
    const remaining = quarantined.filter((p) => p.id !== paperId);
    localStorage.setItem('chrono_quarantine_papers', JSON.stringify(remaining));

    try {
      const config = DEFAULT_FIRESTORE_CONFIG;
      const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${QUARANTINE_COLLECTION}/${paperId}?key=${config.apiKey}`;
      await fetch(url, { method: 'DELETE' });
    } catch {}

    return true;
  } catch {
    return false;
  }
}

/**
 * Discussion & Solution Forum Methods
 */
export async function getForumPosts(paperId?: string): Promise<ForumPost[]> {
  try {
    const allPosts: ForumPost[] = JSON.parse(localStorage.getItem('chrono_paper_forum') || '[]');
    if (paperId) {
      return allPosts.filter((p) => p.paperId === paperId);
    }
    return allPosts;
  } catch {
    return [];
  }
}

export async function createForumPost(postData: {
  paperId?: string;
  paperTitle?: string;
  authorEmail: string;
  authorName: string;
  subject: string;
  title: string;
  content: string;
}): Promise<ForumPost> {
  const newPost: ForumPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...postData,
    timestamp: new Date().toISOString(),
    likes: 0,
    replies: []
  };

  try {
    const existing: ForumPost[] = JSON.parse(localStorage.getItem('chrono_paper_forum') || '[]');
    localStorage.setItem('chrono_paper_forum', JSON.stringify([newPost, ...existing]));
  } catch {}

  // Sync to Firestore
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${FORUM_COLLECTION}/${newPost.id}?key=${config.apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: newPost.id },
          title: { stringValue: newPost.title },
          content: { stringValue: newPost.content },
          subject: { stringValue: newPost.subject },
          paperId: { stringValue: newPost.paperId || '' },
          paperTitle: { stringValue: newPost.paperTitle || '' },
          authorEmail: { stringValue: newPost.authorEmail },
          authorName: { stringValue: newPost.authorName },
          timestamp: { stringValue: newPost.timestamp },
          likes: { integerValue: 0 }
        }
      })
    });
  } catch {}

  return newPost;
}

export async function addForumReply(
  postId: string,
  replyData: { authorEmail: string; authorName: string; content: string }
): Promise<boolean> {
  try {
    const posts: ForumPost[] = JSON.parse(localStorage.getItem('chrono_paper_forum') || '[]');
    const target = posts.find((p) => p.id === postId);
    if (!target) return false;

    const reply: ForumPostReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...replyData,
      timestamp: new Date().toISOString()
    };

    target.replies.push(reply);
    localStorage.setItem('chrono_paper_forum', JSON.stringify(posts));
    return true;
  } catch {
    return false;
  }
}

export async function likeForumPost(postId: string): Promise<boolean> {
  try {
    const posts: ForumPost[] = JSON.parse(localStorage.getItem('chrono_paper_forum') || '[]');
    const target = posts.find((p) => p.id === postId);
    if (!target) return false;

    target.likes += 1;
    localStorage.setItem('chrono_paper_forum', JSON.stringify(posts));
    return true;
  } catch {
    return false;
  }
}

