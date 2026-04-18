// Adaptive scheduling v2.0.7
// Chaque jour Brainee "génère" sa journée :
// - une vibe globale (chatty / introvert / impulsive / lazy ...)
// - des horaires flottants (morning ≠ 9h00 pile, varie ±25 min)
// - une capacité à skip / différer / ignorer selon son humeur
// - une détection d'urgence pour répondre vite ou relancer demain

const { pushLog } = require('../logger');

const VIBES = [
  { name: 'chatty',     chattiness: 0.95, impulse: 0.35, responsiveness: 0.95, tagPenalty: 0.10, urgencyBias: 0.10, desc: "d'humeur bavarde, elle relance facilement" },
  { name: 'introvert',  chattiness: 0.35, impulse: 0.08, responsiveness: 0.55, tagPenalty: 0.70, urgencyBias: -0.10, desc: "peu sociable aujourd'hui, elle garde ses distances" },
  { name: 'impulsive',  chattiness: 0.70, impulse: 0.60, responsiveness: 0.80, tagPenalty: 0.40, urgencyBias: 0.00, desc: "décisions de dernière minute, imprévisible" },
  { name: 'lazy',       chattiness: 0.40, impulse: 0.10, responsiveness: 0.50, tagPenalty: 0.50, urgencyBias: -0.15, desc: "fainéante, elle remet tout à plus tard" },
  { name: 'focus',      chattiness: 0.50, impulse: 0.15, responsiveness: 0.65, tagPenalty: 0.60, urgencyBias: 0.05, desc: "concentrée sur un truc, elle répond que si important" },
  { name: 'excited',    chattiness: 0.90, impulse: 0.55, responsiveness: 0.90, tagPenalty: 0.20, urgencyBias: 0.00, desc: "hypée, elle multiplie les micro-interventions" },
  { name: 'grumpy',     chattiness: 0.55, impulse: 0.20, responsiveness: 0.60, tagPenalty: 0.55, urgencyBias: -0.05, desc: "de mauvais poil, réponses plus sèches" },
  { name: 'balanced',   chattiness: 0.70, impulse: 0.20, responsiveness: 0.75, tagPenalty: 0.35, urgencyBias: 0.00, desc: "journée normale, équilibrée" },
];

const URGENT_KEYWORDS = [
  'urgent', 'urgence', 'aide', 'aidez', 'help', 'au secours', 'besoin',
  'problème', 'probleme', 'bug', 'plante', 'marche pas', 'fonctionne pas',
  'maintenant', 'tout de suite', 'vite', 'rapidement', 'asap',
  'hs ?', 'hs?', 'ok ?', 'ok?', 'ça va ?', 'ca va ?',
  'dispo', 'réponds', 'reponds',
];

let cachedVibe = null;
let cachedVibeDate = '';
let cachedFloating = null;
let cachedFloatingDate = '';

// Queue en mémoire des messages à relancer le lendemain
const pendingRelances = [];

function parisDateISO() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function parisDayOfWeek() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getDay();
}

function getDailyVibe() {
  const today = parisDateISO();
  if (cachedVibeDate === today && cachedVibe) return cachedVibe;
  cachedVibe = VIBES[Math.floor(Math.random() * VIBES.length)];
  cachedVibeDate = today;
  pushLog('SYS', `🎨 Vibe du jour : ${cachedVibe.name} — ${cachedVibe.desc}`, 'success');
  return cachedVibe;
}

function resetDailyVibe() {
  cachedVibe = null;
  cachedVibeDate = '';
  cachedFloating = null;
  cachedFloatingDate = '';
}

// Jitter en heures décimales (± minutes/60)
function jitterH(minutes) {
  return (Math.random() * 2 - 1) * (minutes / 60);
}

