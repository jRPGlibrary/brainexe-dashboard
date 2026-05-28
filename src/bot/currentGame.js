/**
 * ================================================
 * 🎮 CURRENT GAME — jeu du moment cohérent & rotatif
 * ================================================
 * Problème résolu : sans état partagé, chaque message demandait à Haiku
 * "à quel jeu tu joues ?" et il répondait toujours le plus iconique
 * (Elden Ring). Résultat : Brainee parlait d'Elden Ring tous les soirs.
 *
 * Ici, on fixe UN jeu "du moment" sur une fenêtre de quelques jours,
 * comme une vraie gameuse qui avance dans un jeu avant de passer au suivant.
 *
 * - Déterministe (basé sur le jour Paris) → résistant aux redémarrages
 *   éphémères de Railway : pas de jeu qui change en plein milieu.
 * - Pool large et équilibré entre genres → Elden Ring n'est qu'1 jeu sur ~28.
 * - Anti-répétition entre deux fenêtres consécutives.
 * ================================================
 */

// Pool tiré de la CULTURE GAMING du persona, volontairement équilibré :
// les soulslike (sur-représentés par défaut) ne sont qu'une petite minorité.
const GAME_POOL = [
  // JRPG
  { name: 'Final Fantasy XVI', genre: 'jrpg' },
  { name: 'Persona 5 Royal', genre: 'jrpg' },
  { name: 'Dragon Quest XI', genre: 'jrpg' },
  { name: 'Xenoblade Chronicles 3', genre: 'jrpg' },
  { name: 'Tales of Arise', genre: 'jrpg' },
  { name: 'Octopath Traveler II', genre: 'jrpg' },
  { name: 'Fire Emblem Three Houses', genre: 'jrpg' },
  { name: 'Chrono Trigger', genre: 'jrpg' },
  // Metroidvania / action-platformer
  { name: 'Hollow Knight', genre: 'metroidvania' },
  { name: 'Castlevania Symphony of the Night', genre: 'metroidvania' },
  { name: 'Metroid Dread', genre: 'metroidvania' },
  { name: 'Blasphemous 2', genre: 'metroidvania' },
  { name: 'Dead Cells', genre: 'metroidvania' },
  { name: 'Ori and the Will of the Wisps', genre: 'metroidvania' },
  { name: 'Bloodstained Ritual of the Night', genre: 'metroidvania' },
  { name: 'Mega Man X', genre: 'metroidvania' },
  // Indie
  { name: 'Hades', genre: 'indie' },
  { name: 'Celeste', genre: 'indie' },
  { name: 'Stardew Valley', genre: 'indie' },
  { name: 'Disco Elysium', genre: 'indie' },
  { name: 'Undertale', genre: 'indie' },
  { name: 'Cuphead', genre: 'indie' },
  // Retro
  { name: 'Super Metroid', genre: 'retro' },
  { name: 'Final Fantasy VI', genre: 'retro' },
  { name: 'The Legend of Zelda A Link to the Past', genre: 'retro' },
  // Soulslike (minoritaires — fini le monopole Elden Ring)
  { name: 'Elden Ring', genre: 'soulslike' },
  { name: 'Sekiro', genre: 'soulslike' },
  { name: 'Lies of P', genre: 'soulslike' },
];

// Durée d'une "run" sur un même jeu, en jours.
const WINDOW_DAYS = 4;

// PRNG déterministe [0,1) à partir d'un entier (pas de dépendance externe).
function pseudoRandom(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Numéro de jour Paris (change une fois par jour, stable au sein d'une journée).
function parisDayNumber() {
  const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return Math.floor(parisNow.getTime() / 86400000);
}

function pickForWindow(windowIndex) {
  return Math.floor(pseudoRandom(windowIndex) * GAME_POOL.length) % GAME_POOL.length;
}

/**
 * Retourne le jeu du moment : { name, genre }.
 * Stable sur une fenêtre de WINDOW_DAYS jours, anti-répétition d'une fenêtre à l'autre.
 */
function getCurrentGame() {
  const windowIndex = Math.floor(parisDayNumber() / WINDOW_DAYS);
  let idx = pickForWindow(windowIndex);
  if (idx === pickForWindow(windowIndex - 1)) {
    idx = (idx + 1) % GAME_POOL.length; // évite deux fenêtres d'affilée sur le même jeu
  }
  return GAME_POOL[idx];
}

function getCurrentGameName() {
  return getCurrentGame().name;
}

module.exports = { getCurrentGame, getCurrentGameName, GAME_POOL };
