/**
 * ================================================
 * 📌 EXTENDED PERMISSIONS v2.3.5
 * ================================================
 * Donne à Brainee 2 nouveaux pouvoirs sur le serveur :
 *   - Pin intelligent : épingler un message vraiment marquant (réactions ≥ seuil + qualité)
 *   - Mini-sondages : lancer un poll quand le salon a besoin d'une décision collective
 *
 * Garde-fous :
 *   - Pas de modération destructive (delete/kick/ban) — c'est trop risqué pour un bot autonome
 *   - Limite quotidienne stricte (max 2 pins/jour, 1 poll/jour)
 *   - Pin uniquement si message a ≥ 5 réactions distinctes OU 8 même réaction
 *   - Pin ne touche jamais les messages des admins/mods (déjà gérés humainement)
 *   - Tout est tracé via auditLog
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { auditLog } = require('../audit');
const { getCurrentSlot } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const { getInternalState } = require('../bot/emotions');

const COLLECTION = 'extendedPermActions';
const DAILY_PIN_LIMIT = 2;
const DAILY_POLL_LIMIT = 1;
const PIN_REACTION_THRESHOLD_DISTINCT = 5;
const PIN_REACTION_THRESHOLD_SINGLE = 8;
const PIN_MIN_AGE_MS = 30 * 60 * 1000;     // 30 min mini, le message doit avoir "vécu"
const PIN_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h max, sinon trop tard

function todayStr() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

async function getDailyCount(action) {
  if (!shared.mongoDb) return 0;
  try {
    return await shared.mongoDb.collection(COLLECTION).countDocuments({
      action,
      day: todayStr(),
    });
  } catch (_) { return 0; }
}

async function recordAction(action, payload) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(COLLECTION).insertOne({
      action,
      day: todayStr(),
      at: new Date(),
      ...payload,
    });
  } catch (err) {
    pushLog('ERR', `recordAction: ${err.message}`, 'error');
  }
}

// ─── PIN INTELLIGENT ────────────────────────────────────────────
/**
 * Évalue si un message Discord mérite un pin.
 * @returns {object} { shouldPin: bool, reason: string, score: number }
 */
function evaluatePinWorthiness(message) {
  if (!message || !message.reactions) return { shouldPin: false, reason: 'no message', score: 0 };
  if (message.pinned) return { shouldPin: false, reason: 'already pinned', score: 0 };

  const ageMs = Date.now() - (message.createdTimestamp || 0);
  if (ageMs < PIN_MIN_AGE_MS) return { shouldPin: false, reason: 'trop récent', score: 0 };
  if (ageMs > PIN_MAX_AGE_MS) return { shouldPin: false, reason: 'trop ancien', score: 0 };

  const reactions = message.reactions.cache;
  const distinctEmojis = reactions.size;
  const totalCount = [...reactions.values()].reduce((acc, r) => acc + (r.count || 0), 0);
  const maxSingle = [...reactions.values()].reduce((m, r) => Math.max(m, r.count || 0), 0);

  let score = 0;
  if (distinctEmojis >= PIN_REACTION_THRESHOLD_DISTINCT) score += 3;
  if (maxSingle >= PIN_REACTION_THRESHOLD_SINGLE) score += 3;
  score += Math.min(3, Math.floor(totalCount / 4));
  if ((message.content || '').length > 80) score += 1;

  if (score < 5) return { shouldPin: false, reason: 'score insuffisant', score };
  return { shouldPin: true, reason: `${distinctEmojis} emojis / max ${maxSingle} / total ${totalCount}`, score };
}

async function tryPinMessage(message) {
  // Quota
  const count = await getDailyCount('pin');
  if (count >= DAILY_PIN_LIMIT) {
    return { ok: false, reason: 'quota pin atteint' };
  }
  // Skip messages d'admins/mods : c'est leur job
  try {
    if (message.member?.permissions?.has?.('Administrator') ||
        message.member?.permissions?.has?.('ManageMessages')) {
      return { ok: false, reason: 'message admin/mod' };
    }
  } catch (_) {}

  const eval_ = evaluatePinWorthiness(message);
  if (!eval_.shouldPin) return { ok: false, reason: eval_.reason };

  try {
    await message.pin();
    await recordAction('pin', {
      messageId: message.id,
      channelId: message.channelId,
      authorId: message.author?.id,
      authorUsername: message.author?.username,
      score: eval_.score,
      reason: eval_.reason,
      snippet: (message.content || '').slice(0, 200),
    });
    auditLog('brainee.pin', {
      messageId: message.id,
      channelId: message.channelId,
      score: eval_.score,
    });
    pushLog('SYS', `📌 Brainee a épinglé un message dans #${message.channel?.name} (score ${eval_.score} — ${eval_.reason})`, 'success');
    return { ok: true, score: eval_.score };
  } catch (err) {
    pushLog('ERR', `tryPinMessage: ${err.message}`, 'error');
    return { ok: false, reason: err.message };
  }
}

