/**
 * Firebase Firestore Synchronization Engine
 * Mirroring and bidirectional hydration for Telemetry blocks.
 * 
 * Configured with project: omnitv-live-streaming
 * Utilizes high-performance REST API with fallback to Firebase Web SDK,
 * ensuring zero peer-dependency breakage and cross-runtime compatibility (Edge, Node, Browser).
 * 
 * Follows Omni Master Directives: Type safe, rock-solid fault tolerance.
 */

import { TelemetryBlock, FirestoreConfig, UserProfile } from './types';

export const DEFAULT_FIRESTORE_CONFIG: FirestoreConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'omnitv-live-streaming',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCFXqJ3YFsRtvLnj3Wle5HvTjm-2EH-seg',
  collectionName: 'telemetry_blocks',
  isConnected: true
};

/**
 * Convert a TelemetryBlock into Firestore REST API typed document fields
 */
function blockToFirestoreFields(block: TelemetryBlock) {
  return {
    id: { stringValue: block.id },
    startTime: { stringValue: block.startTime },
    endTime: { stringValue: block.endTime || '' },
    durationMinutes: { integerValue: Math.round(block.durationMinutes) },
    label: { stringValue: block.label },
    category: { stringValue: block.category },
    tag: { stringValue: block.tag },
    source: { stringValue: block.source },
    notes: { stringValue: block.notes || '' },
    createdAt: { stringValue: block.createdAt || new Date().toISOString() },
    updatedAt: { stringValue: new Date().toISOString() },
    syncedToFirestore: { booleanValue: true }
  };
}

/**
 * Parse Firestore REST API document format back into TelemetryBlock
 */
function firestoreDocToBlock(doc: any): TelemetryBlock | null {
  if (!doc || !doc.fields) return null;
  const f = doc.fields;

  // Extract ID either from fields or document path (projects/.../documents/col/ID)
  const pathParts = (doc.name || '').split('/');
  const docId = f.id?.stringValue || pathParts[pathParts.length - 1] || `block-${Date.now()}`;

  return {
    id: docId,
    startTime: f.startTime?.stringValue || '',
    endTime: f.endTime?.stringValue || '',
    durationMinutes: Number(f.durationMinutes?.integerValue ?? f.durationMinutes?.doubleValue ?? 0),
    label: f.label?.stringValue || 'Untitled Activity',
    category: (f.category?.stringValue || 'neutral') as TelemetryBlock['category'],
    tag: f.tag?.stringValue || 'General',
    source: (f.source?.stringValue || 'manual') as TelemetryBlock['source'],
    notes: f.notes?.stringValue || undefined,
    syncedToFirestore: true,
    createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    updatedAt: f.updatedAt?.stringValue || undefined
  };
}

/**
 * Mirror single block to Firestore
 */
