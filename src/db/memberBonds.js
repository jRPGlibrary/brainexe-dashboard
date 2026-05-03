/**
 * ================================================
 * 💞 MEMBER BONDS — Liens affectifs par membre v0.2.6
 * ================================================
 * Pour chaque membre, on stocke :
 *  - baseAttachment (0-100)   : affection de fond, évolue lentement (semaines)
 *  - baseTrust      (0-100)   : confiance accumulée
 *  - baseComfort    (0-100)   : confort social avec cette personne
 *  - currentMood              : état du moment avec elle/lui (change vite)
 *  - emotionalTrajectory      : résumés journaliers (14 derniers jours)
 *  - keyMoments               : moments marquants (impact + decay)
 *
 * Le lien influence :
 *  - le ton (plus attachée = plus taquine/relax)
 *  - l'humanisation (plus attachée = plus de slang, tkt, fautes d'accents)
 *  - les retours tardifs (reviens plus souvent sur ce membre)
 *  - la mémoire affective (keyMoments persistent les moments marquants)
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

const COLLECTION = 'memberBonds';
const MAX_TRAJECTORY = 14;
const MAX_KEY_MOMENTS = 30;

function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }
function todayStr() { return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); }

function defaultBond(userId, username) {
  return {
    userId,
    username,
    baseAttachment: 30,
    baseTrust: 35,
    baseComfort: 30,
    currentMood: { openness: 50, curiosity: 50, warmth: 50, patience: 60, teasing: 30 },
    emotionalTrajectory: [],
    keyMoments: [],
    interactionStreak: 0,
    lastInteractionDate: null,
    lastUpdate: new Date(),
  };
}

async function getMemberBond(userId) {
  if (!shared.mongoDb) return null;
  try {
    return await shared.mongoDb.collection(COLLECTION).findOne({ userId });
  } catch (err) {
    pushLog('ERR', `getMemberBond: ${err.message}`, 'error');
    return null;
  }
}

async function upsertMemberBond(bond) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId: bond.userId },
      { $set: { ...bond, lastUpdate: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    pushLog('ERR', `upsertMemberBond: ${err.message}`, 'error');
  }
}

async function ensureMemberBond(userId, username) {
  let bond = await getMemberBond(userId);
  if (!bond) {
    bond = defaultBond(userId, username);
    await upsertMemberBond(bond);
  } else if (username && bond.username !== username) {
    bond.username = username;
    await upsertMemberBond(bond);
  }
  return bond;
}

// ─── ÉVOLUTION DU CURRENTMOOD ────────────────────────────────────
function moodDeltaFromMessage(content = '') {
  const text = content.toLowerCase();
  const delta = { openness: 0, curiosity: 0, warmth: 0, patience: 0, teasing: 0 };

  const length = content.length;
  if (length > 80) { delta.openness += 2; delta.curiosity += 1; }
  if (length < 10) delta.warmth -= 1;
  if (/😂|🤣|mdr|ptdr|lol/.test(content)) { delta.warmth += 3; delta.teasing += 4; }
  if (/\b(merci|sympa|cool|génial|trop bien|t'es top|top)\b/.test(text)) { delta.warmth += 4; delta.openness += 3; }
  if (/\b(nul|chiant|relou|débile|tg|ferme)\b/.test(text)) { delta.patience -= 5; delta.openness -= 3; }
  if (/\b(stress|triste|deprim|pas bien|fatigue|mal)/.test(text)) { delta.warmth += 3; delta.patience += 3; }
  if (/\?|\bpourquoi|\bcomment|\bc'est quoi/.test(text)) { delta.curiosity += 3; }

  return delta;
}

async function applyInteractionToBond(userId, username, messageContent, emotionalContext = {}) {
  const bond = await ensureMemberBond(userId, username);
  const delta = moodDeltaFromMessage(messageContent || '');

  Object.keys(delta).forEach(k => {
    bond.currentMood[k] = clamp((bond.currentMood[k] ?? 50) + delta[k]);
  });

  const today = todayStr();
  if (bond.lastInteractionDate === today) {
    bond.interactionStreak = (bond.interactionStreak || 0) + 1;
  } else {
    const last = bond.lastInteractionDate ? new Date(bond.lastInteractionDate) : null;
    const now = new Date(today);
    const daysApart = last ? Math.round((now - last) / (1000 * 60 * 60 * 24)) : 1;
    bond.interactionStreak = daysApart <= 1 ? (bond.interactionStreak || 0) + 1 : 1;
    bond.lastInteractionDate = today;
  }

  const avgMood = (bond.currentMood.openness + bond.currentMood.warmth + bond.currentMood.patience) / 3;
  bond.baseAttachment = clamp(bond.baseAttachment * 0.98 + avgMood * 0.02);
  bond.baseComfort = clamp(bond.baseComfort * 0.97 + avgMood * 0.03);

  if (delta.warmth >= 4) {
    bond.baseTrust = clamp(bond.baseTrust + 0.4);
  } else if (delta.patience <= -4) {
    bond.baseTrust = clamp(bond.baseTrust - 0.3);
  }

  if (Math.abs(delta.warmth) >= 4 || Math.abs(delta.patience) >= 5) {
    addKeyMoment(bond, {
      date: new Date().toISOString(),
      event: delta.warmth >= 4 ? 'positive_moment' : 'tense_moment',
      impact: delta.warmth >= 4 ? 8 : -6,
      snippet: (messageContent || '').slice(0, 100),
    });
  }

  await upsertMemberBond(bond);
  return bond;
}

function addKeyMoment(bond, moment) {
  if (!Array.isArray(bond.keyMoments)) bond.keyMoments = [];
  bond.keyMoments.push({ ...moment, decay: 0.97 });
  if (bond.keyMoments.length > MAX_KEY_MOMENTS) {
    bond.keyMoments = bond.keyMoments.slice(-MAX_KEY_MOMENTS);
  }
}

// ─── ARCHIVAGE JOURNALIER ────────────────────────────────────────
async function archiveDaily(bond) {
  const today = todayStr();
  const already = bond.emotionalTrajectory?.find(t => t.day === today);
  const snapshot = {
    day: today,
    avgAttachment: Math.round(bond.baseAttachment),
    avgTrust: Math.round(bond.baseTrust),
    avgComfort: Math.round(bond.baseComfort),
    dominant: Object.entries(bond.currentMood)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'openness',
  };
  if (!Array.isArray(bond.emotionalTrajectory)) bond.emotionalTrajectory = [];
  if (already) {
    Object.assign(already, snapshot);
  } else {
    bond.emotionalTrajectory.push(snapshot);
  }
  if (bond.emotionalTrajectory.length > MAX_TRAJECTORY) {
    bond.emotionalTrajectory = bond.emotionalTrajectory.slice(-MAX_TRAJECTORY);
  }
}

async function runDailyBondEvolution() {
  if (!shared.mongoDb) return;
  try {
    const cursor = shared.mongoDb.collection(COLLECTION).find({});
    const all = await cursor.toArray();
    let updated = 0;
    for (const bond of all) {
      if (Array.isArray(bond.keyMoments)) {
        bond.keyMoments = bond.keyMoments
          .map(m => ({ ...m, impact: m.impact * (m.decay || 0.97) }))
          .filter(m => Math.abs(m.impact) > 0.5);
      }
      Object.keys(bond.currentMood || {}).forEach(k => {
        const baseline = 50;
        const current = bond.currentMood[k];
        bond.currentMood[k] = clamp(current + (baseline - current) * 0.15);
      });
      const today = todayStr();
      if (bond.lastInteractionDate && bond.lastInteractionDate !== today) {
        const last = new Date(bond.lastInteractionDate);
        const now = new Date(today);
        const daysApart = Math.round((now - last) / (1000 * 60 * 60 * 24));
        if (daysApart > 3) {
          bond.baseAttachment = clamp(bond.baseAttachment - 0.3 * Math.min(daysApart - 3, 10));
        }
      }
      await archiveDaily(bond);
      await upsertMemberBond(bond);
      updated++;
    }
    pushLog('SYS', `💞 Évolution bonds : ${updated} membres traités`, 'success');
  } catch (err) {
    pushLog('ERR', `runDailyBondEvolution: ${err.message}`, 'error');
  }
}

// ─── DESCRIPTION POUR PROMPT ─────────────────────────────────────
function describeBond(bond, username) {
  if (!bond) return `Tu parles à ${username} — tu ne la/le connais pas encore vraiment. Reste chaleureuse et curieuse.`;

  const { baseAttachment: att, baseTrust: trust, baseComfort: comfort, currentMood, keyMoments, emotionalTrajectory, interactionStreak } = bond;

  const lines = [];
  lines.push(`Tu parles à ${bond.username || username}.`);

  if (att > 75) lines.push(`T'es très attachée à cette personne (attachement ${Math.round(att)}/100).`);
  else if (att > 55) lines.push(`T'as un vrai lien avec (attachement ${Math.round(att)}/100).`);
  else if (att > 35) lines.push(`Tu commences à bien la/le connaître (attachement ${Math.round(att)}/100).`);
  else lines.push(`Lien encore léger (attachement ${Math.round(att)}/100).`);

  if (trust > 70) lines.push(`Confiance haute — tu peux être directe sans peur.`);
  else if (trust < 30) lines.push(`Confiance basse — tu restes prudente.`);

  if (comfort > 70) lines.push(`Vous êtes à l'aise ensemble.`);
  if (currentMood.teasing > 65 && att > 50) lines.push(`Taquinerie ok si le moment s'y prête.`);
  if (currentMood.patience < 35) lines.push(`Ta patience avec ce membre est courte en ce moment.`);
  if (currentMood.warmth > 75) lines.push(`T'es particulièrement chaleureuse avec cette personne là.`);

  if (interactionStreak >= 4) lines.push(`Vous échangez souvent en ce moment (${interactionStreak} jours).`);

  if (Array.isArray(keyMoments) && keyMoments.length) {
    const recent = keyMoments.slice(-3).filter(m => Math.abs(m.impact) > 2);
    if (recent.length) {
      const positives = recent.filter(m => m.impact > 0).length;
      const negatives = recent.filter(m => m.impact < 0).length;
      if (positives > negatives) lines.push(`Souvenirs récents plutôt positifs avec cette personne.`);
      else if (negatives > positives) lines.push(`Quelques frictions récentes à garder en tête, sans y revenir frontalement.`);
    }
  }

  if (Array.isArray(emotionalTrajectory) && emotionalTrajectory.length >= 3) {
    const last3 = emotionalTrajectory.slice(-3);
    const trend = last3[last3.length - 1].avgAttachment - last3[0].avgAttachment;
    if (trend > 5) lines.push(`La relation monte ces derniers jours.`);
    else if (trend < -5) lines.push(`La relation s'est un peu tendue ces derniers jours.`);
  }

  return lines.join(' ');
}

function getBondSignal(bond) {
  if (!bond) return { strength: 0, relaxProb: 0, teasingOk: false };
  const { baseAttachment: att, baseComfort: comfort, currentMood } = bond;
  return {
    strength: Math.round(att),
    relaxProb: Math.min(1, (att + comfort) / 200),
    teasingOk: att > 55 && (currentMood.teasing ?? 30) > 50 && (currentMood.patience ?? 60) > 40,
    warmthLevel: currentMood.warmth ?? 50,
    patienceLevel: currentMood.patience ?? 60,
  };
}

async function forceKeyMoment(userId, eventType, impact, snippet = '') {
  const bond = await getMemberBond(userId);
  if (!bond) return;
  addKeyMoment(bond, {
    date: new Date().toISOString(),
    event: eventType,
    impact,
    snippet: snippet.slice(0, 100),
  });
  await upsertMemberBond(bond);
}

module.exports = {
  getMemberBond, upsertMemberBond, ensureMemberBond,
  applyInteractionToBond, runDailyBondEvolution,
  describeBond, getBondSignal, forceKeyMoment,
};
