/**
 * Core Type Definitions for Omni Telemetry & Time Tracking Engine
 * Follows Omni Master Directives: clean, modular, production-ready, 100% type safety.
 */

export type BlockCategory = 'focus' | 'wasted' | 'routine' | 'neutral' | 'rest';

export type EventSource = 'manual' | 'shortcut' | 'api' | 'stopwatch' | 'paired_event' | 'pomodoro' | 'exam_timer';

export type SubjectTag =
  | 'Combined Maths'
  | 'Physics'
  | 'Past Paper'
  | 'Revision'
  | 'Chemistry'
  | 'General'
  | 'Custom';

export interface TelemetryBlock {
  id: string;
  startTime: string; // ISO string or HH:mm format (e.g. 2026-11-18T09:30:00.000Z or '09:30')
  endTime: string;   // ISO string or HH:mm format
  durationMinutes: number;
  label: string;     // e.g. "Deep Work - Architecture", "Instagram Reels", "Sprint Sync"
  title?: string;    // Compatibility alias for label
  category: BlockCategory;
  tag: string;       // e.g. "Coding", "Social", "Meeting", "Gaming", "Study", "Break"
  subject?: SubjectTag | string; // Student subject tagging
  source: EventSource | string;
  notes?: string;
  syncedToSheets?: boolean;
  syncedToFirestore?: boolean;
  color?: string;    // Custom hex override if specified
  createdAt?: string; // ISO string
  updatedAt?: string;// ISO string
  date?: string;
}

export interface DistractionEvent {
  id: string;
  appName: string;       // e.g. "Instagram", "TikTok", "YouTube", "Twitter/X", "Reddit"
  timestamp: string;     // ISO timestamp
  durationMinutes: number;
  triggerApp?: string;   // Previous app/action that led into the distraction spiral
  context?: string;      // Device or trigger note (e.g. "iPhone 16 Pro lockscreen notification")
  severity?: 'minor' | 'moderate' | 'spiral'; // spiral = > 45min
}

export type InsightType = 'leak_window' | 'trigger_spiral' | 'reclaim_forecast' | 'general' | 'spiral_chain';

export interface AiInsight {
  id: string;
  type: InsightType | string;
  title: string;
  description: string;
  metric?: string;          // e.g. "14:00 - 16:00", "84% correlation", "37.5 hrs/mo"
  impactHours?: number;     // Estimated hours lost or reclaimable
  recommendation?: string;   // Actionable step
  actionableRecommendation?: string;
  confidence?: number;      // 0 - 100 score
  createdAt?: string;
  tags?: string[];
  severity?: 'critical' | 'high' | 'medium' | 'opportunity' | string;
  highlight?: string;
  stat?: string;
}

export interface SheetConfig {
  mode: 'direct' | 'apps_script' | 'none';
  spreadsheetId?: string;
  sheetName?: string;
  apiKey?: string;          // Google API Key or OAuth Bearer token
  appsScriptUrl?: string;   // Zero-auth Apps Script Web App Endpoint URL
  isConnected: boolean;
  lastSyncedAt?: string;
}

export interface FirestoreConfig {
  projectId: string;
  apiKey: string;
  authDomain?: string;
  collectionName: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export type TelemetryEventType =
  | 'app_open'
  | 'app_close'
  | 'focus_start'
  | 'focus_end'
  | 'manual'
  | 'heartbeat';

export interface TelemetryPayload {
  event: TelemetryEventType;
  label: string;
  category?: BlockCategory;
  tag?: string;
  durationMinutes?: number;
  timestamp?: string; // ISO string, defaults to current time if absent
  metadata?: Record<string, unknown>;
}

export interface FocusStopwatchState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null; // epoch ms
  elapsedSeconds: number;
  currentLabel: string;
  currentTag: string;
  currentCategory: BlockCategory;
}

export type FilterScope = 'today' | 'day' | '7d' | '30d' | 'custom';

export interface DailyKpiMetrics {
  focusMinutes: number;
  focusGoalMinutes: number;
  wastedMinutes: number;
  deepSessionCount: number; // sessions >= 45m
  deepSessionMaxTarget: number; // e.g. 6 target sessions
  distractionCount: number;
  topOffenderApp: string;
  topDistractionApp?: string;
  topOffenderMinutes: number;
  leakWindow: string; // e.g. "14:00 - 16:00"
  wakingLeakPercentage: number; // percentage of waking day (e.g. 16hr waking window) leaked
}

