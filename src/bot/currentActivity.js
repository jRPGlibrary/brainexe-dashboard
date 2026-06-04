/**
 * ================================================
 * 🕒 CURRENT ACTIVITY — ce que Brainee fait, en temps réel & cohérent
 * ================================================
 * Problème résolu : chaque message inventait son activité dans son coin.
 * La présence disait "je lance Metroid", le goodnight "j'ai maté 3 épisodes",
 * l'outreach reparlait du jeu — le tout en quelques minutes, avec des heures
 * et des durées inventées.
 *
 * Ici, UNE source de vérité :
 *   - une "soirée du jour" tirée déterministiquement (gaming / série / chill),
 *     stable sur la journée → résiste aux redémarrages éphémères Railway,
 *     exactement comme currentGame ;
 *   - une activité courante dérivée du slot + de l'heure Paris RÉELLE ;
 *   - des durées CALCULÉES depuis l'heure de début, jamais inventées.
 *
 * Conséquence : plus d'oscillation jeu↔série, plus d'heures auto-codées.
 * ================================================
 */

const { getCurrentGame } = require('./currentGame');
const { getParisHour } = require('./scheduling');

// Séries que Brainee binge — pool fidèle au persona (24 ans, internet-native,
// gaming/anime). Bingée sur plusieurs soirs comme une vraie spectatrice.
const SERIES_POOL = [
  { name: 'Cyberpunk Edgerunners' },
  { name: 'Frieren' },
  { name: 'Jujutsu Kaisen' },
  { name: 'Chainsaw Man' },
  { name: 'Cowboy Bebop' },
  { name: 'Arcane' },
  { name: 'Severance' },
  { name: 'The Bear' },
  { name: 'Fallout' },
  { name: 'The Last of Us' },
  { name: 'Black Mirror' },
];
const SERIES_WINDOW_DAYS = 3; // une série se binge sur ~3 soirs

// Soirées "chill" sans support narratif lourd (pas de sujet nommé)
const CHILL_ACTIVITIES = [
  'à scroller dans le vide',
  'dans un rabbit hole youtube',
  'à réécouter des OST de jeux',
  'à traîner sur le net sans but',
];

// Activités de journée (légères, pas de soirée)
const DAYTIME_ACTIVITIES = [
  'à bidouiller un truc dans mon coin',
  'le nez dans des articles',
  'à écouter de la musique en faisant deux-trois trucs',
  'à gérer des bricoles',
];

