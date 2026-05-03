/**
 * ================================================
 * 📚 MEMBER STORIES v0.8.0
 * ================================================
 * Mémoire narrative PAR MEMBRE — complément à narrativeMemory (global)
 *
 * Pour chaque membre, on track des "stories" persistantes :
 *   - quest    : question/recherche en cours ("je cherche un metroidvania chill")
 *   - project  : ce sur quoi la personne est ("je joue à BG3 en ce moment")
 *   - joke     : running gag entre Brainee et la personne
 *   - fact     : fait notable ("a fini Elden Ring 4 fois")
 *   - concern  : préoccupation/galère ("galère au boulot")
 *
 * Permet à Brainee de :
 *   - Faire des callbacks naturels ("au fait t'as trouvé ton metroidvania ?")
 *   - Reprendre des conversations ouvertes
 *   - Référencer des inside jokes
 *   - Sentir l'évolution de la personne dans le temps
 *
 * Decay :
 *   - quest/project : 30 jours sans rappel → archive
 *   - joke          : 60 jours
 *   - fact          : permanent (sauf override manuel)
 *   - concern       : 21 jours sans rappel → archive
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

const COLLECTION = 'memberStories';
const MAX_ACTIVE_STORIES = 12;

const DECAY_DAYS = {
  quest: 30,
  project: 30,
  joke: 60,
  fact: 365,
  concern: 21,
};

// ─── DÉTECTION AUTO DEPUIS UN MESSAGE ────────────────────────────
// Renvoie une liste de stories candidates. La décision finale (insert ou skip)
// reste à l'appelant pour éviter de saturer la base sur le moindre message.
function detectStoriesFromMessage(content = '') {
  const text = (content || '').trim();
  if (text.length < 12) return [];
  const lower = text.toLowerCase();
  const candidates = [];

  // QUEST — recherche/question ouverte
  const questPatterns = [
    /\bje cherche (?:un|une|des) ([^.!?\n]{4,80})/i,
    /\b(?:tu connais|t'aurais|vous connaissez)(?: un| une| des)? ([^.!?\n]{4,80})\?/i,
    /\b(?:vous|on) me conseille (?:quoi|un|une) ([^.!?\n]{4,80})/i,
    /\bje galère (?:avec|sur|à) ([^.!?\n]{4,80})/i,
    /\bj'arrive pas à ([^.!?\n]{4,80})/i,
  ];
  for (const re of questPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      candidates.push({ type: 'quest', content: m[1].trim().replace(/[,;]$/, ''), confidence: 0.7 });
      break;
    }
  }

  // PROJECT — ce sur quoi la personne est
  const projectPatterns = [
    /\bje (?:joue|suis) (?:à|sur) ([^.!?\n]{3,60})/i,
    /\bje viens de (?:commencer|lancer|reprendre) ([^.!?\n]{3,60})/i,
    /\bje refais ([^.!?\n]{3,60})/i,
    /\bje rush ([^.!?\n]{3,60})/i,
  ];
  for (const re of projectPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      candidates.push({ type: 'project', content: m[1].trim().replace(/[,;]$/, ''), confidence: 0.8 });
      break;
    }
  }

  // FACT — accomplissement notable
  const factPatterns = [
    /\bj'ai fini ([^.!?\n]{3,60})/i,
    /\bj'ai platiné ([^.!?\n]{3,60})/i,
    /\bj'ai (?:enfin )?(?:terminé|complété) ([^.!?\n]{3,60})/i,
  ];
  for (const re of factPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      candidates.push({ type: 'fact', content: `a fini ${m[1].trim().replace(/[,;]$/, '')}`, confidence: 0.85 });
      break;
    }
  }

  // CONCERN — préoccupation
  const concernSignals = [
    'fatigué', 'fatiguée', 'crevé', 'crevée', 'épuisé', 'épuisée',
    'stress', 'anxieux', 'anxieuse', 'pas le moral', 'pas la forme',
    'galère au', 'difficile en ce moment', 'trop de boulot', 'burnout',
  ];
  if (concernSignals.some(s => lower.includes(s)) && text.length > 25 && text.length < 240) {
    candidates.push({
      type: 'concern',
      content: text.slice(0, 140),
      confidence: 0.5,
    });
  }

  return candidates;
}

// ─── CRUD ────────────────────────────────────────────────────────
async function getMemberStories(userId) {
  if (!shared.mongoDb) return [];
  try {
    const doc = await shared.mongoDb.collection(COLLECTION).findOne({ userId });
    if (!doc || !Array.isArray(doc.stories)) return [];
    return doc.stories.filter(s => s.status !== 'archived');
  } catch (err) {
    pushLog('ERR', `getMemberStories: ${err.message}`, 'error');
    return [];
  }
}

async function addMemberStory(userId, username, story) {
  if (!shared.mongoDb) return null;
  if (!story || !story.type || !story.content) return null;
  try {
    const now = new Date();
    const newStory = {
      id: `${userId}_${now.getTime()}_${Math.floor(Math.random() * 1000)}`,
      type: story.type,
      content: story.content.slice(0, 200),
      createdAt: now,
      lastMentioned: now,
      importance: Math.max(1, Math.min(5, story.importance || 2)),
      status: 'active',
    };

    // Dedup : si une story du même type avec contenu très similaire existe → on rafraîchit lastMentioned
    const existing = await shared.mongoDb.collection(COLLECTION).findOne({ userId });
    if (existing && Array.isArray(existing.stories)) {
      const similar = existing.stories.find(s =>
        s.status === 'active' &&
        s.type === newStory.type &&
        similarity(s.content, newStory.content) > 0.7
      );
      if (similar) {
        await shared.mongoDb.collection(COLLECTION).updateOne(
          { userId, 'stories.id': similar.id },
          { $set: { 'stories.$.lastMentioned': now, username } }
        );
        return similar;
      }
    }

    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId },
      {
        $set: { username, updatedAt: now },
        $push: { stories: newStory },
      },
      { upsert: true }
    );

    // Cap : garde les MAX_ACTIVE_STORIES plus récentes actives
    await trimStories(userId);

    pushLog('SYS', `📚 Story (${newStory.type}) → ${username} : "${newStory.content.slice(0, 60)}"`);
    return newStory;
  } catch (err) {
    pushLog('ERR', `addMemberStory: ${err.message}`, 'error');
    return null;
  }
}

async function closeMemberStory(userId, storyId) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId, 'stories.id': storyId },
      { $set: { 'stories.$.status': 'closed', 'stories.$.closedAt': new Date() } }
    );
  } catch (err) {
    pushLog('ERR', `closeMemberStory: ${err.message}`, 'error');
  }
}

async function trimStories(userId) {
  if (!shared.mongoDb) return;
  const doc = await shared.mongoDb.collection(COLLECTION).findOne({ userId });
  if (!doc || !Array.isArray(doc.stories)) return;
  const active = doc.stories.filter(s => s.status === 'active');
  if (active.length <= MAX_ACTIVE_STORIES) return;
  const sorted = active.sort((a, b) => new Date(b.lastMentioned) - new Date(a.lastMentioned));
  const toArchive = sorted.slice(MAX_ACTIVE_STORIES).map(s => s.id);
  await shared.mongoDb.collection(COLLECTION).updateOne(
    { userId },
    { $set: { stories: doc.stories.map(s => toArchive.includes(s.id) ? { ...s, status: 'archived' } : s) } }
  );
}

// ─── DECAY GLOBAL ────────────────────────────────────────────────
async function runStoriesDecay() {
  if (!shared.mongoDb) return;
  try {
    const all = await shared.mongoDb.collection(COLLECTION).find({}).toArray();
    let archived = 0;
    const now = Date.now();
    for (const doc of all) {
      if (!Array.isArray(doc.stories)) continue;
      let changed = false;
      const updated = doc.stories.map(s => {
        if (s.status !== 'active') return s;
        const days = (now - new Date(s.lastMentioned).getTime()) / (1000 * 60 * 60 * 24);
        const limit = DECAY_DAYS[s.type] || 30;
        if (days > limit) {
          changed = true;
          archived++;
          return { ...s, status: 'archived', archivedAt: new Date() };
        }
        return s;
      });
      if (changed) {
        await shared.mongoDb.collection(COLLECTION).updateOne(
          { userId: doc.userId },
          { $set: { stories: updated } }
        );
      }
    }
    if (archived) pushLog('SYS', `📚 Stories decay : ${archived} archivées`, 'info');
  } catch (err) {
    pushLog('ERR', `runStoriesDecay: ${err.message}`, 'error');
  }
}

async function touchStory(userId, storyId) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId, 'stories.id': storyId },
      { $set: { 'stories.$.lastMentioned': new Date() } }
    );
  } catch (_) {}
}

// ─── FORMAT POUR PROMPT ──────────────────────────────────────────
function formatStoriesBlock(stories, username) {
  if (!Array.isArray(stories) || stories.length === 0) return '';

  // On regroupe par type, on prend les plus récentes/importantes
  const byType = {};
  for (const s of stories) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s);
  }

  const lines = [];
  const labels = {
    quest: '🔍 Cherche / questions ouvertes',
    project: '🎮 En cours',
    joke: '😂 Running gags',
    fact: '🏆 Faits marquants',
    concern: '💭 Préoccupations récentes',
  };

  ['quest', 'project', 'concern', 'joke', 'fact'].forEach(type => {
    const items = byType[type];
    if (!items || !items.length) return;
    const top = items
      .sort((a, b) => new Date(b.lastMentioned) - new Date(a.lastMentioned))
      .slice(0, 3);
    const formatted = top.map(s => `   • ${s.content}`).join('\n');
    lines.push(`${labels[type]} :\n${formatted}`);
  });

  if (!lines.length) return '';

  return `📚 CE QUE TU SAIS DE ${username.toUpperCase()} (mémoire narrative) :
${lines.join('\n')}
RÈGLE : tu peux référencer ces éléments NATURELLEMENT si pertinent ("au fait t'as trouvé ton..."), mais JAMAIS faire un état des lieux. Tu choisis si ça colle au moment.`;
}

// ─── HELPER : SIMILARITÉ TEXTE (très basique, jaccard sur mots) ─
function similarity(a, b) {
  const wa = new Set((a || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const wb = new Set((b || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  const inter = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return inter / union;
}

module.exports = {
  detectStoriesFromMessage,
  getMemberStories,
  addMemberStory,
  closeMemberStory,
  touchStory,
  runStoriesDecay,
  formatStoriesBlock,
};
