/**
 * ================================================
 * 🚫 EMOTIONAL REFUSAL SYSTEM v0.13.0
 * ================================================
 * Quand Brainee est dans un état émotionnel qui l'empêche
 * de répondre normalement, elle dit pourquoi — message
 * entièrement généré par Claude (Haiku), jamais fixe.
 *
 * Seuils de déclenchement :
 *   energy < 20%          → fatigue        (cooldown 15-30 min)
 *   anger/frustration > 65 → énervée       (cooldown 20-40 min)
 *   mentalLoad > 85%      → saturation     (cooldown 15-25 min)
 *   socialNeed < 10%      → retrait social (cooldown 25-45 min)
 *
 * Mentions directes (@Brainee) ont des seuils légèrement plus tolérants.
 * ================================================
 */

const shared = require('../shared');
const { getInternalState, getActiveEmotions } = require('../bot/emotions');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { pushLog } = require('../logger');

const REFUSAL_COLLECTION = 'emotionalRefusals';

let refusalCooldownUntil = 0;
let lastRefusalType = null;

const REFUSAL_CONTEXTS = {
  fatigue: "Tu es complètement épuisée, à plat, plus d'énergie du tout.",
  anger: "Tu es énervée, frustrée, agacée. Tu as besoin de te calmer avant de parler.",
  saturation: "Ta tête est pleine à craquer, mentalement saturée. Trop de trucs en même temps.",
  social_withdrawal: "Tu as besoin d'être seule, de te retirer. T'as pas envie de socialiser là.",
};

async function generateRefusalMessage(type) {
  const context = REFUSAL_CONTEXTS[type] || "Tu ne peux pas répondre là.";
  try {
    const { text } = await callClaude(
      context,
      `Génère UNE seule phrase naturelle et courte (max 12 mots) pour dire que tu ne peux pas répondre maintenant. Style oral Brainee, en minuscule si plus naturel, pas d'emoji. Juste la phrase brute sans guillemets.`,
      60,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    const fallbacks = {
      fatigue: "j'suis à plat là, je reviens quand j'ai récupéré",
      anger: "j'ai besoin de souffler, je reviens",
      saturation: "trop de trucs en tête là, laisse-moi un moment",
      social_withdrawal: "j'ai besoin d'être seule un moment",
    };
    return fallbacks[type] || "je peux pas répondre là";
  }
}

/**
 * Vérifie si Brainee devrait refuser de répondre basé sur son état émotionnel.
 * Async — génère le message via Claude (Haiku) avant de retourner.
 *
 * @param {boolean} isDirectMention
 * @returns {Promise<{ shouldRefuse, type?, message?, cooldownMs?, isSilent? }>}
 */
async function checkEmotionalRefusal(isDirectMention = false) {
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

  const energyThreshold = isDirectMention ? 14 : 20;
  if (state.energy < energyThreshold) {
    const cooldownMs = (15 + Math.random() * 15) * 60 * 1000;
    return _buildRefusal('fatigue', cooldownMs);
  }

  const loadThreshold = isDirectMention ? 97 : 93;
  if (state.mentalLoad > loadThreshold) {
    const cooldownMs = (15 + Math.random() * 10) * 60 * 1000;
    return _buildRefusal('saturation', cooldownMs);
  }

  if (!isDirectMention) {
    const angryEmotions = activeEmotions.filter(e =>
      ['annoyance', 'anger', 'frustration', 'irritation', 'resentment'].includes(e.name) &&
      e.intensity > 65
    );
    if (angryEmotions.length > 0) {
      const maxIntensity = Math.max(...angryEmotions.map(e => e.intensity));
      const cooldownMs = (20 + Math.random() * 20 + (maxIntensity - 65) * 0.3) * 60 * 1000;
      return _buildRefusal('anger', cooldownMs);
    }
  }

  if (!isDirectMention && state.socialNeed < 10) {
    const cooldownMs = (25 + Math.random() * 20) * 60 * 1000;
    return _buildRefusal('social_withdrawal', cooldownMs);
  }

  return { shouldRefuse: false };
}

async function _buildRefusal(type, cooldownMs) {
  // Cooldown posé immédiatement (sync) pour éviter la double-entrée pendant l'appel Claude
  refusalCooldownUntil = Date.now() + cooldownMs;
  lastRefusalType = type;

  if (type === 'saturation') {
    try {
      const { setInternalStateValue, getInternalState } = require('../bot/emotions');
      const current = getInternalState().mentalLoad;
      setInternalStateValue('mentalLoad', Math.max(current - 35, 45));
    } catch (_) {}
  }

  const message = await generateRefusalMessage(type);

  pushLog('SYS', `🚫 Refus émotionnel [${type}] — cooldown ${Math.round(cooldownMs / 60000)} min`);
  _logRefusalToDb(type, message, cooldownMs).catch(() => {});

  return { shouldRefuse: true, type, message, cooldownMs, isSilent: false };
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

function isInRefusalCooldown() {
  return Date.now() < refusalCooldownUntil;
}

function getRefusalCooldownRemaining() {
  return Math.max(0, refusalCooldownUntil - Date.now());
}

function clearRefusalCooldown() {
  refusalCooldownUntil = 0;
  lastRefusalType = null;
  pushLog('SYS', `🔓 Cooldown de refus émotionnel annulé (admin)`);
}

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
