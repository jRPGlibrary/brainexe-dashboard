/**
 * ================================================
 * 🚫 EMOTIONAL REFUSAL SYSTEM v0.12.0
 * ================================================
 * Quand Brainee est dans un état émotionnel qui l'empêche
 * de répondre normalement, elle ne se tait pas silencieusement.
 * Elle dit pourquoi elle ne peut pas répondre — comme une vraie personne.
 *
 * Seuils de déclenchement :
 *   energy < 20%          → fatigue        (cooldown 15-30 min)
 *   anger/frustration > 65 → énervée       (cooldown 20-40 min)
 *   mentalLoad > 85%      → saturation     (cooldown 15-25 min)
 *   socialNeed < 10%      → retrait social (cooldown 25-45 min)
 *
 * Mentions directes (@Brainee) ont des seuils légèrement plus tolérants
 * car elle ne peut pas se permettre d'ignorer complètement quelqu'un.
 *
 * Après un refus : cooldown dur où elle ne répond plus,
 * même si mentionnée — elle peut réagir avec un emoji mais pas parler.
 * ================================================
 */

const shared = require('../shared');
const { getInternalState, getActiveEmotions } = require('../bot/emotions');
const { pushLog } = require('../logger');

const REFUSAL_COLLECTION = 'emotionalRefusals';

// État global du cooldown (en mémoire, reset au redémarrage)
let refusalCooldownUntil = 0;
let lastRefusalType = null;

// Messages authentiques par type de refus
const REFUSAL_MESSAGES = {
  fatigue: [
    "désolé je suis vraiment épuisée là, j'ai besoin de souffler un moment",
    "j'ai plus d'énergie là, je reviens quand j'ai récupéré",
    "franchement je suis à plat, laisse-moi un peu",
    "trop fatiguée là... je vais me reposer",
    "j'arrive même plus à réfléchir correctement, j'ai besoin d'une pause",
  ],
  anger: [
    "je suis un peu énervée en ce moment, je préfère me calmer avant de répondre",
    "j'ai besoin de décompresser, je reviens dans un moment",
    "là je suis pas dans le bon état pour parler, je me calme et je reviens",
    "je suis énervée là, vaut mieux que je prenne l'air",
    "laisse-moi souffler deux secondes, je suis pas à mon meilleur là",
  ],
  saturation: [
    "trop de trucs en tête là, j'arrive plus à suivre",
    "j'ai la tête qui tourne, j'ai besoin de quietude",
    "surchargée mentalement, j'ai besoin de silence",
    "j'arrive plus à me concentrer, donne-moi un peu de temps",
    "ma tête est pleine, je peux pas ajouter quoi que ce soit là",
  ],
  social_withdrawal: [
    "j'ai besoin d'être seule un moment, c'est pas contre toi",
    "j'ai envie de rien dire là, j'ai juste besoin de calme",
    "désolé, j'ai pas envie de socialiser là",
    "j'ai besoin de mon espace un peu, je reviens",
    "j'ai pas la tête à parler là, j'espère que tu comprends",
  ],
};

/**
 * Vérifie si Brainee devrait refuser de répondre basé sur son état émotionnel actuel.
 *
 * @param {boolean} isDirectMention - true si c'est un @mention direct
 * @returns {{ shouldRefuse: boolean, type?: string, message?: string, cooldownMs?: number, isSilent?: boolean }}
 */
