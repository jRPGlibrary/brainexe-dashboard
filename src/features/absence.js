const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { getParisHour } = require('../bot/scheduling');
const { getDailyFloatingSchedule } = require('../bot/adaptiveSchedule');

let _state = { active: false, until: 0 };
let _lastSlotStatus = '';

function isAbsent() {
  if (!_state.active) return false;
  if (Date.now() > _state.until) {
    _state.active = false;
    pushLog('SYS', `✅ Absence terminée`);
    return false;
  }
  return true;
}

async function _generatePhrase(untilTime) {
  try {
    const { text } = await callClaude(
      BOT_PERSONA,
      `Génère UNE seule phrase ultra courte (5-10 mots max, style texto français, pas de guillemets) pour dire que tu es absente et de retour vers ${untilTime}. Style Brainee : direct, naturel, pas de politesse forcée. Exemples : "pas là avant ${untilTime}", "back vers ${untilTime} à plus", "occupée, retour ${untilTime}". Réponds uniquement avec la phrase.`,
      35,
      BOT_PERSONA
    );
    return text.trim().replace(/^["'«»]|["'«»]$/g, '');
  } catch (_) {
    const fallbacks = [
      `pas là avant ${untilTime}`,
      `dispo vers ${untilTime}, à tout`,
      `retour vers ${untilTime}`,
      `back vers ${untilTime}`,
      `absente jusqu'à ${untilTime}`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// Retourne une phrase d'annonce ou null si pas d'absence déclenchée
async function maybeStartAbsence(slotStatus) {
  if (_state.active) return null;
  if (_lastSlotStatus === slotStatus) return null;
  _lastSlotStatus = slotStatus;

  const PROBA = {
    morning: 0.15,
    afternoon: 0.30,
    evening: 0.10,
    night: 0.20,
    sleep: 0,
  };
  const prob = PROBA[slotStatus] ?? 0.10;
  if (Math.random() > prob) return null;

  let durationMs = (2 + Math.random() * 3) * 60 * 60 * 1000; // 2-5h
  // Ne jamais promettre un retour APRÈS le coucher : on borne avant le dodo,
  // sinon "back vers 2h" alors qu'elle dort = promesse intenable.
  try {
    const bedH = getDailyFloatingSchedule()?.sleepHour ?? 24; // décimal (peut être > 24)
    const roomH = bedH - getParisHour();
    if (roomH <= 0.5) return null;                 // trop proche du dodo → pas d'absence
    const maxMs = (roomH - 0.25) * 3600000;
    if (durationMs > maxMs) durationMs = maxMs;
  } catch (_) {}

  _state.active = true;
  _state.until = Date.now() + durationMs;

  const untilTime = new Date(_state.until).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });

  pushLog('SYS', `🌙 Absence déclenchée jusqu'à ${untilTime} (slot: ${slotStatus})`);
  return { phrase: await _generatePhrase(untilTime), durationMs };
}

// Phrase de retour, postée à l'heure annoncée (planifiée par conversations.js).
async function generateComebackPhrase() {
  try {
    const { text } = await callClaude(
      BOT_PERSONA,
      `Tu reviens d'une absence que tu avais toi-même annoncée. Génère UNE phrase ultra courte (3-8 mots, style texto français, minuscules, sans guillemets, sans emoji) pour signaler que t'es de retour. Exemples : "re, j'suis là", "bon je reviens", "de retour, j'ai loupé quoi". Réponds uniquement avec la phrase.`,
      25, BOT_PERSONA, 'claude-haiku-4-5-20251001'
    );
    return text.trim().replace(/^["'«»]|["'«»]$/g, '');
  } catch (_) {
    const fb = ["re, j'suis là", 'bon je reviens', 'de retour', "re, j'ai loupé quoi"];
    return fb[Math.floor(Math.random() * fb.length)];
  }
}

module.exports = { isAbsent, maybeStartAbsence, generateComebackPhrase };
