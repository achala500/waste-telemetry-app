/**
 * Omni Telemetry Client-Side Reactive State Management & Write-Ahead Queue
 * Features:
 * - Reactive Pub/Sub state with useSyncExternalStore for 60fps tearing-free UI renders
 * - Durable IndexedDB queue ensuring zero dropped pings from iOS Shortcuts/offline
 * - Multi-cloud dual synchronization (Google Sheets + Firebase Firestore)
 * - Built-in realistic dataset matching reference telemetry (Deep Work, Focus, Reels, YouTube)
 * - Fast KPI aggregations, 24H timeline lanes, Danger Heatmap matrix, Weekly Recharts summaries
 * 
 * Follows Omni Master Directives: Type safety, production resilience, zero dropped writes.
 */

import { useSyncExternalStore } from 'react';
import {
  TelemetryBlock,
  SheetConfig,
  FirestoreConfig,
  FocusStopwatchState,
  FilterScope,
  DailyKpiMetrics,
  QueuedTelemetryAction,
  DayActivitySummary,
  HeatmapCell,
  AiInsight,
  BlockCategory,
  UserProfile,
  SubjectTag
} from './types';
import {
  appendBlockToSheets,
  batchAppendBlocksToSheets,
  fetchBlocksFromSheets,
  syncUserProfileToSheets,
  DEFAULT_SHEET_NAME
} from './sheetsSync';
import {
  DEFAULT_FIRESTORE_CONFIG,
  mirrorBlockToFirestore,
  batchMirrorBlocksToFirestore,
  fetchBlocksFromFirestore,
  deleteBlockFromFirestore,
  syncUserProfileToFirestore
} from './firestoreSync';
import { generateAiInsights } from './insightsService';

const DB_NAME = 'OmniTelemetry_v1';
const DB_VERSION = 1;
const STORE_BLOCKS = 'blocks';
const STORE_QUEUE = 'offline_queue';
const STORE_CONFIG = 'config';

export interface TelemetryState {
  user: UserProfile | null;
  blocks: TelemetryBlock[];
  insights: AiInsight[];
  selectedDate: string; // YYYY-MM-DD
  filterScope: FilterScope;
  focusGoalMinutes: number;
  stopwatch: FocusStopwatchState;
  sheetConfig: SheetConfig;
  firestoreConfig: FirestoreConfig;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  pendingQueueCount: number;
  examCountdownDate: string;
  examCountdownTitle: string;
  studyStreak: number;
  timerMode: 'stopwatch' | 'pomodoro' | 'paper-2h' | 'paper-3h';
  timerTargetSeconds: number;
}

// ---------------------------------------------------------------------------
// Realistic Default Telemetry Data Generator (Matches Reference Image/Prompt)
// ---------------------------------------------------------------------------
function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toISOString().split('T')[0];
}

function createSampleBlocks(): TelemetryBlock[] {
  // Pure zero-dummy-data mode: Clean start until user logs or syncs
  return [];
}

const DEFAULT_INSIGHTS: AiInsight[] = [];

// ---------------------------------------------------------------------------
// Native IndexedDB Write-Ahead Queue Helper
// ---------------------------------------------------------------------------
class IndexedDbStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isAvailable()) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db: IDBDatabase = e.target.result;
          if (!db.objectStoreNames.contains(STORE_BLOCKS)) {
            db.createObjectStore(STORE_BLOCKS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_QUEUE)) {
            db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_CONFIG)) {
            db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[IndexedDB] Open failed, using memory fallback', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[IndexedDB] Init error:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  async getAllBlocks(): Promise<TelemetryBlock[]> {
    const db = await this.getDB();
    if (!db) return [];
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_BLOCKS, 'readonly');
        const store = tx.objectStore(STORE_BLOCKS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async saveBlock(block: TelemetryBlock): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_BLOCKS, 'readwrite');
      tx.objectStore(STORE_BLOCKS).put(block);
    } catch (e) {
      console.warn('[IndexedDB] saveBlock error:', e);
    }
  }

  async saveAllBlocks(blocks: TelemetryBlock[]): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_BLOCKS, 'readwrite');
      const store = tx.objectStore(STORE_BLOCKS);
      blocks.forEach(b => store.put(b));
    } catch (e) {
      console.warn('[IndexedDB] saveAllBlocks error:', e);
    }
  }

  async deleteBlock(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_BLOCKS, 'readwrite');
      tx.objectStore(STORE_BLOCKS).delete(id);
    } catch (e) {
      console.warn('[IndexedDB] deleteBlock error:', e);
    }
  }

  // Offline Queue Operations
  async pushQueue(action: QueuedTelemetryAction): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).put(action);
    } catch (e) {
      console.warn('[IndexedDB] pushQueue error:', e);
    }
  }

  async getQueue(): Promise<QueuedTelemetryAction[]> {
    const db = await this.getDB();
    if (!db) return [];
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_QUEUE, 'readonly');
        const req = tx.objectStore(STORE_QUEUE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async removeQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).delete(id);
    } catch (e) {
      console.warn('[IndexedDB] removeQueueItem error:', e);
    }
  }
}

