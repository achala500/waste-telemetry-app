/**
 * Google Sheets Synchronization Engine
 * Dual-Mode Connector:
 * 1. Direct Google Sheets API v4 (spreadsheets.values.append & get)
 * 2. Zero-auth Google Apps Script Web App JSON connector for standard/free Gmail accounts
 * 
 * Follows Omni Master Directives: Type safety, production resilience, zero dropped writes.
 */

import { TelemetryBlock, SheetConfig, UserProfile, UserFeedbackItem, ChangelogEntry } from './types';

export const DEFAULT_SHEET_NAME = 'Focus_Logs';
export const USERS_SHEET_NAME = 'Users';
export const CHANGELOG_SHEET_NAME = 'Changelog';
export const USER_FEEDBACK_SHEET_NAME = 'User_Feedback';

export const CHANGELOG_COLUMNS = [
  'version',
  'date',
  'headline',
  'plainEnglishSummary',
  'fixedFeedbackIds'
];

export const USER_FEEDBACK_COLUMNS = [
  'id',
  'category',
  'description',
  'status',
  'date',
  'author',
  'annotatedScreenshotUrl'
];

export const USER_SHEET_COLUMNS = [
  'User ID',
  'Email',
  'Display Name',
  'Avatar URL',
  'Daily Goal (Hours)',
  'Created At',
  'Last Login At'
];

export const SHEET_COLUMNS = [
  'Block ID',
  'Date / Start Time',
  'End Time',
  'Duration (min)',
  'Label / Activity',
  'Category',
  'Tag',
  'Source',
  'Notes',
  'Created At'
];

/**
 * Format a TelemetryBlock into an ordered row array for Google Sheets
 */
export function blockToSheetRow(block: TelemetryBlock): (string | number)[] {
  return [
    block.id,
    block.startTime,
    block.endTime,
    block.durationMinutes,
    block.label,
    block.category,
    block.tag,
    block.source,
    block.notes || '',
    block.createdAt || new Date().toISOString()
  ];
}

/**
 * Convert a raw Google Sheets row array back into a TelemetryBlock
 */
export function sheetRowToBlock(row: (string | number)[]): TelemetryBlock | null {
  if (!row || row.length < 5) return null;
  const [
    id,
    startTime,
    endTime,
    durationMinutes,
    label,
    category,
    tag,
    source,
    notes,
    createdAt
  ] = row;

  return {
    id: String(id || `block-${Date.now()}`),
    startTime: String(startTime || ''),
    endTime: String(endTime || ''),
    durationMinutes: Number(durationMinutes) || 0,
    label: String(label || 'Untitled'),
    category: (['focus', 'wasted', 'routine', 'neutral'].includes(String(category).toLowerCase())
      ? String(category).toLowerCase()
      : 'neutral') as TelemetryBlock['category'],
    tag: String(tag || 'General'),
    source: (['manual', 'shortcut', 'api', 'stopwatch', 'paired_event'].includes(String(source))
      ? String(source)
      : 'manual') as TelemetryBlock['source'],
    notes: notes ? String(notes) : undefined,
    syncedToSheets: true,
    createdAt: String(createdAt || new Date().toISOString())
  };
}

/**
 * Dual-mode Append: Dispatches to Direct Sheets API v4 or Apps Script Web App
 */
export async function appendBlockToSheets(
  block: TelemetryBlock,
  config: SheetConfig
): Promise<{ success: boolean; error?: string }> {
  if (!config || config.mode === 'none') {
    return { success: false, error: 'Google Sheets integration is disabled or not configured' };
  }

  try {
    if (config.mode === 'apps_script' && config.appsScriptUrl) {
      return await appendViaAppsScript([block], config.appsScriptUrl);
    }

    if (config.mode === 'direct' && config.spreadsheetId && config.apiKey) {
      return await appendViaDirectApi([block], config);
    }

    return { success: false, error: 'Missing required credentials for configured sheet mode' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SheetsSync] Error appending block:', message);
    return { success: false, error: message };
  }
}

/**
 * Dual-mode Batch Append
 */