// Calcule les horaires flottants du jour (en heures décimales, timezone Paris)
function getDailyFloatingSchedule() {
  const today = parisDateISO();
  if (cachedFloatingDate === today && cachedFloating) return cachedFloating;
  const day = parisDayOfWeek();
  const vibe = getDailyVibe();

  // Les vibes "lazy" décalent le réveil plus tard
  const lazyShift = vibe.name === 'lazy' ? 0.5 : vibe.name === 'excited' ? -0.25 : 0;

  const morningBase = day === 0 ? 10 : day === 6 ? 9.5 : 9;
  const morning     = Math.max(8, morningBase + lazyShift + jitterH(25));
  const lunchBack   = 14 + jitterH(25);
  const goodnight   = 23 + jitterH(45);
  const nightWakeup = 3 + jitterH(60) + 0.5;

  cachedFloating = { morning, lunchBack, goodnight, nightWakeup };
  cachedFloatingDate = today;

  const fmt = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}`;
  };
  pushLog('SYS', `📅 Planning flottant : morning ${fmt(morning)} · lunch ${fmt(lunchBack)} · goodnight ${fmt(goodnight)} · wakeup ${fmt(nightWakeup)}`, 'success');

  return cachedFloating;
}

// Détection d'urgence — heuristique simple sur le texte
function isUrgentQuery(text) {
  if (!text) return false;
  const low = text.toLowerCase();
  const hasKeyword = URGENT_KEYWORDS.some(k => low.includes(k));
  const hasQuestion = /\?/.test(text);
  const isShortAndDirect = text.length < 60 && hasQuestion;
  const hasUrgencyPunct = /!{2,}|\?{2,}/.test(text);
  const vibe = getDailyVibe();

  let score = 0;
  if (hasKeyword) score += 0.6;
  if (isShortAndDirect) score += 0.3;
  if (hasUrgencyPunct) score += 0.2;
  if (hasQuestion) score += 0.15;
  score += (vibe?.urgencyBias || 0);

  return score >= 0.5;
}

// Décide : répondre maintenant (fast) / plus tard (deferred) / ignorer (skip)
function decideMentionResponse(slot, isUrgent) {
  const vibe = getDailyVibe();
  // Urgence = toujours répondre, et plus vite
  if (isUrgent) return { action: 'fast', delay: Math.random() * 3 * 60 * 1000 };

  // Pendant le sommeil : non-urgent = relance demain
  if (slot?.status === 'sleep') {
    return { action: 'defer_tomorrow' };
  }

  // Si la vibe est très peu réactive, une chance de skip total
  const skipProba = (1 - vibe.responsiveness) * 0.4;
  if (Math.random() < skipProba) {
    return { action: 'skip' };
  }

  // Chance de différer au lendemain si vibe lazy/introvert
  const deferProba = vibe.name === 'lazy' ? 0.25 : vibe.name === 'introvert' ? 0.20 : 0.05;
  if (Math.random() < deferProba) {
    return { action: 'defer_tomorrow' };
  }

  return { action: 'normal' };
}

// Chance de skip d'un cron de conversation ambiante selon la vibe
function shouldSkipConvCron() {
  const vibe = getDailyVibe();
  const skipChance = (1 - vibe.chattiness) * 0.75;
  return Math.random() < skipChance;
}

// Chance de post impulsif hors-cron
function rollImpulse() {
  const vibe = getDailyVibe();
  return Math.random() < (vibe.impulse * 0.25);
}

// Doit-on tagger cette personne ? True si Claude a le droit de taguer
function shouldTagPerson() {
  const vibe = getDailyVibe();
  return Math.random() > vibe.tagPenalty;
}

// File d'attente des mentions non-urgentes à relancer
function queueRelance({ userId, username, channelId, messageId, query }) {
  pendingRelances.push({
    userId, username, channelId, messageId, query,
    queuedAt: Date.now(),
  });
  pushLog('SYS', `📬 Relance programmée pour demain → ${username}`, 'success');
}

function peekPendingRelances() {
  return pendingRelances.slice();
}

function popAllPendingRelances() {
  const all = pendingRelances.splice(0, pendingRelances.length);
  return all;
}

module.exports = {
  VIBES,
  getDailyVibe, resetDailyVibe,
  getDailyFloatingSchedule,
  isUrgentQuery, decideMentionResponse,
  shouldSkipConvCron, rollImpulse, shouldTagPerson,
  queueRelance, peekPendingRelances, popAllPendingRelances,
};
