const { pushLog } = require('../logger');

let _state = { active: false, until: 0 };
let _lastSlotStatus = '';

const PHRASES = [
  "pas là avant {time}, gérez sans moi",
  "dispo vers {time}, à tout",
  "j'ai un truc, je reviens vers {time}",
  "absente jusqu'à {time} à peu près",
  "on se retrouve vers {time}",
  "je passe, retour vers {time}",
  "occupée là, {time} max",
  "à {time} les gens",
  "je disparais jusqu'à {time}",
  "j'ai à faire, retour genre {time}",
  "je suis off jusqu'à {time}",
  "pas dispo de l'aprem, retour vers {time}",
  "quelque chose à gérer, {time} au plus tôt",
  "je suis pas là, revenez vers {time}",
  "back vers {time}, à plus",
];

function isAbsent() {
  if (!_state.active) return false;
  if (Date.now() > _state.until) {
    _state.active = false;
    pushLog('SYS', `✅ Absence terminée`);
    return false;
  }
  return true;
}

// Retourne une phrase d'annonce ou null si pas d'absence déclenchée
function maybeStartAbsence(slotStatus) {
  if (_state.active) return null;
  if (_lastSlotStatus === slotStatus) return null; // déjà évalué pour ce slot
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

  const durationMs = (2 + Math.random() * 3) * 60 * 60 * 1000; // 2-5h
  _state.active = true;
  _state.until = Date.now() + durationMs;

  const untilTime = new Date(_state.until).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });

  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)].replace('{time}', untilTime);
  pushLog('SYS', `🌙 Absence déclenchée jusqu'à ${untilTime} (slot: ${slotStatus})`);
  return phrase;
}

function getAbsenceUntil() {
  return _state.until;
}

module.exports = { isAbsent, maybeStartAbsence, getAbsenceUntil };