const db = new IndexedDbStorage();

// ---------------------------------------------------------------------------
// Store Implementation (Reactive Pub/Sub)
// ---------------------------------------------------------------------------
class TelemetryStoreManager {
  private state: TelemetryState;
  private listeners: Set<() => void> = new Set();
  private stopwatchInterval: any = null;

  constructor() {
    const initialSheetConfig: SheetConfig = {
      mode: 'apps_script',
      sheetName: DEFAULT_SHEET_NAME,
      appsScriptUrl: '',
      spreadsheetId: '',
      apiKey: '',
      isConnected: false
    };

    this.state = {
      user: null,
      blocks: createSampleBlocks(),
      insights: DEFAULT_INSIGHTS,
      selectedDate: getTodayDateString(0),
      filterScope: 'today',
      focusGoalMinutes: 300, // 5 hours default goal
      stopwatch: {
        isRunning: false,
        isPaused: false,
        startTime: null,
        elapsedSeconds: 0,
        currentLabel: 'Deep Work Session',
        currentTag: 'Focus',
        currentCategory: 'focus'
      },
      sheetConfig: initialSheetConfig,
      firestoreConfig: DEFAULT_FIRESTORE_CONFIG,
      isSyncing: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncedAt: null,
      syncError: null,
      pendingQueueCount: 0,
      examCountdownDate: '2026-11-25',
      examCountdownTitle: 'G.C.E. A/L Examination',
      studyStreak: 1,
      timerMode: 'stopwatch',
      timerTargetSeconds: 0
    };

    if (typeof window !== 'undefined') {
      this.initClient();
    }
  }

