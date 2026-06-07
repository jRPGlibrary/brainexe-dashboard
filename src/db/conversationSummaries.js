const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { extractJson } = require('../utils');

const COLLECTION = 'conversationSummaries';
const TRIGGER_MSGS = 4;
const MAX_SESSIONS = 15;
const MEGA_SUMMARY_TRIGGER = 8;   // générer un méga-résumé après N sessions
const SUMMARY_COOLDOWN_MS = 5 * 60 * 1000;

async function _getDoc(userId, type) {
  if (!shared.mongoDb) return null;
  return shared.mongoDb.collection(COLLECTION).findOne({ userId, type });
}

async function recordInteraction(userId, role, content, type = 'server') {
  if (!shared.mongoDb) return;
  const msg = { role, content: (content || '').slice(0, 300), at: new Date() };
  try {
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId, type },
      {
        $push: { pendingMessages: { $each: [msg], $slice: -20 } },
        $setOnInsert: { userId, type, recentSessions: [], currentSummary: '', topics: [], longTermSummary: '' },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true }
    );
  } catch (e) {
    // E11000 : race condition upsert — retry en plain update (le doc existe déjà)
    if (e.code === 11000) {
      try {
        await shared.mongoDb.collection(COLLECTION).updateOne(
          { userId, type },
          {
            $push: { pendingMessages: { $each: [msg], $slice: -20 } },
            $set: { lastUpdated: new Date() },
          }
        );
      } catch (_) {}
    }
  }
}

async function _generateMegaSummary(userId, type, sessions) {
  if (!shared.mongoDb || sessions.length < MEGA_SUMMARY_TRIGGER) return null;
  try {
    const sessionLines = sessions
      .slice(-MEGA_SUMMARY_TRIGGER)
      .map((s, i) => {
        const d = new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return `${d}: ${s.summary}`;
      })
      .join('\n');

    const { text } = await callClaude(
      'Synthétise en UNE phrase (max 150 chars) l\'essentiel de la relation entre Brainee et cette personne sur la période. Retourne UNIQUEMENT la phrase, sans ponctuation finale ni guillemets.',
      sessionLines.slice(0, 1000),
      80,
      null,
      'claude-haiku-4-5-20251001'
    );

    const longTermSummary = (text || '').slice(0, 160).trim();
    if (longTermSummary) {
      await shared.mongoDb.collection(COLLECTION).updateOne(
        { userId, type },
        { $set: { longTermSummary, longTermSummaryUpdatedAt: new Date() } }
      );
    }
    return longTermSummary;
  } catch (_) {
    return null;
  }
}

async function triggerSummaryIfNeeded(userId, username, type = 'server') {
  if (!shared.mongoDb) return;
  try {
    const doc = await _getDoc(userId, type);
    if (!doc) return;
    const pending = doc.pendingMessages || [];
    if (pending.length < TRIGGER_MSGS) return;
    if (doc.lastSummarizedAt && Date.now() - new Date(doc.lastSummarizedAt).getTime() < SUMMARY_COOLDOWN_MS) return;

    const convo = pending
      .map(m => `${m.role === 'user' ? username : 'Brainee'}: ${m.content}`)
      .join('\n');

    const { text } = await callClaude(
      'Résume en 1-2 phrases max (120 chars) cette conversation Discord entre Brainee et un membre. JSON strict: {"summary":"...","topics":["sujet1","sujet2"]}',
      convo.slice(0, 800),
      130,
      null,
      'claude-haiku-4-5-20251001'
    );

    let summary = '', topics = [];
    try {
      const clean = extractJson(text);
      const parsed = clean ? JSON.parse(clean) : {};
      summary = (parsed.summary || text || '').slice(0, 150);
      topics = (parsed.topics || []).slice(0, 4);
    } catch {
      summary = text.slice(0, 150);
    }

    const session = { date: new Date(), summary, topics };
    const updatedSessions = [...(doc.recentSessions || []), session].slice(-MAX_SESSIONS);

    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId, type },
      {
        $set: { currentSummary: summary, topics, lastSummarizedAt: new Date(), pendingMessages: [], recentSessions: updatedSessions },
      }
    );

    // Déclencher le méga-résumé quand on atteint le seuil (tous les N sessions)
    if (updatedSessions.length >= MEGA_SUMMARY_TRIGGER && updatedSessions.length % MEGA_SUMMARY_TRIGGER === 0) {
      _generateMegaSummary(userId, type, updatedSessions).catch(() => {});
    }

    pushLog('SYS', `📝 Résumé conv → ${username} (${type})`, 'success');
  } catch (err) {
    pushLog('ERR', `convSummary trigger: ${err.message}`, 'error');
  }
}

function formatConvSummaryBlock(doc) {
  if (!doc) return '';
  const parts = [];

  // Méga-résumé long terme (mémoire persistante > 2 semaines)
  if (doc.longTermSummary) {
    parts.push(`[MÉMOIRE LONG TERME] ${doc.longTermSummary}`);
  }

  if (doc.currentSummary) {
    const d = doc.lastSummarizedAt
      ? new Date(doc.lastSummarizedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '?';
    parts.push(`[DERNIÈRE CONV - ${d}] ${doc.currentSummary}`);

    // 4 sessions précédentes condensées (sans la dernière qui est currentSummary)
    const hist = (doc.recentSessions || []).slice(-5, -1).reverse();
    if (hist.length > 0) {
      const histStr = hist.map(s => {
        const hd = new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return `${hd}: ${s.summary}`;
      }).join(' • ');
      parts.push(`[SESSIONS PRÉCÉDENTES] ${histStr}`);
    }
  }

  // Messages non encore résumés
  const pending = (doc.pendingMessages || []).slice(-6);
  if (pending.length > 0) {
    const pendingStr = pending.map(m => `${m.role === 'user' ? 'User' : 'Brainee'}: ${m.content}`).join('\n');
    parts.push(`[ÉCHANGE EN COURS]\n${pendingStr}`);
  }
  return parts.length ? `\n${parts.join('\n')}` : '';
}

async function getConvSummary(userId, type = 'server') {
  const doc = await _getDoc(userId, type);
  return formatConvSummaryBlock(doc);
}

async function cleanupOldPending() {
  if (!shared.mongoDb) return;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    await shared.mongoDb.collection(COLLECTION).updateMany(
      { lastUpdated: { $lt: cutoff } },
      { $set: { pendingMessages: [] } }
    );
  } catch (_) {}
}

module.exports = { recordInteraction, triggerSummaryIfNeeded, getConvSummary, cleanupOldPending };
