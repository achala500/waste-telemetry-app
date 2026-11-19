import { NextRequest, NextResponse } from 'next/server';
import { TelemetryPayload, TelemetryBlock } from '@/lib/types';
import { appendSheetRow } from '@/lib/sheetsSync';
import { persistBlockToFirestore } from '@/lib/firestoreSync';

export const dynamic = 'force-dynamic';

const TELEMETRY_API_KEY =
  process.env.TELEMETRY_API_KEY ||
  'a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8';

// In-memory open session tracker for pairing app_open and app_close
const openSessions = new Map<string, { startTime: number; label: string; category?: string; tag?: string }>();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key');
    if (!apiKey || apiKey !== TELEMETRY_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid x-api-key header' },
        { status: 401 }
      );
    }

    const body: TelemetryPayload = await request.json();
    const now = body.timestamp ? new Date(body.timestamp) : new Date();
    const nowIso = now.toISOString();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = nowIso.split('T')[0];

    const labelLower = (body.label || '').toLowerCase();
    const isDistraction =
      body.category === 'wasted' ||
      ['instagram', 'reels', 'tiktok', 'youtube', 'shorts', 'twitter', 'x', 'reddit', 'gaming'].some((app) =>
        labelLower.includes(app)
      );

    let recordedBlock: TelemetryBlock | null = null;

    if (body.event === 'app_open') {
      openSessions.set(body.label, {
        startTime: now.getTime(),
        label: body.label,
        category: body.category || (isDistraction ? 'wasted' : 'necessary'),
        tag: body.tag || (isDistraction ? 'Doomscrolling' : 'App Usage')
      });

      return NextResponse.json({
        success: true,
        status: 'session_opened',
        label: body.label,
        openAt: nowIso
      });
    }

    if (body.event === 'app_close') {
      const existing = openSessions.get(body.label);
      const startMs = existing?.startTime || now.getTime() - (body.durationMinutes || 15) * 60 * 1000;
      const computedDuration = Math.max(1, Math.round((now.getTime() - startMs) / 60000));
      openSessions.delete(body.label);

      const startTimeObj = new Date(startMs);
      const startTimeStr = `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`;

      recordedBlock = {
        id: `shortcut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        label: body.label,
        title: body.label,
        category: (existing?.category || (isDistraction ? 'wasted' : 'neutral')) as any,
        tag: existing?.tag || (isDistraction ? 'Distraction Spiral' : 'App Usage'),
        startTime: startTimeStr,
        endTime: timeStr,
        durationMinutes: computedDuration,
        date: dateStr,
        source: 'shortcut',
        createdAt: nowIso
      };
    } else {
      // manual or focus_start/end
      const dur = body.durationMinutes || 25;
      const startMs = now.getTime() - dur * 60 * 1000;
      const startObj = new Date(startMs);
      const startTimeStr = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`;
      const labelText = body.label || (body.event === 'focus_end' ? 'Deep Focus Session' : 'Quick Log');

      recordedBlock = {
        id: `telemetry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        label: labelText,
        title: labelText,
        category: (body.category || (body.event === 'focus_end' ? 'focus' : isDistraction ? 'wasted' : 'neutral')) as any,
        tag: body.tag || (body.event === 'focus_end' ? 'Deep Work' : isDistraction ? 'Scrolling' : 'Routine'),
        startTime: startTimeStr,
        endTime: timeStr,
        durationMinutes: dur,
        date: dateStr,
        source: body.event === 'focus_end' ? 'stopwatch' : 'shortcut',
        createdAt: nowIso
      };
    }

    if (recordedBlock) {
      // Write-through to Google Sheets & Firestore concurrently
      await Promise.allSettled([
        appendSheetRow(recordedBlock),
        persistBlockToFirestore(recordedBlock)
      ]);
    }

    return NextResponse.json({
      success: true,
      event: body.event,
      block: recordedBlock
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
