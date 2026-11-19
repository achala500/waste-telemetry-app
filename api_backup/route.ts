import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_FIRESTORE_CONFIG } from '@/lib/firestoreSync';

export const dynamic = 'force-dynamic';

const startTimeEpoch = Date.now();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization'
    }
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const checkLive = url.searchParams.get('live') === 'true';

  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  const telemetryKey =
    process.env.TELEMETRY_API_KEY ||
    'a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8';

  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID ||
    process.env.NEXT_PUBLIC_SPREADSHEET_ID ||
    process.env.SPREADSHEET_ID;

  let sheetsMode: 'apps_script' | 'direct' | 'none' = 'none';
  let sheetsConnected = false;

  if (appsScriptUrl) {
    sheetsMode = 'apps_script';
    sheetsConnected = true;
  } else if (spreadsheetId) {
    sheetsMode = 'direct';
    sheetsConnected = true;
  }

  // Active AI Model detection
  const cascade = [
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'deterministic-statistical-engine'
  ];

  let activeModel = 'deterministic-statistical-engine';
  if (geminiApiKey) {
    activeModel = 'gemini-3.8-flash';
  }

  // Quick live health verification if requested
  let livePingResult: Record<string, unknown> | undefined = undefined;
  if (checkLive && appsScriptUrl) {
    try {
      const pingUrl = new URL(appsScriptUrl);
      pingUrl.searchParams.set('action', 'ping');
      const res = await fetch(pingUrl.toString(), { signal: AbortSignal.timeout(3000) });
      livePingResult = {
        sheetsHttpCode: res.status,
        sheetsOk: res.ok
      };
    } catch (err: any) {
      livePingResult = {
        sheetsError: err.message
      };
    }
  }

  const uptimeSeconds = Math.round((Date.now() - startTimeEpoch) / 1000);

  return NextResponse.json(
    {
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'production',
      services: {
        telemetryApi: {
          status: 'ready',
          authHeaderRequired: 'x-api-key',
          apiKeyConfigured: Boolean(telemetryKey),
          endpoints: [
            'POST /api/telemetry (app_open, app_close, focus_start, focus_end, manual)',
            'GET /api/telemetry (pending sessions & recent blocks)'
          ]
        },
        aiEngine: {
          status: geminiApiKey ? 'active' : 'fallback_ready',
          provider: 'Google Gemini SDK Cascade',
          modelCascade: cascade,
          activeModel,
          apiKeyConfigured: Boolean(geminiApiKey),
          insightsEndpoint: 'GET & POST /api/insights'
        },
        googleSheets: {
          status: sheetsConnected ? 'connected' : 'standby',
          mode: sheetsMode,
          connected: sheetsConnected,
          targetSpreadsheetId: spreadsheetId || 'Auto-generated via Apps Script',
          appsScriptConfigured: Boolean(appsScriptUrl),
          syncEndpoint: 'GET & POST /api/sheets'
        },
        firestore: {
          status: 'ready',
          projectId: DEFAULT_FIRESTORE_CONFIG.projectId,
          collection: DEFAULT_FIRESTORE_CONFIG.collectionName,
          connected: Boolean(DEFAULT_FIRESTORE_CONFIG.projectId && DEFAULT_FIRESTORE_CONFIG.apiKey)
        }
      },
      liveCheck: livePingResult
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