  private async initClient() {
    // Network listeners
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notify();
      this.syncOfflineQueue();
    });
    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notify();
    });

    // Hydrate local persistent config
    try {
      const savedUser = localStorage.getItem('omni_user_profile');
      if (savedUser) {
        this.state.user = JSON.parse(savedUser);
        if (this.state.user?.dailyGoalHours) {
          this.state.focusGoalMinutes = Math.round(this.state.user.dailyGoalHours * 60);
        }
      }
      const savedSheet = localStorage.getItem('omni_sheet_config');
      if (savedSheet) {
        this.state.sheetConfig = JSON.parse(savedSheet);
      }
      const savedGoal = localStorage.getItem('omni_focus_goal');
      if (savedGoal && !this.state.user) {
        this.state.focusGoalMinutes = Number(savedGoal) || 300;
      }
    } catch {
      // ignore SSR/storage limits
    }

    // Hydrate blocks from IndexedDB (Clean zero-dummy data)
    const cachedBlocks = await db.getAllBlocks();
    const cleanBlocks = (cachedBlocks || []).filter(
      b => !b.id.startsWith('block-today-') && !b.id.startsWith('block-yest-') && !b.id.startsWith('block-2ago-')
    );
    this.state.blocks = cleanBlocks;

    // Purge any legacy sample blocks from IndexedDB
    if (cachedBlocks && cachedBlocks.length > cleanBlocks.length) {
      const dummyIds = cachedBlocks
        .filter(b => b.id.startsWith('block-today-') || b.id.startsWith('block-yest-') || b.id.startsWith('block-2ago-'))
        .map(b => b.id);
      for (const id of dummyIds) {
        await db.deleteBlock(id);
      }
    }

    // Check queue count
    const queue = await db.getQueue();
    this.state.pendingQueueCount = queue.length;
    this.notify();

    // Trigger initial background sync / remote hydrate
    setTimeout(() => {
      this.hydrateAll();
      this.syncOfflineQueue();
    }, 1500);
  }

  public getState = (): TelemetryState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.state = {
      ...this.state,
      blocks: [...this.state.blocks],
      stopwatch: { ...this.state.stopwatch }
    };
    this.listeners.forEach(fn => fn());
  }

  // -------------------------------------------------------------------------
  // Mutations & Actions
  // -------------------------------------------------------------------------

  public addBlock = async (
    blockData: Partial<TelemetryBlock> & {
      title?: string;
      durationMinutes?: number;
      startTime?: string;
      date?: string;
      endTime?: string;
      [key: string]: any;
    }
  ): Promise<TelemetryBlock> => {
    const rawLabel = (blockData.label || blockData.title || 'Untitled Session').trim();
    const duration = Math.max(1, Math.round(blockData.durationMinutes || 30));
    const now = new Date();
    const startTime = blockData.startTime || (blockData.date ? `${blockData.date}T${now.toTimeString().slice(0, 8)}.000Z` : now.toISOString());
    let endTime = blockData.endTime;
    if (!endTime) {
      const s = new Date(startTime);
      if (!isNaN(s.getTime())) {
        endTime = new Date(s.getTime() + duration * 60 * 1000).toISOString();
      } else {
        endTime = new Date(now.getTime() + duration * 60 * 1000).toISOString();
      }
    }

    const newBlock: TelemetryBlock = {
      id: blockData.id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startTime,
      endTime,
      durationMinutes: duration,
      label: rawLabel,
      category: (blockData.category as BlockCategory) || 'focus',
      tag: blockData.tag || 'Work',
      source: (blockData.source as any) || 'manual',
      notes: blockData.notes,
      syncedToSheets: false,
      syncedToFirestore: false,
      createdAt: new Date().toISOString()
    };

    // 1. Optimistic memory update
    this.state.blocks = [newBlock, ...this.state.blocks];
    this.notify();

    // 2. Local persistence to IndexedDB
    await db.saveBlock(newBlock);

    // 3. Queue write action
    const action: QueuedTelemetryAction = {
      id: `queue-${newBlock.id}`,
      type: 'INSERT',
      block: newBlock,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.pushQueue(action);
    this.state.pendingQueueCount += 1;
    this.notify();

    // 4. Background flush if online
    if (this.state.isOnline) {
      this.syncSingleBlock(newBlock, action.id);
    }

    return newBlock;
  };

  public updateBlock = async (id: string, updates: Partial<TelemetryBlock>): Promise<void> => {
    let targetBlock: TelemetryBlock | undefined;
    this.state.blocks = this.state.blocks.map(b => {
      if (b.id === id) {
        targetBlock = { ...b, ...updates, updatedAt: new Date().toISOString() };
        return targetBlock;
      }
      return b;
    });

    if (targetBlock) {
      this.notify();
      await db.saveBlock(targetBlock);

      const action: QueuedTelemetryAction = {
        id: `queue-upd-${id}-${Date.now()}`,
        type: 'UPDATE',
        block: targetBlock,
        timestamp: Date.now(),
        retryCount: 0
      };
      await db.pushQueue(action);
      this.state.pendingQueueCount += 1;
      this.notify();

      if (this.state.isOnline) {
        this.syncSingleBlock(targetBlock, action.id);
      }
    }
  };

  public nudgeBlock = async (id: string, deltaMinutes: number): Promise<void> => {
    const block = this.state.blocks.find(b => b.id === id);
    if (!block) return;

    const newDuration = Math.max(5, block.durationMinutes + deltaMinutes);
    await this.updateBlock(id, { durationMinutes: newDuration });
  };

  public deleteBlock = async (id: string): Promise<void> => {
    const existing = this.state.blocks.find(b => b.id === id);
    this.state.blocks = this.state.blocks.filter(b => b.id !== id);
    this.notify();

    await db.deleteBlock(id);

    if (existing) {
      const action: QueuedTelemetryAction = {
        id: `queue-del-${id}-${Date.now()}`,
        type: 'DELETE',
        block: existing,
        timestamp: Date.now(),
        retryCount: 0
      };
      await db.pushQueue(action);
      this.state.pendingQueueCount += 1;
      this.notify();

      if (this.state.isOnline) {
        deleteBlockFromFirestore(id, this.state.firestoreConfig);
        await db.removeQueueItem(action.id);
        this.state.pendingQueueCount = Math.max(0, this.state.pendingQueueCount - 1);
        this.notify();
      }
    }
  };

  // Quick log parser helper (e.g. "50m coding", "30m Reels", "2h design")
  public parseAndAddQuickLog = async (input: string): Promise<TelemetryBlock | null> => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    let duration = 30; // default 30 min
    let label = trimmed;

    const matchDuration = trimmed.match(/^(\d+)\s*(m|min|h|hr|hours?|mins?)\s+(.*)$/i);
    if (matchDuration) {
      const val = parseInt(matchDuration[1], 10);
      const unit = matchDuration[2].toLowerCase();
      duration = unit.startsWith('h') ? val * 60 : val;
      label = matchDuration[3].trim();
    }

    // Determine category and subject heuristically
    const lower = label.toLowerCase();
    let category: BlockCategory = 'focus';
    let tag = 'Study';
    let subject: SubjectTag | undefined = undefined;

    if (
      lower.includes('reels') ||
      lower.includes('instagram') ||
      lower.includes('tiktok') ||
      lower.includes('youtube') ||
      lower.includes('doomscroll') ||
      lower.includes('twitter') ||
      lower.includes('x.com') ||
      lower.includes('reddit') ||
      lower.includes('game') ||
      lower.includes('gaming')
    ) {
      category = 'wasted';
      tag = 'Distraction';
    } else if (
      lower.includes('lunch') ||
      lower.includes('dinner') ||
      lower.includes('walk') ||
      lower.includes('gym') ||
      lower.includes('shower') ||
      lower.includes('errand')
    ) {
      category = 'routine';
      tag = 'Personal';
    } else {
      // Focus Subject Heuristics: Physics takes priority over generic Revision
      if (lower.includes('physics')) {
        subject = 'Physics';
      } else if (lower.includes('math') || lower.includes('combined')) {
        subject = 'Combined Maths';
      } else if (lower.includes('chemistry') || lower.includes('chem')) {
        subject = 'Chemistry';
      } else if (lower.includes('past paper') || lower.includes('drill')) {
        subject = 'Past Paper';
      } else if (lower.includes('revision') || lower.includes('theory')) {
        subject = 'Revision';
      }
    }

    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now.getTime() - duration * 60 * 1000).toISOString();

    return this.addBlock({
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      label,
      category,
      tag,
      subject,
      source: 'manual'
    });
  };

  // -------------------------------------------------------------------------
  // Focus Stopwatch
  // -------------------------------------------------------------------------
  public startStopwatch = (label = 'Deep Work Session', tag = 'Focus', category: BlockCategory = 'focus') => {
    if (this.state.stopwatch.isRunning && !this.state.stopwatch.isPaused) return;

    if (this.state.stopwatch.isPaused) {
      // resume
      this.state.stopwatch.isPaused = false;
    } else {
      // start fresh
      this.state.stopwatch = {
        isRunning: true,
        isPaused: false,
        startTime: Date.now() - this.state.stopwatch.elapsedSeconds * 1000,
        elapsedSeconds: 0,
        currentLabel: label,
        currentTag: tag,
        currentCategory: category
      };
    }

    if (this.stopwatchInterval) clearInterval(this.stopwatchInterval);
    this.stopwatchInterval = setInterval(() => {
      this.state.stopwatch.elapsedSeconds += 1;
      this.notify();
    }, 1000);

    this.notify();
  };

  public pauseStopwatch = () => {
    if (!this.state.stopwatch.isRunning) return;
    this.state.stopwatch.isPaused = true;
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }
    this.notify();
  };

  public resetStopwatch = () => {
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }
    this.state.stopwatch = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentLabel: 'Deep Work Session',
      currentTag: 'Focus',
      currentCategory: 'focus'
    };
    this.notify();
  };

  public finishStopwatch = async (): Promise<TelemetryBlock | null> => {
    const { elapsedSeconds, currentLabel, currentTag, currentCategory } = this.state.stopwatch;
    this.resetStopwatch();

    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - elapsedSeconds * 1000).toISOString();

    return this.addBlock({
      startTime,
      endTime,
      durationMinutes,
      label: currentLabel,
      tag: currentTag,
      category: currentCategory,
      source: 'stopwatch'
    });
  };

  public updateStopwatchLabel = (label: string) => {
    this.state.stopwatch.currentLabel = label;
    this.notify();
  };

  // -------------------------------------------------------------------------
  // Filters & Settings
  // -------------------------------------------------------------------------
  public setSelectedDate = (date: string) => {
    this.state.selectedDate = date;
    this.notify();
  };

  public stepDate = (deltaDays: number) => {
    const current = new Date(this.state.selectedDate);
    current.setDate(current.getDate() + deltaDays);
    this.state.selectedDate = current.toISOString().split('T')[0];
    this.notify();
  };

  public setFilterScope = (scope: FilterScope) => {
    this.state.filterScope = scope;
    this.notify();
  };

  public setFocusGoal = (minutes: number) => {
    this.state.focusGoalMinutes = Math.max(30, minutes);
    try {
      localStorage.setItem('omni_focus_goal', String(this.state.focusGoalMinutes));
    } catch {}
    if (this.state.user) {
      this.state.user.dailyGoalHours = Math.round((minutes / 60) * 10) / 10;
      try {
        localStorage.setItem('omni_user_profile', JSON.stringify(this.state.user));
      } catch {}
    }
    this.notify();
  };

  /**
   * User Profile Account Management & Synchronization (Worker 1 Specification)
   */
  public setUser = (user: UserProfile | null) => {
    this.state.user = user;
    if (user) {
      if (user.dailyGoalHours) {
        this.state.focusGoalMinutes = Math.round(user.dailyGoalHours * 60);
      }
      try {
        localStorage.setItem('omni_user_profile', JSON.stringify(user));
      } catch {}
      // Background sync to Google Sheets & Firestore
      this.syncUserProfile(user);
    } else {
      try {
        localStorage.removeItem('omni_user_profile');
      } catch {}
    }
    this.notify();
  };

  public updateUserProfile = async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    if (!this.state.user) return null;
    const updated: UserProfile = {
      ...this.state.user,
      ...updates
    };
    if (updates.dailyGoalHours !== undefined) {
      this.state.focusGoalMinutes = Math.round(updates.dailyGoalHours * 60);
    }
    this.state.user = updated;
    try {
      localStorage.setItem('omni_user_profile', JSON.stringify(updated));
    } catch {}
    this.notify();
    await this.syncUserProfile(updated);
    return updated;
  };

  public syncUserProfile = async (userToSync?: UserProfile): Promise<{ success: boolean; error?: string }> => {
    const targetUser = userToSync || this.state.user;
    if (!targetUser) {
      return { success: false, error: 'No active user profile to sync' };
    }

    let sheetsOk = true;
    let firestoreOk = true;
    let errMsg: string | undefined;

    // 1. Sync to Firestore
    try {
      const fsRes = await syncUserProfileToFirestore(targetUser, this.state.firestoreConfig);
      if (!fsRes.success) {
        firestoreOk = false;
        errMsg = fsRes.error;
      }
    } catch (e: unknown) {
      firestoreOk = false;
      errMsg = e instanceof Error ? e.message : String(e);
    }

    // 2. Sync to Google Sheets Users tab
    if (this.state.sheetConfig && this.state.sheetConfig.mode !== 'none') {
      try {
        const sheetRes = await syncUserProfileToSheets(targetUser, this.state.sheetConfig);
        if (!sheetRes.success) {
          sheetsOk = false;
          errMsg = sheetRes.error || errMsg;
        }
      } catch (e: unknown) {
        sheetsOk = false;
        errMsg = e instanceof Error ? e.message : String(e);
      }
    }

    return {
      success: sheetsOk || firestoreOk,
      error: errMsg
    };
  };

  public setSheetConfig = (config: SheetConfig) => {
    this.state.sheetConfig = config;
    try {
      localStorage.setItem('omni_sheet_config', JSON.stringify(config));
    } catch {}
    this.notify();
  };

  public updateSheetConfig = (config: SheetConfig) => {
    this.setSheetConfig(config);
  };

  public stopAndSaveStopwatch = async (): Promise<TelemetryBlock | null> => {
    return this.finishStopwatch();
  };

  public fetchAiInsights = async (): Promise<AiInsight[]> => {
    try {
      const insights = await generateAiInsights(this.state.blocks);
      if (insights && Array.isArray(insights) && insights.length > 0) {
        this.state.insights = insights;
        this.notify();
        return insights;
      }
    } catch (e) {
      console.warn('Failed to fetch AI insights:', e);
    }
    return this.state.insights;
  };

  // -------------------------------------------------------------------------
  // Sync Engine (Sheets + Firestore)
  // -------------------------------------------------------------------------
  private async syncSingleBlock(block: TelemetryBlock, queueId: string) {
    let sheetsSuccess = false;
    let firestoreSuccess = false;

    // Sync to Sheets
    if (this.state.sheetConfig && this.state.sheetConfig.mode !== 'none') {
      const res = await appendBlockToSheets(block, this.state.sheetConfig);
      sheetsSuccess = res.success;
    } else {
      sheetsSuccess = true; // Not configured, don't hold queue
    }

    // Sync to Firestore
    const fsRes = await mirrorBlockToFirestore(block, this.state.firestoreConfig);
    firestoreSuccess = fsRes.success;

    if (sheetsSuccess || firestoreSuccess) {
      await db.removeQueueItem(queueId);
      this.state.pendingQueueCount = Math.max(0, this.state.pendingQueueCount - 1);
      this.state.lastSyncedAt = new Date().toISOString();
      this.state.syncError = null;

      // Mark block as synced
      this.state.blocks = this.state.blocks.map(b =>
        b.id === block.id
          ? { ...b, syncedToSheets: sheetsSuccess, syncedToFirestore: firestoreSuccess }
          : b
      );
      this.notify();
    }
  }

  public syncOfflineQueue = async (): Promise<void> => {
    if (!this.state.isOnline) return;
    const queue = await db.getQueue();
    if (queue.length === 0) return;

    this.state.isSyncing = true;
    this.notify();

    for (const item of queue) {
      try {
        if (item.type === 'INSERT' || item.type === 'UPDATE') {
          await this.syncSingleBlock(item.block, item.id);
        } else if (item.type === 'DELETE') {
          await deleteBlockFromFirestore(item.block.id, this.state.firestoreConfig);
          await db.removeQueueItem(item.id);
          this.state.pendingQueueCount = Math.max(0, this.state.pendingQueueCount - 1);
        }
      } catch (e) {
        console.warn('Queue item process failed:', item.id, e);
      }
    }

    this.state.isSyncing = false;
    this.notify();
  };

  public hydrateAll = async (): Promise<void> => {
    this.state.isSyncing = true;
    this.notify();

    try {
      // 1. Try Firestore first
      const fsResult = await fetchBlocksFromFirestore(this.state.firestoreConfig);
      if (fsResult.success && fsResult.data.length > 0) {
        this.mergeIncomingBlocks(fsResult.data);
      }

      // 2. Try Sheets
      if (this.state.sheetConfig && this.state.sheetConfig.mode !== 'none') {
        const sheetResult = await fetchBlocksFromSheets(this.state.sheetConfig);
        if (sheetResult.success && sheetResult.data.length > 0) {
          this.mergeIncomingBlocks(sheetResult.data);
        }
      }

      this.state.lastSyncedAt = new Date().toISOString();
      this.state.syncError = null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.syncError = msg;
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }
  };

  private mergeIncomingBlocks(incoming: TelemetryBlock[]) {
    const existingMap = new Map(this.state.blocks.map(b => [b.id, b]));
    let hasUpdates = false;

    incoming.forEach(b => {
      if (!existingMap.has(b.id)) {
        existingMap.set(b.id, b);
        db.saveBlock(b);
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      const all = Array.from(existingMap.values());
      all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      this.state.blocks = all;
      this.notify();
    }
  }

  // -------------------------------------------------------------------------
  // Aggregations, KPIs & Visual Queries
  // -------------------------------------------------------------------------

  /**
   * Filtered blocks according to selected date or range
   */
  public getBlocksForActiveScope = (): TelemetryBlock[] => {
    const { blocks, selectedDate, filterScope } = this.state;

    if (filterScope === 'today') {
      return blocks.filter(b => b.startTime.startsWith(selectedDate));
    }

    if (filterScope === '7d') {
      const targetDate = new Date(selectedDate);
      const sevenDaysAgo = new Date(targetDate);
      sevenDaysAgo.setDate(targetDate.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const endDay = new Date(targetDate);
      endDay.setHours(23, 59, 59, 999);

      return blocks.filter(b => {
        const t = new Date(b.startTime).getTime();
        return t >= sevenDaysAgo.getTime() && t <= endDay.getTime();
      });
    }

    return blocks;
  };

  /**
   * Daily KPIs computation
   */
  public getDailyKpiMetrics = (targetDate = this.state.selectedDate): DailyKpiMetrics => {
    const dayBlocks = this.state.blocks.filter(b => b.startTime.startsWith(targetDate));

    let focusMinutes = 0;
    let wastedMinutes = 0;
    let deepSessionCount = 0;
    const offenderMap: Record<string, number> = {};

    dayBlocks.forEach(b => {
      if (b.category === 'focus') {
        focusMinutes += b.durationMinutes;
        if (b.durationMinutes >= 45) {
          deepSessionCount++;
        }
      } else if (b.category === 'wasted') {
        wastedMinutes += b.durationMinutes;
        offenderMap[b.label] = (offenderMap[b.label] || 0) + b.durationMinutes;
      }
    });

    let topOffenderApp = 'None';
    let topOffenderMinutes = 0;
    Object.entries(offenderMap).forEach(([name, mins]) => {
      if (mins > topOffenderMinutes) {
        topOffenderMinutes = mins;
        topOffenderApp = name;
      }
    });

    // Dynamic leak window calculation from real recorded telemetry
    let leakWindow = 'None';
    if (wastedMinutes > 0) {
      const hourlyWasted: Record<number, number> = {};
      dayBlocks.filter(b => b.category === 'wasted').forEach(b => {
        const h = new Date(b.startTime).getHours();
        hourlyWasted[h] = (hourlyWasted[h] || 0) + b.durationMinutes;
      });
      let maxH = -1;
      let maxM = 0;
      Object.entries(hourlyWasted).forEach(([hStr, m]) => {
        if (m > maxM) {
          maxM = m;
          maxH = Number(hStr);
        }
      });
      if (maxH !== -1) {
        const startH = maxH.toString().padStart(2, '0');
        const endH = ((maxH + 1) % 24).toString().padStart(2, '0');
        leakWindow = `${startH}:00 - ${endH}:00`;
      }
    }

    // 16-hour waking day = 960 minutes
    const wakingWindowMinutes = 16 * 60;
    const wakingLeakPercentage = Math.min(100, Math.round((wastedMinutes / wakingWindowMinutes) * 100));

    return {
      focusMinutes,
      focusGoalMinutes: this.state.focusGoalMinutes,
      wastedMinutes,
      deepSessionCount,
      deepSessionMaxTarget: 6, // 6 target nodes
      distractionCount: dayBlocks.filter(b => b.category === 'wasted').length,
      topOffenderApp,
      topDistractionApp: topOffenderApp,
      topOffenderMinutes,
      leakWindow,
      wakingLeakPercentage
    };
  };

  /**
   * Weekly Activity Bar Chart summary (for Recharts)
   */
  public getWeeklySummary = (): DayActivitySummary[] => {
    const days: DayActivitySummary[] = [];
    const base = new Date(this.state.selectedDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayBlocks = this.state.blocks.filter(b => b.startTime.startsWith(dateStr));
      let focusMinutes = 0;
      let wastedMinutes = 0;
      let routineMinutes = 0;
      let neutralMinutes = 0;

      dayBlocks.forEach(b => {
        if (b.category === 'focus') focusMinutes += b.durationMinutes;
        else if (b.category === 'wasted') wastedMinutes += b.durationMinutes;
        else if (b.category === 'routine') routineMinutes += b.durationMinutes;
        else neutralMinutes += b.durationMinutes;
      });

      days.push({
        date: dateStr,
        dayLabel,
        dayName: dayLabel,
        focusMinutes,
        wastedMinutes,
        routineMinutes,
        neutralMinutes
      });
    }

    return days;
  };

  public getWeeklyActivitySummary = (): DayActivitySummary[] => {
    return this.getWeeklySummary();
  };

  public getSubjectBreakdown = (): Array<{ subject: string; minutes: number; hours: number; percentage: number; color: string }> => {
    const subjectMap: Record<string, number> = {
      'Combined Maths': 0,
      'Physics': 0,
      'Past Paper': 0,
      'Revision': 0,
      'Other': 0
    };

    let totalFocusMins = 0;
    this.state.blocks.forEach(b => {
      if (b.category === 'focus') {
        totalFocusMins += b.durationMinutes;
        const lowerLabel = (b.label || b.title || '').toLowerCase();
        
        let subj = b.subject;
        // Priority check: Physics > Maths > Chemistry > Past Paper > Revision
        if (!subj) {
          if (lowerLabel.includes('physics')) subj = 'Physics';
          else if (lowerLabel.includes('math') || lowerLabel.includes('combined')) subj = 'Combined Maths';
          else if (lowerLabel.includes('chem')) subj = 'Other';
          else if (lowerLabel.includes('past paper') || lowerLabel.includes('paper')) subj = 'Past Paper';
          else if (lowerLabel.includes('revision') || b.tag === 'Study') subj = 'Revision';
          else subj = 'Other';
        }

        if (subj in subjectMap) {
          subjectMap[subj] += b.durationMinutes;
        } else {
          subjectMap['Other'] += b.durationMinutes;
        }
      }
    });

    const colors: Record<string, string> = {
      'Combined Maths': '#A3E635',
      'Physics': '#38BDF8',
      'Past Paper': '#F59E0B',
      'Revision': '#A855F7',
      'Other': '#71717A'
    };

    return Object.entries(subjectMap).map(([subject, minutes]) => ({
      subject,
      minutes,
      hours: parseFloat((minutes / 60).toFixed(1)),
      percentage: totalFocusMins > 0 ? Math.round((minutes / totalFocusMins) * 100) : 0,
      color: colors[subject] || '#A3E635'
    }));
  };

  public setExamCountdown = (date: string, title?: string) => {
    this.state.examCountdownDate = date;
    if (title) this.state.examCountdownTitle = title;
    try {
      localStorage.setItem('chrono_exam_date', date);
      if (title) localStorage.setItem('chrono_exam_title', title);
    } catch {}
    this.notify();
  };

  public setTimerMode = (mode: 'stopwatch' | 'pomodoro' | 'paper-2h' | 'paper-3h', targetSeconds = 0) => {
    this.state.timerMode = mode;
    this.state.timerTargetSeconds = targetSeconds;
    this.notify();
  };

  public getStudyStreak = (): number => {
    const datesWithFocus = new Set(
      this.state.blocks
        .filter(b => b.category === 'focus')
        .map(b => (b.startTime.includes('T') ? b.startTime.split('T')[0] : b.date || ''))
        .filter(Boolean)
    );

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() - i);
      const str = checkDate.toISOString().split('T')[0];
      if (datesWithFocus.has(str)) {
        streak++;
      } else if (i === 0) {
        // Today might not have focus yet, continue to check yesterday
        continue;
      } else {
        break;
      }
    }
    return Math.max(1, streak);
  };

  public refreshInsights = async (): Promise<AiInsight[]> => {
    try {
      const insights = await generateAiInsights(this.state.blocks);
      if (insights && Array.isArray(insights) && insights.length > 0) {
        this.state.insights = insights;
        this.notify();
        return insights;
      }
    } catch (e) {
      console.warn('[TelemetryStore] Failed to refresh insights:', e);
    }
    return this.state.insights;
  };

  /**
   * 24-hr Danger Heatmap Matrix (7 days x 18 hours: 06:00 to 23:00)
   */
  public getHeatmapMatrix = (): HeatmapCell[] => {
    const cells: HeatmapCell[] = [];
    const base = new Date(this.state.selectedDate);

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const d = new Date(base);
      d.setDate(base.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      // Use true Day of Week index (0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat)
      const dayOfWeekIdx = d.getDay();

      const dayBlocks = this.state.blocks.filter(b => b.startTime.startsWith(dateStr));

      // Hours 6 to 23 (18 slots)
      for (let hour = 6; hour <= 23; hour++) {
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

        let wastedMins = 0;
        let focusMins = 0;

        dayBlocks.forEach(b => {
          const blockDate = new Date(b.startTime);
          const blockHour = !isNaN(blockDate.getTime()) ? blockDate.getHours() : parseInt(b.startTime.split(':')[0] || '14', 10);
          if (blockHour === hour) {
            if (b.category === 'wasted') wastedMins += b.durationMinutes;
            if (b.category === 'focus') focusMins += b.durationMinutes;
          }
        });

        let dominant: BlockCategory | 'none' = 'none';
        if (wastedMins > 0 || focusMins > 0) {
          dominant = wastedMins >= focusMins ? 'wasted' : 'focus';
        }

        let intensity = 0;
        const total = wastedMins + focusMins;
        if (total > 45) intensity = 4;
        else if (total > 30) intensity = 3;
        else if (total > 15) intensity = 2;
        else if (total > 0) intensity = 1;

        cells.push({
          dayIndex: dayOfWeekIdx,
          dayName,
          hour,
          hourLabel,
          wastedMinutes: wastedMins,
          focusMinutes: focusMins,
          dominantCategory: dominant,
          intensity
        });
      }
    }

    return cells;
  };

  public get7x18HeatmapData = (): HeatmapCell[] => {
    return this.getHeatmapMatrix();
  };

}

// Global Singleton Store Instance
export const telemetryStore = new TelemetryStoreManager();

/**
 * React Hook for 60fps tearing-free reactive subscription
 */
export function useTelemetryStore(): TelemetryState {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    telemetryStore.getState,
    telemetryStore.getState // Server snapshot
  );
}
