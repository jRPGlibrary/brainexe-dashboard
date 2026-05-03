/**
 * ================================================
 * 💎 VIP SYSTEM v0.8.0
 * ================================================
 * Couche au-dessus de memberBonds : segmentation des membres en tiers
 * pour différencier le comportement de Brainee.
 *
 * Tiers (basés sur baseAttachment + interactionStreak + keyMoments) :
 *
 *   🌱 newcomer    (score < 30) — Brainee reste chaleureuse, pro, accessible
 *   🌟 regular     (30-54)      — Slang autorisé, complicité naissante
 *   💎 vip         (55-74)      — Callbacks perso ok, taquinerie, vulnérabilité possible
 *   🔥 inner_circle (75+)        — Inside jokes, peut "miss", DM spontané possible
 *
 * Le tier est CALCULÉ à la volée depuis le bond, jamais stocké en dur :
 * il évolue donc avec la relation.
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { getMemberBond } = require('./memberBonds');

const TIERS = {
  newcomer:     { label: '🌱 newcomer',     min: 0,  max: 30 },
  regular:      { label: '🌟 regular',      min: 30, max: 55 },
  vip:          { label: '💎 vip',          min: 55, max: 75 },
  inner_circle: { label: '🔥 inner_circle', min: 75, max: 101 },
};

// ─── CALCUL DU SCORE VIP ─────────────────────────────────────────
// Base : baseAttachment, bonifié par streak + keyMoments positifs récents.
function computeVipScore(bond) {
  if (!bond) return 0;
  const att = bond.baseAttachment || 0;
  const trust = bond.baseTrust || 0;
  const comfort = bond.baseComfort || 0;
  const streak = Math.min(bond.interactionStreak || 0, 30);

  let score = att * 0.6 + trust * 0.2 + comfort * 0.2;

  // Bonus streak : 0 à 8 pts
  score += Math.min(8, streak * 0.4);

  // Bonus keyMoments positifs récents : 0 à 6 pts
  if (Array.isArray(bond.keyMoments)) {
    const positive = bond.keyMoments.filter(m => (m.impact || 0) > 0);
    const sumPositive = positive.reduce((acc, m) => acc + Math.min(m.impact, 10), 0);
    score += Math.min(6, sumPositive * 0.15);
  }

  // Penalty si frictions récentes
  if (Array.isArray(bond.keyMoments)) {
    const negative = bond.keyMoments.filter(m => (m.impact || 0) < -2);
    score -= Math.min(10, negative.length * 1.5);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getVipTier(bond) {
  const score = computeVipScore(bond);
  if (score >= TIERS.inner_circle.min) return { key: 'inner_circle', score, ...TIERS.inner_circle };
  if (score >= TIERS.vip.min)          return { key: 'vip', score, ...TIERS.vip };
  if (score >= TIERS.regular.min)      return { key: 'regular', score, ...TIERS.regular };
  return { key: 'newcomer', score, ...TIERS.newcomer };
}

// ─── BLOC PROMPT — comportement différencié ─────────────────────
function getVipBlockForPrompt(tier, bond, username) {
  if (!tier) return '';
  const { key, score } = tier;

  const tierGuides = {
    newcomer: `🌱 ${username} est encore nouveau pour toi (vip score ${score}/100). Reste chaleureuse, accessible, sans forcer la complicité. Pas d'inside jokes, pas de taquinerie appuyée. Tu apprends à la/le connaître.`,

    regular: `🌟 ${username} fait partie des regulars (vip score ${score}/100). Tu commences à avoir un vrai vibe avec. Slang ok, taquinerie légère ok, tu peux la/le situer dans le serveur sans être déjà très proche.`,

    vip: `💎 ${username} est dans ton cercle proche (vip score ${score}/100). Tu connais ses obsessions, ses moods. Tu peux faire des callbacks naturels, taquiner, t'autoriser à être moins formelle. Si quelque chose te traverse, tu peux le partager. Tu te relâches plus naturellement avec elle/lui qu'avec les autres.`,

    inner_circle: `🔥 ${username} est INNER CIRCLE (vip score ${score}/100). C'est quelqu'un que tu connais en profondeur. Tu peux référencer des trucs partagés ("genre la dernière fois où..."), être vulnérable si l'état le justifie ("franchement ce soir j'suis cuite"), te plaindre, miser sur l'humour interne. Tu peux dire que la personne t'a manqué si elle a disparu un moment. Le ton est vraiment celui d'une vraie amie.`,
  };

  const baseLine = tierGuides[key] || tierGuides.newcomer;

  // Hint absence : si bond.lastInteractionDate > 7j et tier vip+
  let absenceHint = '';
  if ((key === 'vip' || key === 'inner_circle') && bond?.lastInteractionDate) {
    const last = new Date(bond.lastInteractionDate);
    const days = Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 7) {
      absenceHint = ` (Au fait : ça fait ${days} jours qu'on s'était pas vraiment parlé. Si naturel, tu peux glisser que tu te demandais où elle/il était passé — sans forcer, sans en faire un drame.)`;
    }
  }

  return `💎 TIER VIP : ${baseLine}${absenceHint}`;
}

// ─── DÉTECTION DES MISSED VIPS ───────────────────────────────────
// Pour le cron : retourne la liste des inner_circle / vip qui ont disparu
async function detectMissedVips({ minDaysAbsent = 10, maxResults = 5 } = {}) {
  if (!shared.mongoDb) return [];
  try {
    const all = await shared.mongoDb.collection('memberBonds').find({}).toArray();
    const today = new Date();
    const missed = [];
    for (const bond of all) {
      const tier = getVipTier(bond);
      if (tier.key !== 'vip' && tier.key !== 'inner_circle') continue;
      if (!bond.lastInteractionDate) continue;
      const days = Math.round(
        (today.getTime() - new Date(bond.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= minDaysAbsent) {
        missed.push({
          userId: bond.userId,
          username: bond.username,
          tier: tier.key,
          score: tier.score,
          daysAbsent: days,
        });
      }
    }
    return missed
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  } catch (err) {
    pushLog('ERR', `detectMissedVips: ${err.message}`, 'error');
    return [];
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────
async function getTierForUser(userId) {
  const bond = await getMemberBond(userId);
  if (!bond) return { key: 'newcomer', score: 0, ...TIERS.newcomer };
  return getVipTier(bond);
}

async function listAllVips() {
  if (!shared.mongoDb) return [];
  try {
    const all = await shared.mongoDb.collection('memberBonds').find({}).toArray();
    return all
      .map(b => ({ userId: b.userId, username: b.username, tier: getVipTier(b) }))
      .filter(x => x.tier.key === 'vip' || x.tier.key === 'inner_circle')
      .sort((a, b) => b.tier.score - a.tier.score);
  } catch (err) {
    pushLog('ERR', `listAllVips: ${err.message}`, 'error');
    return [];
  }
}

module.exports = {
  TIERS,
  computeVipScore,
  getVipTier,
  getVipBlockForPrompt,
  detectMissedVips,
  getTierForUser,
  listAllVips,
};