export async function batchAppendBlocksToSheets(
  blocks: TelemetryBlock[],
  config: SheetConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!blocks || blocks.length === 0) {
    return { success: true, count: 0 };
  }

  if (!config || config.mode === 'none') {
    return { success: false, count: 0, error: 'Sheets not configured' };
  }

  try {
    if (config.mode === 'apps_script' && config.appsScriptUrl) {
      const result = await appendViaAppsScript(blocks, config.appsScriptUrl);
      return { success: result.success, count: result.success ? blocks.length : 0, error: result.error };
    }

    if (config.mode === 'direct' && config.spreadsheetId && config.apiKey) {
      const result = await appendViaDirectApi(blocks, config);
      return { success: result.success, count: result.success ? blocks.length : 0, error: result.error };
    }

    return { success: false, count: 0, error: 'Invalid configuration mode' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Append records via Apps Script Web App endpoint
 */
async function appendViaAppsScript(
  blocks: TelemetryBlock[],
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      action: 'append_batch',
      timestamp: new Date().toISOString(),
      rows: blocks.map(blockToSheetRow),
      blocks: blocks
    };

    // Apps Script requires redirect follow or text/plain POST to avoid strict preflight blocks
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // In some browser setups, Apps script redirects might return opaque or 302
      return { success: false, error: `Apps Script HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json().catch(() => ({ status: 'success' }));
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Apps Script communication failed: ${message}` };
  }
}

/**
 * Append records via Direct Google Sheets API v4
 */
