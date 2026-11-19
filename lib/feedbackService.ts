/**
 * Feedback Management & Auto-Audit Pipeline
 * Powered by Gemini 3.8 Flash & Firestore
 */

import { FeedbackTicket, AuditRecord, ChangelogEntry } from './types';
import { DEFAULT_FIRESTORE_CONFIG } from './firestoreSync';

const FEEDBACK_COLLECTION = 'feedback';
const CHANGELOG_COLLECTION = 'changelog_entries';

/**
 * Save feedback submission directly to Firestore and trigger auto-audit
 */
export async function submitFeedbackTicket(ticket: {
  category: 'bug' | 'feature' | 'ux' | 'other';
  description: string;
  pageUrl?: string;
  annotatedScreenshotUrl?: string;
  userEmail?: string;
  userName?: string;
}): Promise<FeedbackTicket> {
  const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newTicket: FeedbackTicket = {
    id,
    pageUrl: ticket.pageUrl || (typeof window !== 'undefined' ? window.location.href : '/'),
    timestamp: now,
    userEmail: ticket.userEmail || 'anonymous',
    userName: ticket.userName || 'Student User',
    category: ticket.category,
    description: ticket.description,
    annotatedScreenshotUrl: ticket.annotatedScreenshotUrl,
    status: 'NEW',
    priority: 'NORMAL',
    classification: ticket.category === 'bug' ? 'Bug' : ticket.category === 'feature' ? 'Feature' : 'UX',
    isSpam: false,
    isDuplicate: false,
    auditHistory: [
      {
        id: `aud_${Date.now()}`,
        timestamp: now,
        fromStatus: 'NONE',
        toStatus: 'NEW',
        author: ticket.userEmail || 'Student User',
        note: 'Ticket submitted via Visual Feedback Studio'
      }
    ]
  };

  // 1. Save to Firestore REST API
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${FEEDBACK_COLLECTION}/${id}?key=${config.apiKey}`;
    
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: newTicket.id },
          pageUrl: { stringValue: newTicket.pageUrl },
          timestamp: { stringValue: newTicket.timestamp },
          userEmail: { stringValue: newTicket.userEmail || '' },
          userName: { stringValue: newTicket.userName || '' },
          category: { stringValue: newTicket.category },
          description: { stringValue: newTicket.description },
          status: { stringValue: newTicket.status },
          priority: { stringValue: newTicket.priority },
          classification: { stringValue: newTicket.classification },
          isSpam: { booleanValue: false },
          isDuplicate: { booleanValue: false },
          rawAuditJson: { stringValue: JSON.stringify(newTicket.auditHistory) }
        }
      })
    });
  } catch (err) {
    console.warn('[FeedbackService] Firestore save notice:', err);
  }

  // 2. Cache in localStorage for immediate offline resilience
  try {
    const existing = JSON.parse(localStorage.getItem('chrono_local_feedback') || '[]');
    localStorage.setItem('chrono_local_feedback', JSON.stringify([newTicket, ...existing]));
  } catch {}

  // 3. Trigger Gemini 3.8 Flash auto-audit asynchronously
  auditFeedbackWithGemini(newTicket).catch(() => {});

  return newTicket;
}

/**
 * Auto-audit feedback ticket using Gemini 3.8 Flash
 */
export async function auditFeedbackWithGemini(ticket: FeedbackTicket): Promise<FeedbackTicket> {
  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    DEFAULT_FIRESTORE_CONFIG.apiKey;

  try {
    const prompt = `You are the lead engineering auditor for Chrono Telemetry.
Audit this student user feedback and respond with strictly valid JSON:
{
  "classification": "Bug" | "Feature" | "UX" | "Spam",
  "priority": "CRITICAL" | "HIGH" | "NORMAL",
  "isSpam": boolean,
  "isDuplicate": boolean,
  "summary": "Brief 1-sentence technical synthesis"
}

Feedback Description: "${ticket.description}"
Category Tag: "${ticket.category}"
Page: "${ticket.pageUrl}"`;

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
        ticket.classification = parsed.classification || ticket.classification;
        ticket.priority = parsed.priority || 'NORMAL';
        ticket.isSpam = !!parsed.isSpam;
        ticket.isDuplicate = !!parsed.isDuplicate;
        ticket.status = ticket.isSpam ? 'AUDITED' : 'AUDITED';
        ticket.aiNotes = parsed.summary || '';

        ticket.auditHistory.push({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          fromStatus: 'NEW',
          toStatus: 'AUDITED',
          author: 'Gemini 3.8 Flash (Auto-Audit)',
          note: `Classified as ${ticket.classification} (${ticket.priority} Priority). ${parsed.summary || ''}`
        });

        // Update Firestore
        try {
          const config = DEFAULT_FIRESTORE_CONFIG;
          const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${FEEDBACK_COLLECTION}/${ticket.id}?key=${config.apiKey}`;
          await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                id: { stringValue: ticket.id },
                pageUrl: { stringValue: ticket.pageUrl },
                timestamp: { stringValue: ticket.timestamp },
                userEmail: { stringValue: ticket.userEmail || '' },
                category: { stringValue: ticket.category },
                description: { stringValue: ticket.description },
                status: { stringValue: ticket.status },
                priority: { stringValue: ticket.priority },
                classification: { stringValue: ticket.classification },
                isSpam: { booleanValue: ticket.isSpam },
                isDuplicate: { booleanValue: ticket.isDuplicate },
                aiNotes: { stringValue: ticket.aiNotes || '' },
                rawAuditJson: { stringValue: JSON.stringify(ticket.auditHistory) }
              }
            })
          });
        } catch {}

        // Update localStorage
        try {
          const existing: FeedbackTicket[] = JSON.parse(localStorage.getItem('chrono_local_feedback') || '[]');
          const updated = existing.map((t) => (t.id === ticket.id ? ticket : t));
          localStorage.setItem('chrono_local_feedback', JSON.stringify(updated));
        } catch {}
      }
    }
  } catch (e) {
    // Graceful fallback audit
    ticket.status = 'AUDITED';
    ticket.priority = ticket.description.toLowerCase().includes('crash') || ticket.description.toLowerCase().includes('lost') ? 'HIGH' : 'NORMAL';
  }

  return ticket;
}

