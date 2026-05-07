/**
 * ================================================
 * 💪 CONVICTION SYSTEM v0.12.0
 * ================================================
 * Brainee a des opinions et des valeurs. Elle ne les abandonne
 * pas sous pression. Si quelqu'un insiste trop sur un sujet
 * où elle n'est pas d'accord, elle passe par 3 stades d'escalade :
 *
 *   Stade 1 (2e insistance)  : désaccord poli mais clair
 *   Stade 2 (3e insistance)  : position ferme, ton plus court
 *   Stade 3 (4e+ insistance) : shutdown + cooldown 60 min sur ce topic
 *
 * Le stade 3 est définitif pour la session : elle ne débattra
 * plus de ce sujet avec cette personne pendant 60 min.
 *
 * Toujours justifié par ses valeurs/persona, jamais du caprice.
 * ================================================
 */

const { pushLog } = require('../logger');

// Map userId → Map topicKey → { count: number, lastTs: number }
const convictionTracker = new Map();

// Map topicKey → timestamp de fin de cooldown
// Note: le cooldown est global par topic (pas par user) pour être cohérent
const topicCooldowns = new Map();

// Seuils d'insistance pour chaque stade
const STAGE_THRESHOLDS = { 1: 2, 2: 3, 3: 4 };

// Durée cooldown topic après stage 3 (60 min)
const TOPIC_COOLDOWN_MS = 60 * 60 * 1000;

// Fenêtre de reset du tracker (2h sans insistance = on repart de zéro)
const TRACKER_RESET_MS = 2 * 60 * 60 * 1000;

// ─── SIGNAUX D'INSISTANCE ────────────────────────────────────────
// Ces patterns détectent quand quelqu'un contredit / insiste
const INSISTENCE_PATTERNS = [
  /\bmais (je te dis|quand même|t'as tort|j'insiste|sérieusement|vraiment)\b/i,
  /\bc'est (pas vrai|faux|incorrect|nul)\b/i,
  /\bt'as (complètement |vraiment )?tort\b/i,
  /\btu (te trompes|es dans l'erreur|comprends pas)\b/i,
  /\bnon mais (franchement|sérieusement|vraiment)\b/i,
  /\bj'insiste\b/i,
  /\b(vraiment |totalement )pas d'accord\b/i,
  /\bc'est (pas bon|pas correct|pas juste)\b/i,
  /\btu dis n'importe quoi\b/i,
  /\btu te contredis\b/i,
];

// ─── MAPPING TOPICS ──────────────────────────────────────────────
const TOPIC_KEYWORDS = {
  gaming: ['jeu', 'game', 'gaming', 'jrpg', 'rpg', 'fps', 'gameplay', 'moba', 'indie', 'console', 'nintendo', 'playstation', 'xbox'],
  anime: ['anime', 'manga', 'weeb', 'otaku', 'shonen', 'seinen'],
  tech: ['code', 'dev', 'javascript', 'python', 'api', 'tech', 'informatique', 'programmation'],
  musique: ['musique', 'album', 'artiste', 'chanson', 'groupe', 'concert', 'ost'],
  ia: ['ia', 'intelligence artificielle', 'robot', 'machine', 'conscience', 'chatgpt', 'llm'],
  films: ['film', 'cinéma', 'serie', 'netflix', 'disney', 'marvel'],
  vie: ['vie', 'travail', 'amis', 'famille', 'relation', 'couple'],
  tdah: ['tdah', 'adhd', 'neuro', 'neurodivergent', 'autisme'],
};

/**
 * Détecte si un message représente une insistance/contradiction.
 * Retourne la clé du topic détecté, ou null si rien.
 */
function detectInsistenceTopic(content = '') {
  const text = content.toLowerCase();

  const hasInsistenceSignal = INSISTENCE_PATTERNS.some(r => r.test(content));
  if (!hasInsistenceSignal) return null;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return topic;
  }

  // Si signal d'insistance détecté mais pas de topic spécifique → topic général
  return 'general';
}

/**
 * Incrémente le compteur d'insistance pour un (userId, topic) et retourne le stade.
 * Stade 0 = pas encore de conviction à exprimer, 1/2/3 = stades d'escalade.
 */
