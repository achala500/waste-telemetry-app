import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, fetchSheetBlocks, generateAppsScriptCode } from '@/lib/sheetsSync';
import { TelemetryBlock } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    }
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'template') {
    return NextResponse.json({
      success: true,
      code: generateAppsScriptCode()
    });
  }

  const spreadsheetId = url.searchParams.get('spreadsheetId') || undefined;
  const blocks = await fetchSheetBlocks(spreadsheetId);

  return NextResponse.json({
    success: true,
    count: blocks.length,
    blocks
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const block: TelemetryBlock = body.block || body;

    if (!block || (!block.label && !block.title)) {
      return NextResponse.json({ error: 'Missing block payload' }, { status: 400 });
    }

    const success = await appendSheetRow(block);
    return NextResponse.json({ success, blockId: block.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sync with Google Sheets', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