// PRNG déterministe [0,1) à partir d'un entier (aucune dépendance externe).
function pseudoRandom(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Numéro de jour Paris (stable au sein d'une journée).
function parisDayNumber() {
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return Math.floor(p.getTime() / 86400000);
}

function pickDet(arr, seed) {
  return arr[Math.floor(pseudoRandom(seed) * arr.length) % arr.length];
}

/**
 * Série du moment : stable sur une fenêtre de plusieurs jours, anti-répétition.
 */
function getCurrentSeries(dayN = parisDayNumber()) {
  const win = Math.floor(dayN / SERIES_WINDOW_DAYS);
  let idx = Math.floor(pseudoRandom(win * 7 + 3) * SERIES_POOL.length) % SERIES_POOL.length;
  const prev = Math.floor(pseudoRandom((win - 1) * 7 + 3) * SERIES_POOL.length) % SERIES_POOL.length;
  if (idx === prev) idx = (idx + 1) % SERIES_POOL.length;
  return SERIES_POOL[idx];
}

/**
 * Type de soirée, tiré 1×/jour, déterministe.
 * Persona gameuse → gaming majoritaire.
 */
function getEveningKind(dayN = parisDayNumber()) {
  const r = pseudoRandom(dayN * 13 + 5);
  if (r < 0.65) return 'gaming';
  if (r < 0.87) return 'series';
  return 'chill';
}

/**
 * Heure de début de la soirée (post-dîner), déterministe : ~19h45–20h45.
 */
function getEveningStartHour(dayN = parisDayNumber()) {
  return 19.75 + pseudoRandom(dayN * 17 + 9);
}

// ~45 min / épisode → nombre d'épisodes plausible depuis le temps écoulé.
function episodesFrom(elapsedH) {
  return Math.max(1, Math.floor(elapsedH / 0.75));
}

// Libellé de durée naturel, dérivé du temps réellement écoulé.
function elapsedLabel(elapsedH) {
  if (elapsedH < 0.75) return 'depuis pas longtemps';
  if (elapsedH < 1.75) return 'depuis une bonne heure';
  if (elapsedH < 2.75) return 'depuis deux bonnes heures';
  if (elapsedH < 3.75) return 'depuis trois heures bien tassées';
  return 'depuis un bon moment';
}

/**
 * L'activité de SOIRÉE du jour (indépendante de l'heure courante).
 * Utilisée par goodnight / night-wakeup / morning pour la continuité.
 * @returns {{kind:string, subject:string|null, label:string}}
 */
function getEveningActivity(dayN = parisDayNumber()) {
  const kind = getEveningKind(dayN);
  if (kind === 'series') {
    const s = getCurrentSeries(dayN);
    return { kind, subject: s.name, label: `devant ${s.name}` };
  }
  if (kind === 'chill') {
    return { kind, subject: null, label: pickDet(CHILL_ACTIVITIES, dayN * 23 + 11) };
  }
  const g = getCurrentGame();
  return { kind, subject: g.name, label: `sur ${g.name}` };
}

/**
 * Activité COURANTE, dérivée du slot + de l'heure Paris réelle.
 * @param {string} slotStatus  statut du slot (sleep/wakeup/.../gaming/latenight)
 * @param {number} [hour]      heure décimale Paris (défaut : réelle)
 * @returns {{kind, subject, label, sinceHour, elapsedH, episodes?}}
 */
function getCurrentActivity(slotStatus, hour = getParisHour()) {
  const dayN = parisDayNumber();
  const base = { subject: null, sinceHour: null, elapsedH: 0 };

  switch (slotStatus) {
    case 'sleep':      return { kind: 'sleep', label: 'à dormir', ...base };
    case 'wakeup':     return { kind: 'waking', label: 'à émerger doucement', ...base };
    case 'lunch':      return { kind: 'eating', label: 'à manger', ...base };
    case 'transition': return { kind: 'transition', label: 'à sortir vite fait', ...base };
    default: break;
  }

  // Soirée (gaming / latenight) → l'activité de soirée + durée réelle
  if (slotStatus === 'gaming' || slotStatus === 'latenight') {
    const ev = getEveningActivity(dayN);
    const start = getEveningStartHour(dayN);
    const elapsedH = Math.max(0, hour - start);
    const out = { kind: ev.kind, subject: ev.subject, label: ev.label, sinceHour: start, elapsedH };
    if (ev.kind === 'series') out.episodes = episodesFrom(elapsedH);
    return out;
  }

  // Journée (active / productive / défaut)
  return { kind: 'daytime', label: pickDet(DAYTIME_ACTIVITIES, dayN * 29 + 7), ...base };
}

/**
 * Angle de fin de soirée cohérent avec ce que Brainee a RÉELLEMENT fait ce soir.
 * Durées/épisodes calculés depuis l'heure de début, jamais inventés.
 */
function buildGoodnightAngle(hour = getParisHour()) {
  const dayN = parisDayNumber();
  const ev = getEveningActivity(dayN);
  const elapsedH = Math.max(0, hour - getEveningStartHour(dayN));

  if (ev.kind === 'series') {
    const ep = episodesFrom(elapsedH);
    return `t'as enchaîné ${ep} épisode${ep > 1 ? 's' : ''} de ${ev.subject} d'affilée, t'as le cerveau en compote, tu coupes`;
  }
  if (ev.kind === 'chill') {
    return `t'étais ${ev.label} ${elapsedLabel(elapsedH)}, t'as vu l'heure et tu débranches`;
  }
  return `t'étais ${ev.label} ${elapsedLabel(elapsedH)}, tu lâches enfin la manette pour ce soir`;
}

module.exports = {
  SERIES_POOL,
  getCurrentSeries,
  getEveningKind,
  getEveningStartHour,
  getEveningActivity,
  getCurrentActivity,
  buildGoodnightAngle,
  episodesFrom,
  elapsedLabel,
};