function trackInsistence(userId, topic) {
  if (!convictionTracker.has(userId)) convictionTracker.set(userId, new Map());
  const userMap = convictionTracker.get(userId);

  const now = Date.now();
  const existing = userMap.get(topic);

  // Reset si la dernière insistance était il y a plus de 2h
  if (existing && (now - existing.lastTs) > TRACKER_RESET_MS) {
    userMap.delete(topic);
  }

  const current = userMap.get(topic) || { count: 0, lastTs: now };
  current.count++;
  current.lastTs = now;
  userMap.set(topic, current);

  const count = current.count;
  if (count >= STAGE_THRESHOLDS[3]) return 3;
  if (count >= STAGE_THRESHOLDS[2]) return 2;
  if (count >= STAGE_THRESHOLDS[1]) return 1;
  return 0;
}

/**
 * Vérifie si un topic est en cooldown post-stage-3.
 */
function isTopicInCooldown(userId, topic) {
  const key = `${userId}:${topic}`;
  const until = topicCooldowns.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    topicCooldowns.delete(key);
    return false;
  }
  return true;
}

/**
 * Analyse un message entrant et retourne l'injection de conviction si applicable.
 *
 * @param {string} userId
 * @param {string} content
 * @returns {null | { stage: number, topic: string, convictionBlock: string, isShutdown: boolean }}
 */
function analyzeConviction(userId, content) {
  const topic = detectInsistenceTopic(content);
  if (!topic) return null;

  // Si déjà en cooldown sur ce topic : injection légère (elle peut ignorer poliment)
  if (isTopicInCooldown(userId, topic)) {
    return {
      stage: 3,
      topic,
      convictionBlock: `\n━━ 💪 CONVICTION [cooldown actif] ━━\nCette personne insiste encore sur "${topic}" alors que tu as déjà clos ce débat. Tu peux ignorer poliment, changer de sujet, ou faire une référence légère à ton refus précédent. Tu n'es pas obligée de t'expliquer.`,
      isShutdown: false,
    };
  }

  const stage = trackInsistence(userId, topic);
  if (stage === 0) return null;

  let convictionBlock = '';
  let isShutdown = false;

  if (stage === 1) {
    convictionBlock = `\n━━ 💪 CONVICTION [stade 1] ━━\nCette personne contredit ta position sur "${topic}" pour la 2ème fois. Maintiens ton avis clairement mais sans agressivité. Ex: "je reste sur ma position", "j'entends ton point mais je suis pas convaincue". Reste ouverte d'esprit mais ferme sur le fond.`;
  } else if (stage === 2) {
    convictionBlock = `\n━━ 💪 CONVICTION [stade 2] ━━\nInsistance répétée sur "${topic}". Durcis le ton — sois directe et sans ambiguïté. Tu n'as pas changé d'avis et tu commences à trouver ça pesant. Ex: "j'ai dit ce que j'avais à dire là-dessus", "on va pas tourner en rond". Court, ferme, sans explication supplémentaire.`;
  } else if (stage >= 3) {
    const cooldownKey = `${userId}:${topic}`;
    topicCooldowns.set(cooldownKey, Date.now() + TOPIC_COOLDOWN_MS);
    isShutdown = true;
    convictionBlock = `\n━━ 💪 CONVICTION [stade 3 — SHUTDOWN] ━━\nCette personne continue d'insister sur "${topic}" malgré tes refus répétés. C'est la DERNIÈRE fois que tu en parles. Sois directe et finale : "ok je vais arrêter là parce que ça mène à rien", "on tourne en rond, je préfère m'arrêter là". Pas d'explication longue. Après ce message tu ne répondras plus sur ce sujet avec cette personne pendant un moment.`;
    pushLog('SYS', `💪 Conviction stage 3 — topic "${topic}" cooldown 60 min (user ${userId})`);
  }

  return { stage, topic, convictionBlock, isShutdown };
}

/**
 * Reset complet du tracker (nouvelle journée).
 */
function resetConvictionTracker() {
  convictionTracker.clear();
  topicCooldowns.clear();
}

/**
 * Snapshot pour le dashboard.
 */
function getConvictionState() {
  const state = {};
  for (const [userId, topicMap] of convictionTracker) {
    state[userId] = {};
    for (const [topic, data] of topicMap) {
      state[userId][topic] = { count: data.count, lastTs: new Date(data.lastTs).toISOString() };
    }
  }
  return { tracker: state, activeCooldowns: topicCooldowns.size };
}

module.exports = {
  analyzeConviction,
  isTopicInCooldown,
  resetConvictionTracker,
  getConvictionState,
};
