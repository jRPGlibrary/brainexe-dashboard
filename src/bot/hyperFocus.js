/**
 * ================================================
 * 🎯 HYPER-FOCUS v0.8.1
 * ================================================
 * Certains sujets attrapent Brainee plus que d'autres : ses obsessions.
 * Quand l'un d'eux est mentionné par quelqu'un, on enregistre une "obsession active"
 * qui peut :
 *   - Booster sa stimulation interne
 *   - Donner envie de revenir sur le sujet 2-12h plus tard
 *   - Pousser vers un retour différé spontané ("attends j'ai repensé à ce que tu disais sur X")
 *
 * Ne crée PAS un retour systématique : il y a une probabilité, une vibe à respecter,
 * et un cooldown pour ne pas saturer la même personne.
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

// Sujets qui attrapent Brainee (conformes à sa persona)
const HYPER_FOCUS_TOPICS = [
  // JRPG / lore
  { key: 'jrpg_lore', patterns: [/\b(persona|final fantasy|chrono|xenoblade|dragon quest|tales of|fire emblem|star ocean)\b/i, /\b(lore|théorie|theorie|background|mythologie)\b/i] },
  // Metroidvania
  { key: 'metroidvania', patterns: [/\b(metroidvania|castlevania|metroid|hollow knight|blasphemous|bloodstained|symphony of the night|super metroid)\b/i] },
  // Soulslike
  { key: 'soulslike', patterns: [/\b(soulslike|dark souls|elden ring|sekiro|bloodborne|nioh|lies of p)\b/i] },
  // OST gaming
  { key: 'ost', patterns: [/\b(ost|soundtrack|musique de jeu|uematsu|mitsuda|yamane|kondo|kenji ito)\b/i] },
  // Game design / mechanics
  { key: 'mechanics', patterns: [/\b(game design|gamedesign|mécaniques?|mechanique|boucle de gameplay|game feel|gunfeel)\b/i] },
  // Hidden gems
  { key: 'hidden_gems', patterns: [/\b(hidden gem|underrated|méconnu|oublié|caché|sous-coté)\b/i] },
  // Indie dev / solo
  { key: 'indie_solo', patterns: [/\b(dev solo|solo dev|kickstarter|jeu indé|indé indé|small studio)\b/i] },
  // Sci-fi narrative
  { key: 'scifi', patterns: [/\b(blade runner|matrix|ghost in the shell|akira|ex machina|interstellar|dune)\b/i] },
];

const COLLECTION = 'hyperFocusObsessions';
const MAX_ACTIVE = 6;
const REVISIT_MIN_HOURS = 2;
const REVISIT_MAX_HOURS = 14;

// ─── DÉTECTION DEPUIS UN MESSAGE ────────────────────────────────
function detectHyperFocusTopic(content = '') {
  const text = (content || '').toLowerCase();
  if (text.length < 8) return null;
  for (const topic of HYPER_FOCUS_TOPICS) {
    if (topic.patterns.some(re => re.test(text))) {
      return topic.key;
    }
  }
  return null;
}

// ─── ENREGISTREMENT D'UNE OBSESSION ─────────────────────────────
async function registerObsession({ topic, sourceUserId, sourceUsername, sourceChannelId, sourceMessageContent }) {
  if (!shared.mongoDb || !topic) return null;
  try {
    const now = new Date();
    const revisitDelayHours = REVISIT_MIN_HOURS + Math.random() * (REVISIT_MAX_HOURS - REVISIT_MIN_HOURS);
    const revisitAt = new Date(now.getTime() + revisitDelayHours * 60 * 60 * 1000);

    const obsession = {
      topic,
      sourceUserId,
      sourceUsername,
      sourceChannelId,
      snippet: (sourceMessageContent || '').slice(0, 200),
      createdAt: now,
      revisitAt,
      revisited: false,
      status: 'active',
    };

    // Dedup : si la même topic est déjà active depuis ce user, on rafraîchit
    const existing = await shared.mongoDb.collection(COLLECTION).findOne({
      topic, sourceUserId, status: 'active',
    });
    if (existing) {
      await shared.mongoDb.collection(COLLECTION).updateOne(
        { _id: existing._id },
        { $set: { snippet: obsession.snippet, sourceChannelId, createdAt: now } }
      );
      return existing;
    }

    await shared.mongoDb.collection(COLLECTION).insertOne(obsession);
    await trimActive();
    pushLog('SYS', `🎯 Obsession enregistrée (${topic}) ← ${sourceUsername} (revisit dans ~${Math.round(revisitDelayHours)}h)`);
    return obsession;
  } catch (err) {
    pushLog('ERR', `registerObsession: ${err.message}`, 'error');
    return null;
  }
}

async function trimActive() {
  if (!shared.mongoDb) return;
  const active = await shared.mongoDb.collection(COLLECTION)
    .find({ status: 'active' })
    .sort({ createdAt: -1 })
    .toArray();
  if (active.length <= MAX_ACTIVE) return;
  const toExpire = active.slice(MAX_ACTIVE).map(o => o._id);
  await shared.mongoDb.collection(COLLECTION).updateMany(
    { _id: { $in: toExpire } },
    { $set: { status: 'expired', expiredAt: new Date() } }
  );
}

// ─── OBSESSIONS PRÊTES À ÊTRE REVISITÉES ────────────────────────
async function getDueObsessions() {
  if (!shared.mongoDb) return [];
  try {
    return await shared.mongoDb.collection(COLLECTION)
      .find({ status: 'active', revisited: false, revisitAt: { $lte: new Date() } })
      .sort({ revisitAt: 1 })
      .toArray();
  } catch (err) {
    pushLog('ERR', `getDueObsessions: ${err.message}`, 'error');
    return [];
  }
}

async function markObsessionRevisited(id) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { _id: id },
      { $set: { revisited: true, revisitedAt: new Date(), status: 'closed' } }
    );
  } catch (err) {
    pushLog('ERR', `markObsessionRevisited: ${err.message}`, 'error');
  }
}

// ─── DECAY : obsessions trop vieilles → expired ─────────────────
async function runHyperFocusDecay() {
  if (!shared.mongoDb) return;
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const r = await shared.mongoDb.collection(COLLECTION).updateMany(
      { status: 'active', revisited: false, createdAt: { $lt: cutoff } },
      { $set: { status: 'expired', expiredAt: new Date() } }
    );
    if (r.modifiedCount) pushLog('SYS', `🎯 Hyper-focus decay : ${r.modifiedCount} obsessions expirées`, 'info');
  } catch (err) {
    pushLog('ERR', `runHyperFocusDecay: ${err.message}`, 'error');
  }
}

// ─── INTERFACE PUBLIQUE ─────────────────────────────────────────
const TOPIC_LABELS = {
  jrpg_lore: 'le lore JRPG',
  metroidvania: 'les metroidvania',
  soulslike: 'les soulslike',
  ost: "les OST de jeu",
  mechanics: 'le game design',
  hidden_gems: 'les hidden gems',
  indie_solo: 'le dev indé / solo',
  scifi: 'la sci-fi',
};

function describeTopic(topic) {
  return TOPIC_LABELS[topic] || topic;
}

module.exports = {
  HYPER_FOCUS_TOPICS,
  detectHyperFocusTopic,
  registerObsession,
  getDueObsessions,
  markObsessionRevisited,
  runHyperFocusDecay,
  describeTopic,
};