export interface QueuedTelemetryAction {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  block: TelemetryBlock;
  timestamp: number;
  retryCount: number;
}

export interface DayActivitySummary {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  dayName?: string; // alias for dayLabel
  focusMinutes: number;
  wastedMinutes: number;
  routineMinutes: number;
  neutralMinutes: number;
}

export interface HeatmapCell {
  dayIndex: number; // 0 = Mon, 6 = Sun
  dayName: string;
  hour: number;     // 6 through 23 (18 waking hours)
  hourLabel: string;// "06:00", etc.
  wastedMinutes: number;
  focusMinutes: number;
  dominantCategory: BlockCategory | 'none';
  intensity: number;// 0 to 4
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  dailyGoalHours: number;
  createdAt: string;
  lastLoginAt: string;
}

/**
 * User Feedback & Changelog Schema matching Google Sheets & Firestore
 */
export interface UserFeedbackItem {
  id: string; // e.g. "FB-104"
  category: 'bug' | 'feature' | 'ux' | 'performance' | 'other';
  description: string;
  author?: string;
  status: 'shipped' | 'in-progress' | 'under-review';
  date: string;
  votes?: number;
  fixedInVersion?: string;
  annotatedScreenshotUrl?: string;
}

export interface ChangelogItemSection {
  title: string;
  description: string;
  tag: 'Fix' | 'UX' | 'Feature' | 'Performance';
  relatedFeedbackId?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  headline: string;
  plainEnglishSummary: string;
  fixedFeedbackIds: string[];
  tag?: 'major' | 'minor' | 'patch';
  isLatest?: boolean;
  shippedFixes?: ChangelogItemSection[];
  uxRefinements?: ChangelogItemSection[];
  communityFeatures?: ChangelogItemSection[];
  metricsDelta?: {
    label: string;
    value: string;
    change: string;
  }[];
}

export type TimerCountdownMode = 'stopwatch' | 'pomodoro' | 'paper-2h' | 'paper-3h';

export interface AuditRecord {
  id: string;
  timestamp: string;
  fromStatus: string;
  toStatus: string;
  author: string;
  note: string;
}

export interface FeedbackTicket {
  id: string;
  pageUrl: string;
  timestamp: string;
  userEmail?: string;
  userName?: string;
  category: 'bug' | 'feature' | 'ux' | 'other';
  description: string;
  annotatedScreenshotUrl?: string;
  status: 'NEW' | 'AUDITED' | 'IN_PROGRESS' | 'FIXED' | 'RELEASED';
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL';
  classification?: 'Bug' | 'Feature' | 'Spam' | 'UX';
  isSpam?: boolean;
  isDuplicate?: boolean;
  aiNotes?: string;
  auditHistory: AuditRecord[];
}

export type ExamType =
  | 'A/L National'
  | 'Provincial'
  | 'School Term Test'
  | 'Model Paper'
  | 'Marking Scheme'
  | 'Resource Book'
  | 'Short Notes'
  | 'Class Tute / Handout'
  | 'Unit Quiz'
  | 'Formula Sheet'
  | 'Other';

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  email: string;
  totalFocusMinutes: number;
  streakDays: number;
  topSubject: string;
  isLive: boolean;
}

export interface PastPaperItem {
  id: string;
  title: string;
  subject: 'Combined Maths' | 'Physics' | 'Chemistry' | 'Revision' | 'Other';
  year: number;
  examType: ExamType;
  driveFileId?: string;
  downloadUrl: string;
  previewUrl?: string;
  fileSizeBytes?: number;
  uploaderEmail?: string;
  uploaderName?: string;
  status: 'approved' | 'quarantined' | 'rejected';
  uploadedAt: string;
  rejectionReason?: string;
}

export interface ForumPostReply {
  id: string;
  authorEmail: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface ForumPost {
  id: string;
  paperId?: string;
  paperTitle?: string;
  authorEmail: string;
  authorName: string;
  subject: string;
  title: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: ForumPostReply[];
}

/**
 * Local timezone formatters
 */
export function formatLocalTime(isoOrTime: string): string {
  if (!isoOrTime) return '--:--';
  if (!isoOrTime.includes('T') && isoOrTime.includes(':')) {
    return isoOrTime.slice(0, 5);
  }
  const d = new Date(isoOrTime);
  if (isNaN(d.getTime())) return isoOrTime;
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function getLocalDateString(isoOrDate: string): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) {
    return isoOrDate.split('T')[0];
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