/**
 * Fetch all feedback tickets from Firestore with local fallback
 */
export async function fetchAllFeedbackTickets(): Promise<FeedbackTicket[]> {
  const config = DEFAULT_FIRESTORE_CONFIG;
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${FEEDBACK_COLLECTION}?pageSize=100&key=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const docs = json.documents || [];
      const tickets: FeedbackTicket[] = docs.map((d: any) => {
        const f = d.fields || {};
        let audit: AuditRecord[] = [];
        try {
          if (f.rawAuditJson?.stringValue) {
            audit = JSON.parse(f.rawAuditJson.stringValue);
          }
        } catch {}

        return {
          id: f.id?.stringValue || d.name.split('/').pop(),
          pageUrl: f.pageUrl?.stringValue || '/',
          timestamp: f.timestamp?.stringValue || new Date().toISOString(),
          userEmail: f.userEmail?.stringValue,
          userName: f.userName?.stringValue,
          category: (f.category?.stringValue || 'ux') as any,
          description: f.description?.stringValue || '',
          annotatedScreenshotUrl: f.annotatedScreenshotUrl?.stringValue,
          status: (f.status?.stringValue || 'NEW') as any,
          priority: (f.priority?.stringValue || 'NORMAL') as any,
          classification: f.classification?.stringValue as any,
          isSpam: !!f.isSpam?.booleanValue,
          isDuplicate: !!f.isDuplicate?.booleanValue,
          aiNotes: f.aiNotes?.stringValue,
          auditHistory: audit
        };
      });

      if (tickets.length > 0) {
        return tickets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    }
  } catch {}

  // Fallback to local
  try {
    const local = JSON.parse(localStorage.getItem('chrono_local_feedback') || '[]');
    return local;
  } catch {
    return [];
  }
}

/**
 * Transition ticket status (New -> Audited -> In Progress -> Fixed -> Released)
 */