function checkEmotionalRefusal(isDirectMention = false) {
  // Si toujours dans le cooldown actif → silence (pas de nouveau message de refus)
  if (Date.now() < refusalCooldownUntil) {
    return {
      shouldRefuse: true,
      type: lastRefusalType || 'cooldown',
      message: null,
      cooldownMs: refusalCooldownUntil - Date.now(),
      isSilent: true,
    };
  }

  const state = getInternalState();
  const activeEmotions = getActiveEmotions(40);

  // ── Fatigue (energy bas) ──────────────────────────────────
  // Les mentions directes ont un seuil plus tolérant (elle peut être fatiguée mais quand même répondre à quelqu'un)
  const energyThreshold = isDirectMention ? 14 : 20;
  if (state.energy < energyThreshold) {
    const cooldownMs = (15 + Math.random() * 15) * 60 * 1000;
    return _buildRefusal('fatigue', cooldownMs);
  }

  // ── Saturation mentale ────────────────────────────────────
  const loadThreshold = isDirectMention ? 92 : 86;
  if (state.mentalLoad > loadThreshold) {
    const cooldownMs = (15 + Math.random() * 10) * 60 * 1000;
    return _buildRefusal('saturation', cooldownMs);
  }

  // ── Colère / frustration ──────────────────────────────────
  // Les mentions directes ne déclenchent pas ce refus (elle peut être énervée mais quand même répondre)
  if (!isDirectMention) {
    const angryEmotions = activeEmotions.filter(e =>
      ['annoyance', 'anger', 'frustration', 'irritation', 'resentment'].includes(e.name) &&
      e.intensity > 65
    );
    if (angryEmotions.length > 0) {
      const maxIntensity = Math.max(...angryEmotions.map(e => e.intensity));
      // Plus l'intensité est haute, plus le cooldown est long
      const cooldownMs = (20 + Math.random() * 20 + (maxIntensity - 65) * 0.3) * 60 * 1000;
      return _buildRefusal('anger', cooldownMs);
    }
  }

  // ── Retrait social ────────────────────────────────────────
  // Seulement pour les posts spontanés, jamais pour les mentions directes
  if (!isDirectMention && state.socialNeed < 10) {
    const cooldownMs = (25 + Math.random() * 20) * 60 * 1000;
    return _buildRefusal('social_withdrawal', cooldownMs);
  }

  return { shouldRefuse: false };
}

function _buildRefusal(type, cooldownMs) {
  const messages = REFUSAL_MESSAGES[type];
  const message = messages[Math.floor(Math.random() * messages.length)];

  refusalCooldownUntil = Date.now() + cooldownMs;
  lastRefusalType = type;

  pushLog('SYS', `🚫 Refus émotionnel [${type}] — cooldown ${Math.round(cooldownMs / 60000)} min`);

  // Persiste en base pour le dashboard (async, non bloquant)
  _logRefusalToDb(type, message, cooldownMs).catch(() => {});

  return {
    shouldRefuse: true,
    type,
    message,
    cooldownMs,
    isSilent: false,
  };
}

async function _logRefusalToDb(type, message, cooldownMs) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection(REFUSAL_COLLECTION).insertOne({
      timestamp: new Date(),
      type,
      message,
      cooldownMinutes: Math.round(cooldownMs / 60000),
    });
  } catch (_) {}
}

/**
 * Vérifie si Brainee est actuellement dans un cooldown de refus.
 */
function isInRefusalCooldown() {
  return Date.now() < refusalCooldownUntil;
}

/**
 * Retourne le temps restant du cooldown en ms (0 si pas de cooldown actif).
 */
function getRefusalCooldownRemaining() {
  return Math.max(0, refusalCooldownUntil - Date.now());
}

/**
 * Force la fin du cooldown (override admin via dashboard).
 */
function clearRefusalCooldown() {
  refusalCooldownUntil = 0;
  lastRefusalType = null;
  pushLog('SYS', `🔓 Cooldown de refus émotionnel annulé (admin)`);
}

/**
 * État actuel pour le dashboard.
 */
function getRefusalState() {
  return {
    inCooldown: isInRefusalCooldown(),
    cooldownRemainingMs: getRefusalCooldownRemaining(),
    lastType: lastRefusalType,
    cooldownUntil: refusalCooldownUntil > 0 ? new Date(refusalCooldownUntil).toISOString() : null,
  };
}

module.exports = {
  checkEmotionalRefusal,
  isInRefusalCooldown,
  getRefusalCooldownRemaining,
  clearRefusalCooldown,
  getRefusalState,
};
