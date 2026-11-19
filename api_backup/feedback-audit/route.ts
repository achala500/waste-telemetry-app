import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { ticket } = await request.json();
    if (!ticket || !ticket.description) {
      return NextResponse.json({ error: 'Missing feedback ticket payload' }, { status: 400 });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Deterministic classification if API key absent
      const lower = ticket.description.toLowerCase();
      const isBug = lower.includes('bug') || lower.includes('error') || lower.includes('fail') || lower.includes('crash');
      return NextResponse.json({
        classification: isBug ? 'Bug' : 'UX',
        priority: isBug ? 'HIGH' : 'NORMAL',
        isSpam: false,
        isDuplicate: false,
        summary: 'Analyzed via rule engine.'
      });
    }

    const prompt = `You are the lead engineering auditor for Chrono Telemetry.
Audit this student user feedback and respond with strictly valid JSON:
{
  "classification": "Bug" | "Feature" | "UX" | "Spam",
  "priority": "CRITICAL" | "HIGH" | "NORMAL",
  "isSpam": boolean,
  "isDuplicate": boolean,
  "summary": "1 sentence clear technical summary"
}

Description: "${ticket.description}"
Category Tag: "${ticket.category || 'ux'}"
Page URL: "${ticket.pageUrl || '/'}"`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      }
    }

    return NextResponse.json({
      classification: ticket.category === 'bug' ? 'Bug' : 'UX',
      priority: 'NORMAL',
      isSpam: false,
      isDuplicate: false,
      summary: 'Audited and queued for next release.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Auto-audit failed' }, { status: 500 });
  }
}