// ─── SCAN PINS — passe en revue les messages récents pour candidats ─
async function scanForPinCandidates() {
  const cfg = shared.botConfig?.conversations;
  if (!cfg?.enabled) return;

  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  const vibe = getDailyVibe();
  if (vibe.name === 'withdrawn' || vibe.name === 'lazy') return;

  const dailyPins = await getDailyCount('pin');
  if (dailyPins >= DAILY_PIN_LIMIT) return;

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channels = (cfg.channels || []).filter(c => c.enabled);
    // On scanne 3 salons au hasard pour pas brasser tout
    const sample = [...channels].sort(() => Math.random() - 0.5).slice(0, 3);

    for (const ch of sample) {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel?.messages) continue;
      const msgs = await channel.messages.fetch({ limit: 30 });
      const candidates = [...msgs.values()]
        .filter(m => !m.author?.bot && !m.pinned)
        .map(m => ({ msg: m, eval: evaluatePinWorthiness(m) }))
        .filter(x => x.eval.shouldPin)
        .sort((a, b) => b.eval.score - a.eval.score);
      if (!candidates.length) continue;
      const top = candidates[0];
      const r = await tryPinMessage(top.msg);
      if (r.ok) return; // un seul pin par scan
    }
  } catch (err) {
    pushLog('ERR', `scanForPinCandidates: ${err.message}`, 'error');
  }
}

// ─── SONDAGE ────────────────────────────────────────────────────
const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

/**
 * Lance un sondage dans un salon donné.
 * @param {string} channelId
 * @param {string} question
 * @param {string[]} options - 2 à 5 options
 */
async function launchPoll(channelId, question, options) {
  const dailyPolls = await getDailyCount('poll');
  if (dailyPolls >= DAILY_POLL_LIMIT) {
    return { ok: false, reason: 'quota poll atteint' };
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
    return { ok: false, reason: 'options invalides (2-5 attendus)' };
  }
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return { ok: false, reason: 'salon introuvable' };

    const lines = options.map((o, i) => `${POLL_EMOJIS[i]} ${o}`).join('\n');
    const body = `📊 **${question}**\n\n${lines}\n\n*Vote en cliquant sur une réaction.*`;
    const sent = await channel.send(body);
    for (let i = 0; i < options.length; i++) {
      try { await sent.react(POLL_EMOJIS[i]); } catch (_) {}
    }
    await recordAction('poll', {
      channelId,
      messageId: sent.id,
      question,
      options,
    });
    auditLog('brainee.poll', { channelId, question, options });
    pushLog('SYS', `📊 Brainee a lancé un sondage dans #${channel.name} : "${question}"`, 'success');
    return { ok: true, messageId: sent.id };
  } catch (err) {
    pushLog('ERR', `launchPoll: ${err.message}`, 'error');
    return { ok: false, reason: err.message };
  }
}

// ─── DÉTECTION D'OPPORTUNITÉ DE POLL ────────────────────────────
// Pattern simple : détecte les "X ou Y ?" dans les conversations récentes
const OR_PATTERN = /\b([a-zàâéèêëîïôöùûüç0-9'\-\s]{3,30})\s+ou\s+([a-zàâéèêëîïôöùûüç0-9'\-\s]{3,30})\s*\?/i;

function detectPollOpportunity(content = '') {
  if (!content || content.length < 12 || content.length > 200) return null;
  const m = content.match(OR_PATTERN);
  if (!m) return null;
  const opt1 = m[1].trim();
  const opt2 = m[2].trim();
  if (opt1.length < 2 || opt2.length < 2) return null;
  if (opt1.toLowerCase() === opt2.toLowerCase()) return null;
  return { question: content.replace(/\s+/g, ' ').trim(), options: [opt1, opt2] };
}

module.exports = {
  evaluatePinWorthiness,
  tryPinMessage,
  scanForPinCandidates,
  launchPoll,
  detectPollOpportunity,
  getDailyCount,
};