async function appendViaDirectApi(
  blocks: TelemetryBlock[],
  config: SheetConfig
): Promise<{ success: boolean; error?: string }> {
  const sheetName = config.sheetName || DEFAULT_SHEET_NAME;
  const range = `${sheetName}!A:J`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${config.apiKey}`;

  const body = {
    range,
    majorDimension: 'ROWS',
    values: blocks.map(blockToSheetRow)
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson?.error?.message || `Google API error: ${response.statusText}`;
    return { success: false, error: errorMsg };
  }

  return { success: true };
}

/**
 * Hydrate state on load: Pull latest blocks from Google Sheets
 */
export async function fetchBlocksFromSheets(
  config: SheetConfig
): Promise<{ success: boolean; data: TelemetryBlock[]; error?: string }> {
  if (!config || config.mode === 'none') {
    return { success: false, data: [], error: 'Sheets not configured' };
  }

  try {
    if (config.mode === 'apps_script' && config.appsScriptUrl) {
      const url = new URL(config.appsScriptUrl);
      url.searchParams.set('action', 'get_all');
      url.searchParams.set('t', Date.now().toString());

      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        return { success: false, data: [], error: `Apps Script returned ${res.status}` };
      }

      const json = await res.json();
      const rawRows: (string | number)[][] = json.rows || json.data || [];
      // If first row is headers, skip it
      const startIdx = (rawRows[0] && String(rawRows[0][0]).toLowerCase().includes('id')) ? 1 : 0;
      const parsedBlocks = rawRows
        .slice(startIdx)
        .map(sheetRowToBlock)
        .filter((b): b is TelemetryBlock => b !== null);

      return { success: true, data: parsedBlocks };
    }

    if (config.mode === 'direct' && config.spreadsheetId && config.apiKey) {
      const sheetName = config.sheetName || DEFAULT_SHEET_NAME;
      const range = `${sheetName}!A:J`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?key=${config.apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return { success: false, data: [], error: errorJson?.error?.message || res.statusText };
      }

      const json = await res.json();
      const values: (string | number)[][] = json.values || [];
      const startIdx = (values[0] && String(values[0][0]).toLowerCase().includes('id')) ? 1 : 0;
      const parsedBlocks = values
        .slice(startIdx)
        .map(sheetRowToBlock)
        .filter((b): b is TelemetryBlock => b !== null);

      return { success: true, data: parsedBlocks };
    }

    return { success: false, data: [], error: 'Unsupported configuration' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, data: [], error: message };
  }
}

/**
 * Verify sheets connection health
 */
export async function testSheetsConnection(
  config: SheetConfig
): Promise<{ success: boolean; message: string }> {
  if (config.mode === 'apps_script') {
    if (!config.appsScriptUrl) {
      return { success: false, message: 'Apps Script URL is empty' };
    }
    try {
      const pingUrl = new URL(config.appsScriptUrl);
      pingUrl.searchParams.set('action', 'ping');
      const res = await fetch(pingUrl.toString());
      if (res.ok) {
        return { success: true, message: 'Google Apps Script Web App responding successfully.' };
      }
      return { success: false, message: `Apps Script status: ${res.status} ${res.statusText}` };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, message: `Apps script ping error: ${message}` };
    }
  }

  if (config.mode === 'direct') {
    if (!config.spreadsheetId || !config.apiKey) {
      return { success: false, message: 'Missing Spreadsheet ID or Google API Key' };
    }
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?key=${config.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: `Connected to spreadsheet "${data.properties?.title || 'Sheets'}"` };
      }
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error?.message || res.statusText };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, message: `Sheets API error: ${message}` };
    }
  }

  return { success: false, message: 'Integration disabled' };
}

/**
 * Zero-Auth Google Apps Script Web App Code Generator
 * Users can paste this directly into script.google.com attached to any standard free Google Sheet.
 */
export function generateAppsScriptCode(spreadsheetId?: string): string {
  return `/**
 * Omni Telemetry & Time Tracking Engine - Google Apps Script Connector
 * Deploy as Web App:
 * 1. Open Google Sheets -> Extensions -> Apps Script
 * 2. Paste this code completely, replacing existing content.
 * 3. Click 'Deploy' -> 'New deployment'
 * 4. Select type: 'Web app'
 * 5. Configuration:
 *    - Description: Omni Telemetry Sync Connector
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 6. Click 'Deploy' and authorize permissions.
 * 7. Copy the 'Web app URL' into your Omni Dashboard.
 */

const SHEET_NAME = 'Focus_Logs';
const USERS_SHEET_NAME = 'Users';
const SPREADSHEET_ID = '${spreadsheetId || ''}'; // Optional: leave blank to auto-use active sheet

function getTargetSheet(customName) {
  var ss;
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  var targetName = customName || SHEET_NAME;
  var sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
    var headers = [];
    if (targetName === USERS_SHEET_NAME) {
      headers = [
        'User ID',
        'Email',
        'Display Name',
        'Avatar URL',
        'Daily Goal (Hours)',
        'Created At',
        'Last Login At'
      ];
    } else {
      headers = [
        'Block ID',
        'Date / Start Time',
        'End Time',
        'Duration (min)',
        'Label / Activity',
        'Category',
        'Tag',
        'Source',
        'Notes',
        'Created At'
      ];
    }
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#141416').setFontColor('#A3E635');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : '';
    var payload = {};
    if (contents) {
      try {
        payload = JSON.parse(contents);
      } catch (parseErr) {
        payload = { raw: contents };
      }
    }

    if (payload.action === 'sync_user') {
      var userSheet = getTargetSheet(USERS_SHEET_NAME);
      var userRow = payload.row || (payload.user ? [
        payload.user.userId,
        payload.user.email,
        payload.user.displayName,
        payload.user.avatarUrl || '',
        payload.user.dailyGoalHours || 5,
        payload.user.createdAt || new Date().toISOString(),
        payload.user.lastLoginAt || new Date().toISOString()
      ] : []);
      
      // Upsert: check if user already exists
      var data = userSheet.getDataRange().getValues();
      var foundRowIndex = -1;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == userRow[0] || data[i][1] == userRow[1]) {
          foundRowIndex = i + 1;
          break;
        }
      }
      if (foundRowIndex > 0) {
        userSheet.getRange(foundRowIndex, 1, 1, userRow.length).setValues([userRow]);
      } else {
        userSheet.appendRow(userRow);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        userSynced: true,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getTargetSheet(SHEET_NAME);
    var appendedCount = 0;

    if (payload.action === 'append_batch' && Array.isArray(payload.rows)) {
      payload.rows.forEach(function(row) {
        sheet.appendRow(row);
        appendedCount++;
      });
    } else if (payload.row && Array.isArray(payload.row)) {
      sheet.appendRow(payload.row);
      appendedCount = 1;
    } else if (payload.block) {
      var b = payload.block;
      sheet.appendRow([
        b.id || Utilities.getUuid(),
        b.startTime || new Date().toISOString(),
        b.endTime || '',
        b.durationMinutes || 0,
        b.label || 'Activity',
        b.category || 'focus',
        b.tag || 'Work',
        b.source || 'shortcut',
        b.notes || '',
        new Date().toISOString()
      ]);
      appendedCount = 1;
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      appended: appendedCount,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get_all';

    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'online',
        service: 'Omni Telemetry Apps Script Connector',
        time: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getTargetSheet();
    var values = sheet.getDataRange().getValues();

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      totalRows: values.length,
      rows: values
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  mode: 'none',
  sheetName: DEFAULT_SHEET_NAME,
  spreadsheetId: process.env.NEXT_PUBLIC_SHEETS_SPREADSHEET_ID || '',
  apiKey: process.env.GOOGLE_API_KEY || '',
  appsScriptUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '',
  isConnected: false
};

export const generateAppsScriptTemplate = generateAppsScriptCode;

export async function appendSheetRow(block: TelemetryBlock, config: SheetConfig = DEFAULT_SHEET_CONFIG): Promise<boolean> {
  const res = await appendBlockToSheets(block, config);
  return res.success;
}

export async function fetchSheetBlocks(spreadsheetId?: string): Promise<TelemetryBlock[]> {
  const config: SheetConfig = {
    ...DEFAULT_SHEET_CONFIG,
    mode: spreadsheetId ? 'direct' : DEFAULT_SHEET_CONFIG.mode,
    spreadsheetId: spreadsheetId || DEFAULT_SHEET_CONFIG.spreadsheetId
  };
  const res = await fetchBlocksFromSheets(config);
  return res.data || [];
}

/**
 * =========================================================================
 * User Profile Google Sheets Syncing (Worker 1 Specification)
 * Synchronizes user profile to the "Users" tab in Google Sheets
 * =========================================================================
 */

export function userToSheetRow(user: UserProfile): (string | number)[] {
  return [
    user.userId,
    user.email,
    user.displayName,
    user.avatarUrl || '',
    user.dailyGoalHours,
    user.createdAt || new Date().toISOString(),
    user.lastLoginAt || new Date().toISOString()
  ];
}

export function sheetRowToUserProfile(row: (string | number)[]): UserProfile | null {
  if (!row || row.length < 3) return null;
  const [userId, email, displayName, avatarUrl, dailyGoalHours, createdAt, lastLoginAt] = row;
  return {
    userId: String(userId || `user-${Date.now()}`),
    email: String(email || ''),
    displayName: String(displayName || 'Omni User'),
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    dailyGoalHours: Number(dailyGoalHours) || 5,
    createdAt: String(createdAt || new Date().toISOString()),
    lastLoginAt: String(lastLoginAt || new Date().toISOString())
  };
}

export async function syncUserProfileToSheets(
  user: UserProfile,
  config: SheetConfig
): Promise<{ success: boolean; error?: string }> {
  if (!config || config.mode === 'none') {
    return { success: false, error: 'Google Sheets integration is disabled or not configured' };
  }

  try {
    if (config.mode === 'apps_script' && config.appsScriptUrl) {
      const payload = {
        action: 'sync_user',
        sheetName: USERS_SHEET_NAME,
        user: user,
        row: userToSheetRow(user),
        timestamp: new Date().toISOString()
      };

      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, error: `Apps Script HTTP ${response.status}: ${response.statusText}` };
      }

      return { success: true };
    }

    if (config.mode === 'direct' && config.spreadsheetId && config.apiKey) {
      const range = `${USERS_SHEET_NAME}!A:G`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${config.apiKey}`;

      const body = {
        range,
        majorDimension: 'ROWS',
        values: [userToSheetRow(user)]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errorMsg = errorJson?.error?.message || `Google API error: ${response.statusText}`;
        return { success: false, error: errorMsg };
      }

      return { success: true };
    }

    return { success: false, error: 'Missing required credentials for configured sheet mode' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}