export async function updateFeedbackTicketStatus(
  ticketId: string,
  newStatus: FeedbackTicket['status'],
  note: string,
  author = 'Admin'
): Promise<boolean> {
  const tickets = await fetchAllFeedbackTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return false;

  const previousStatus = ticket.status;
  ticket.status = newStatus;
  ticket.auditHistory.push({
    id: `aud_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromStatus: previousStatus,
    toStatus: newStatus,
    author,
    note
  });

  // Sync to Firestore
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${FEEDBACK_COLLECTION}/${ticketId}?key=${config.apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: ticket.id },
          pageUrl: { stringValue: ticket.pageUrl },
          timestamp: { stringValue: ticket.timestamp },
          userEmail: { stringValue: ticket.userEmail || '' },
          category: { stringValue: ticket.category },
          description: { stringValue: ticket.description },
          status: { stringValue: ticket.status },
          priority: { stringValue: ticket.priority },
          classification: { stringValue: ticket.classification || 'UX' },
          isSpam: { booleanValue: ticket.isSpam || false },
          isDuplicate: { booleanValue: ticket.isDuplicate || false },
          aiNotes: { stringValue: ticket.aiNotes || '' },
          rawAuditJson: { stringValue: JSON.stringify(ticket.auditHistory) }
        }
      })
    });
  } catch {}

  // Update local storage
  try {
    const updated = tickets.map((t) => (t.id === ticketId ? ticket : t));
    localStorage.setItem('chrono_local_feedback', JSON.stringify(updated));
  } catch {}

  return true;
}

/**
 * Auto Changelog Sync on Release:
 * Takes fixed tickets, calls Gemini 3.8 Flash to strip all internal jargon/ticket IDs,
 * generates clean user-facing release notes, publishes to changelog, and marks tickets as RELEASED.
 */
export async function publishReleaseFromFixedTickets(
  fixedTickets: FeedbackTicket[],
  version: string
): Promise<ChangelogEntry> {
  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    DEFAULT_FIRESTORE_CONFIG.apiKey;

  const sanitizedInputs = fixedTickets.map((t) => ({
    category: t.category,
    summary: t.aiNotes || t.description
  }));

  let headline = 'Performance & Student Focus Upgrade';
  let plainEnglishSummary = 'This release includes verified stability fixes, enhanced student study tools, and precision time tracking.';
  let shippedFixes = fixedTickets.map((t) => ({
    title: t.classification || 'System Polish',
    description: t.description,
    tag: (t.category === 'bug' ? 'Fix' : t.category === 'feature' ? 'Feature' : 'UX') as any
  }));

  try {
    const prompt = `You are the lead product copywriter at Chrono (Apple HIG standard, clear, inspiring, zero jargon).
Transform these resolved tickets into polished, user-facing release notes for version ${version}.
CRITICAL RULES:
- NEVER mention ticket IDs (like FB-112), database names, sheets, internal swarms, or technical jargon.
- Format strictly as JSON matching this schema:
{
  "headline": "Inspiring 4-7 word title",
  "plainEnglishSummary": "2-sentence warm summary of benefits to students and power users",
  "highlights": [
    { "title": "Feature or Fix Title", "description": "1 sentence clear description", "tag": "Fix" | "UX" | "Feature" }
  ]
}

Items resolved: ${JSON.stringify(sanitizedInputs)}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.headline) headline = parsed.headline;
        if (parsed.plainEnglishSummary) plainEnglishSummary = parsed.plainEnglishSummary;
        if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
          shippedFixes = parsed.highlights;
        }
      }
    }
  } catch (err) {
    console.warn('[ReleasePipeline] Gemini release generation fallback:', err);
  }

  const newEntry: ChangelogEntry = {
    version,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    headline,
    plainEnglishSummary,
    fixedFeedbackIds: [], // internal IDs stripped
    tag: 'minor',
    isLatest: true,
    shippedFixes: shippedFixes.filter((f) => f.tag === 'Fix'),
    uxRefinements: shippedFixes.filter((f) => f.tag === 'UX'),
    communityFeatures: shippedFixes.filter((f) => f.tag === 'Feature')
  };

  // Mark all fixed tickets as RELEASED
  for (const t of fixedTickets) {
    await updateFeedbackTicketStatus(
      t.id,
      'RELEASED',
      `Shipped in production release ${version}`,
      'Gemini Release Pipeline'
    );
  }

  // Save entry in localStorage
  try {
    const existing = JSON.parse(localStorage.getItem('chrono_dynamic_changelog') || '[]');
    localStorage.setItem('chrono_dynamic_changelog', JSON.stringify([newEntry, ...existing]));
  } catch {}

  // Save entry to Firestore
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${CHANGELOG_COLLECTION}/${version.replace(/\./g, '_')}?key=${config.apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          version: { stringValue: newEntry.version },
          date: { stringValue: newEntry.date },
          headline: { stringValue: newEntry.headline },
          plainEnglishSummary: { stringValue: newEntry.plainEnglishSummary },
          tag: { stringValue: newEntry.tag },
          isLatest: { booleanValue: true },
          rawJson: { stringValue: JSON.stringify({
            shippedFixes: newEntry.shippedFixes,
            uxRefinements: newEntry.uxRefinements,
            communityFeatures: newEntry.communityFeatures
          })}
        }
      })
    });
  } catch {}

  return newEntry;
}

/**
 * Fetch real published changelog entries from Firestore
 */
export async function fetchChangelogEntries(): Promise<ChangelogEntry[]> {
  try {
    const config = DEFAULT_FIRESTORE_CONFIG;
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${CHANGELOG_COLLECTION}?pageSize=50&key=${config.apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      if (docs.length > 0) {
        return docs.map((d: any) => {
          const f = d.fields || {};
          let rawJson: any = {};
          try {
            if (f.rawJson?.stringValue) {
              rawJson = JSON.parse(f.rawJson.stringValue);
            }
          } catch {}
          return {
            version: f.version?.stringValue || 'v1.5.0',
            date: f.date?.stringValue || '',
            headline: f.headline?.stringValue || 'Release Notes',
            plainEnglishSummary: f.plainEnglishSummary?.stringValue || '',
            fixedFeedbackIds: [],
            tag: (f.tag?.stringValue || 'minor') as any,
            isLatest: !!f.isLatest?.booleanValue,
            shippedFixes: rawJson.shippedFixes || [],
            uxRefinements: rawJson.uxRefinements || [],
            communityFeatures: rawJson.communityFeatures || []
          };
        });
      }
    }
  } catch {}

  // Fallback to local cache
  try {
    const local = JSON.parse(localStorage.getItem('chrono_dynamic_changelog') || '[]');
    return local;
  } catch {
    return [];
  }
}
