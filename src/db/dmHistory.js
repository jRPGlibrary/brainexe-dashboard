const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { extractJson } = require('../utils');

const DM_HISTORY_MAX = 30;
const DM_SUMMARY_TRIGGER = 6;     // résumer après 6 échanges DM (3 échanges complets)
const DM_MAX_SUMMARIES = 10;      // garder 10 résumés DM
const DM_RAW_KEEP = 4;            // toujours garder les N derniers messages bruts
const DM_SUMMARY_COOLDOWN_MS = 3 * 60 * 1000;

async function getDmHistory(userId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('dmHistory').findOne({ userId }); } catch { return null; }
}

async function appendDmMessage(userId, username, role, content) {
  if (!shared.mongoDb) return;
  try {
    const existing = await getDmHistory(userId);
    const messages = existing?.messages ?? [];
    messages.push({ role, content: content.slice(0, 600), timestamp: new Date() });
    const trimmed = messages.slice(-DM_HISTORY_MAX);
    await shared.mongoDb.collection('dmHistory').updateOne(
      { userId },
      { $set: { userId, username, messages: trimmed, lastSeen: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `appendDmMessage échoué : ${err.message}`, 'error'); }
}

async function triggerDmSummaryIfNeeded(userId, username) {
  if (!shared.mongoDb) return;
  try {
    const doc = await getDmHistory(userId);
    if (!doc) return;
    const messages = doc.messages || [];
    if (messages.length < DM_SUMMARY_TRIGGER) return;
    if (doc.lastDmSummarizedAt && Date.now() - new Date(doc.lastDmSummarizedAt).getTime() < DM_SUMMARY_COOLDOWN_MS) return;

    // Prendre les messages non encore résumés (depuis le dernier résumé ou les 12 derniers)
    const toSummarize = messages.slice(-Math.max(DM_SUMMARY_TRIGGER * 2, 12));
    const convo = toSummarize
      .map(m => `${m.role === 'user' ? username : 'Brainee'}: ${m.content}`)
      .join('\n');

    const { text } = await callClaude(
      'Résume en 1-2 phrases (max 140 chars) cet échange DM privé entre Brainee et un membre. JSON strict: {"summary":"...","topics":["sujet1","sujet2"]}',
      convo.slice(0, 1000),
      150,
      null,
      'claude-haiku-4-5-20251001'
    );

    let summary = '', topics = [];
    try {
      const clean = extractJson(text);
      const parsed = clean ? JSON.parse(clean) : {};
      summary = (parsed.summary || text || '').slice(0, 160);
      topics = (parsed.topics || []).slice(0, 4);
    } catch {
      summary = text.slice(0, 160);
    }

    const dmSummaries = [...(doc.dmSummaries || []), { date: new Date(), summary, topics }].slice(-DM_MAX_SUMMARIES);

    // Garder seulement les N derniers messages bruts après résumé
    const recentRaw = messages.slice(-DM_RAW_KEEP);

    await shared.mongoDb.collection('dmHistory').updateOne(
      { userId },
      {
        $set: {
          messages: recentRaw,
          dmSummaries,
          lastDmSummarizedAt: new Date(),
        },
      }
    );
    pushLog('SYS', `📝 Résumé DM → ${username}`, 'success');
  } catch (err) {
    pushLog('ERR', `triggerDmSummaryIfNeeded: ${err.message}`, 'error');
  }
}

function formatDmHistory(history) {
  if (!history) return '';
  const parts = [];

  // Résumés DM condensés (historique des sessions)
  const dmSummaries = history.dmSummaries || [];
  if (dmSummaries.length > 0) {
    const summaryLines = dmSummaries
      .slice(-5)  // les 5 derniers résumés
      .map(s => {
        const d = new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return `${d}: ${s.summary}`;
      })
      .join(' • ');
    parts.push(`[RÉSUMÉS SESSIONS DM] ${summaryLines}`);
  }

  // Derniers messages bruts (contexte immédiat)
  const rawMessages = history.messages || [];
  if (rawMessages.length > 0) {
    const recent = rawMessages
      .slice(-15)
      .map(m => `[${m.role === 'user' ? history.username : 'Brainee'}]: ${m.content}`)
      .join('\n');
    parts.push(recent);
  }

  return parts.join('\n');
}

function getLastBotMessage(history) {
  if (!history?.messages?.length) return null;
  const msgs = [...history.messages].reverse();
  const found = msgs.find(m => m.role === 'assistant');
  return found?.content || null;
}

module.exports = { getDmHistory, appendDmMessage, triggerDmSummaryIfNeeded, formatDmHistory, getLastBotMessage };