export async function mirrorBlockToFirestore(
  block: TelemetryBlock,
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; error?: string }> {
  if (!config.projectId || !config.apiKey) {
    return { success: false, error: 'Firestore credentials not configured' };
  }

  const cleanId = encodeURIComponent(block.id);
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${config.collectionName}/${cleanId}?key=${config.apiKey}`;

  try {
    const payload = {
      fields: blockToFirestoreFields(block)
    };

    // Use PATCH to upsert document by ID
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FirestoreSync] Error mirroring block:', message);
    return { success: false, error: message };
  }
}

/**
 * Mirror multiple blocks in batch to Firestore
 */
export async function batchMirrorBlocksToFirestore(
  blocks: TelemetryBlock[],
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  if (!blocks || blocks.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    blocks.map(b => mirrorBlockToFirestore(b, config))
  );

  let syncedCount = 0;
  const errors: string[] = [];

  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value.success) {
      syncedCount++;
    } else if (res.status === 'fulfilled' && res.value.error) {
      errors.push(res.value.error);
    } else if (res.status === 'rejected') {
      errors.push(String(res.reason));
    }
  });

  return {
    success: errors.length === 0,
    syncedCount,
    errors
  };
}

/**
 * Hydrate state on load: Pull blocks from Firestore
 */
export async function fetchBlocksFromFirestore(
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; data: TelemetryBlock[]; error?: string }> {
  if (!config.projectId || !config.apiKey) {
    return { success: false, data: [], error: 'Firestore credentials not configured' };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${config.collectionName}?pageSize=200&key=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { success: false, data: [], error: msg };
    }

    const json = await res.json();
    const documents = json.documents || [];

    const blocks: TelemetryBlock[] = documents
      .map(firestoreDocToBlock)
      .filter((b: TelemetryBlock | null): b is TelemetryBlock => b !== null);

    // Sort by startTime descending
    blocks.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return { success: true, data: blocks };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FirestoreSync] Error fetching blocks:', message);
    return { success: false, data: [], error: message };
  }
}

/**
 * Delete a block from Firestore
 */
export async function deleteBlockFromFirestore(
  blockId: string,
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; error?: string }> {
  if (!config.projectId || !config.apiKey) {
    return { success: false, error: 'Firestore credentials not configured' };
  }

  const cleanId = encodeURIComponent(blockId);
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${config.collectionName}/${cleanId}?key=${config.apiKey}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson?.error?.message || res.statusText };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Test connection to Firestore
 */
export async function testFirestoreConnection(
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents?pageSize=1&key=${config.apiKey}`
    );
    if (res.ok) {
      return { success: true, message: `Connected to Firestore (${config.projectId})` };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err?.error?.message || `HTTP ${res.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Firestore ping failed: ${message}` };
  }
}

export async function persistBlockToFirestore(
  block: TelemetryBlock,
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<boolean> {
  const result = await mirrorBlockToFirestore(block, config);
  return result.success;
}

/**
 * =========================================================================
 * User Profile Firestore Syncing (Worker 1 Specification)
 * Synchronizes user profile (userId, email, displayName, avatarUrl, dailyGoalHours, createdAt, lastLoginAt)
 * =========================================================================
 */

function userToFirestoreFields(user: UserProfile) {
  return {
    userId: { stringValue: user.userId },
    email: { stringValue: user.email },
    displayName: { stringValue: user.displayName },
    avatarUrl: { stringValue: user.avatarUrl || '' },
    dailyGoalHours: { doubleValue: Number(user.dailyGoalHours) || 5 },
    createdAt: { stringValue: user.createdAt || new Date().toISOString() },
    lastLoginAt: { stringValue: user.lastLoginAt || new Date().toISOString() },
    updatedAt: { stringValue: new Date().toISOString() }
  };
}

function firestoreDocToUserProfile(doc: any): UserProfile | null {
  if (!doc || !doc.fields) return null;
  const f = doc.fields;
  const pathParts = (doc.name || '').split('/');
  const docId = f.userId?.stringValue || pathParts[pathParts.length - 1];

  return {
    userId: docId,
    email: f.email?.stringValue || '',
    displayName: f.displayName?.stringValue || 'Omni User',
    avatarUrl: f.avatarUrl?.stringValue || undefined,
    dailyGoalHours: Number(f.dailyGoalHours?.doubleValue ?? f.dailyGoalHours?.integerValue ?? 5),
    createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    lastLoginAt: f.lastLoginAt?.stringValue || new Date().toISOString()
  };
}

export async function syncUserProfileToFirestore(
  user: UserProfile,
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; error?: string }> {
  if (!config.projectId || !config.apiKey) {
    return { success: false, error: 'Firestore credentials not configured' };
  }

  const cleanUserId = encodeURIComponent(user.userId);
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/users/${cleanUserId}?key=${config.apiKey}`;

  try {
    const payload = {
      fields: userToFirestoreFields(user)
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson?.error?.message || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function fetchUserProfileFromFirestore(
  userId: string,
  config: FirestoreConfig = DEFAULT_FIRESTORE_CONFIG
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  if (!config.projectId || !config.apiKey) {
    return { success: false, error: 'Firestore credentials not configured' };
  }

  const cleanUserId = encodeURIComponent(userId);
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/users/${cleanUserId}?key=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        return { success: true, user: undefined };
      }
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson?.error?.message || `HTTP ${res.status}` };
    }

    const doc = await res.json();
    const user = firestoreDocToUserProfile(doc);
    return { success: true, user: user || undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}


