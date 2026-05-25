const { MIN_GAP_ANY_POST } = require('../config');

const WEEKDAY_SLOTS = [
  { start: 0,    end: 9,    status: 'sleep',       maxConv: 0, interval: null, modes: [],                   mentionDelay: null,        label: '💤 Dort' },
  { start: 9,    end: 10,   status: 'wakeup',      maxConv: 1, interval: null, modes: ['simple','chaos'],   mentionDelay: [0.1, 1],    label: '☕ Réveil mou' },
  { start: 10,   end: 12.5, status: 'active',      maxConv: 3, interval: 35,   modes: ['all'],              mentionDelay: [0.08, 0.5], label: '🧠 Active' },
  { start: 12.5, end: 14,   status: 'lunch',       maxConv: 0, interval: null, modes: [],                   mentionDelay: [2, 8],      label: '🍕 Pause déj' },
  { start: 14,   end: 17,   status: 'productive',  maxConv: 4, interval: 25,   modes: ['all'],              mentionDelay: [0.1, 0.75], label: '⚡ Productive' },
  { start: 17,   end: 18,   status: 'transition',  maxConv: 1, interval: null, modes: ['simple'],           mentionDelay: [0.5, 2],    label: '🚶 Transition' },
  { start: 18,   end: 23.5, status: 'gaming',      maxConv: 6, interval: 18,   modes: ['all'],              mentionDelay: [0.08, 0.33],label: '🎮 Gaming', priority: ['débat', 'deep'] },
  { start: 23.5, end: 24,   status: 'latenight',   maxConv: 1, interval: null, modes: ['chaos', 'deep'],    mentionDelay: [1, 5],      label: '🌙 Hyperfocus' },
];

const SATURDAY_SLOTS = [
  { start: 0,    end: 9,    status: 'sleep',   maxConv: 0, interval: null, modes: [],                   mentionDelay: null,         label: '💤 Dort' },
  { start: 9,    end: 10.5, status: 'wakeup',  maxConv: 2, interval: null, modes: ['simple','chaos'],   mentionDelay: [0.1, 1],     label: '☕ Réveil samedi' },
  { start: 10.5, end: 14,   status: 'active',  maxConv: 4, interval: 28,   modes: ['all'],              mentionDelay: [0.08, 0.5],  label: '🧠 Matinée samedi' },
  { start: 14,   end: 15.5, status: 'lunch',   maxConv: 1, interval: null, modes: ['simple','chaos'],   mentionDelay: [1, 5],       label: '🍕 Pause relax' },
  { start: 15.5, end: 18,   status: 'active',  maxConv: 5, interval: 20,   modes: ['all'],              mentionDelay: [0.08, 0.5],  label: '⚡ Aprèm samedi' },
  { start: 18,   end: 24,   status: 'gaming',  maxConv: 8, interval: 15,   modes: ['all'],              mentionDelay: [0.05, 0.25], label: '🎮 Soirée max samedi', priority: ['débat','deep','chaos'] },
];

const SUNDAY_SLOTS = [
  { start: 0,  end: 10, status: 'sleep',    maxConv: 0, interval: null, modes: [],                  mentionDelay: null,       label: '💤 Dort tard' },
  { start: 10, end: 12, status: 'wakeup',   maxConv: 2, interval: null, modes: ['simple','deep'],   mentionDelay: [0.5, 2],   label: '☕ Dimanche lent' },
  { start: 12, end: 18, status: 'active',   maxConv: 4, interval: 30,   modes: ['all'],             mentionDelay: [0.1, 1],   label: '🎮 Aprèm dimanche', priority: ['deep','simple'] },
  { start: 18, end: 23, status: 'gaming',   maxConv: 4, interval: 22,   modes: ['all'],             mentionDelay: [0.1, 0.5], label: '🌙 Soirée dimanche', priority: ['deep'] },
  { start: 23, end: 24, status: 'latenight',maxConv: 1, interval: null, modes: ['chaos','deep'],    mentionDelay: [1, 5],     label: '🌙 Fin dimanche' },
];

function getParisHour() {
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return p.getHours() + p.getMinutes() / 60;
}

function getParisDay() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getDay();
}

let forcedSlotStatus = null;

function getAllSlots() {
  const seen = new Set();
  const all = [];
  [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS, ...SUNDAY_SLOTS].forEach(s => {
    if (!seen.has(s.status)) { seen.add(s.status); all.push(s); }
  });
  return all;
}

function getCurrentSlot() {
  if (forcedSlotStatus) {
    const all = [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS, ...SUNDAY_SLOTS];
    const found = all.find(s => s.status === forcedSlotStatus);
    if (found) return found;
  }

  const h = getParisHour();
  const d = getParisDay();
  const base = d === 6 ? SATURDAY_SLOTS : d === 0 ? SUNDAY_SLOTS : WEEKDAY_SLOTS;
  const get = s => base.find(sl => sl.status === s) || WEEKDAY_SLOTS.find(sl => sl.status === s);

  // Planning dynamique journalier (C) — fallback sur grille statique si indisponible
  try {
    const { getDailyFloatingSchedule } = require('./adaptiveSchedule');
    const sched = getDailyFloatingSchedule();
    if (sched?.wakeHour !== undefined) {
      const { wakeHour, lunchStart, dinnerStart, sleepHour } = sched;
      const wakeEnd           = wakeHour + 0.75;
      const lunchEnd          = lunchStart + 1.5;
      const dinnerEnd         = dinnerStart + 1.5;
      const clampedSleep      = Math.min(sleepHour, 24);
      // latenight commence 30 min avant le dodo, max 23h30
      const latenightStart    = Math.max(dinnerEnd + 0.5, Math.min(sleepHour - 0.5, 23.5));

      if (h < wakeHour || h >= clampedSleep) return get('sleep');
      if (h < wakeEnd)                        return get('wakeup');
      if (h < lunchStart)                     return get('active');
      if (h < lunchEnd)                       return get('lunch');
      if (h < dinnerStart)                    return get('productive');
      if (h < dinnerEnd)                      return get('lunch');  // dîner → propriétés lunch
      if (h < latenightStart)                 return get('gaming');
      return get('latenight');
    }
  } catch (_) {}

  // Grille statique (fallback)
  return base.find(s => h >= s.start && h < s.end) || base[0];
}

function setForcedSlot(status) {
  forcedSlotStatus = status || null;
}

function getForcedSlot() { return forcedSlotStatus; }

function getRandomMode(slot) {
  const { CONV_MODES } = require('./persona');
  const available = slot.modes.includes('all') ? CONV_MODES : CONV_MODES.filter(m => slot.modes.includes(m.name));
  if (!available.length) return CONV_MODES[Math.floor(Math.random() * CONV_MODES.length)];
  if (slot.priority?.length && Math.random() < 0.6) {
    const prio = available.filter(m => slot.priority.includes(m.name));
    if (prio.length) return prio[Math.floor(Math.random() * prio.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function getMentionDelayMs(slot) {
  if (!slot?.mentionDelay) return 0;
  const [mn, mx] = slot.mentionDelay;
  return Math.floor((mn + Math.random() * (mx - mn)) * 60 * 1000);
}

function getSlotIntervalMs(slot) {
  if (!slot?.interval) return MIN_GAP_ANY_POST;
  return Math.max(slot.interval * 60 * 1000, 15 * 60 * 1000);
}

const FRENCH_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FRENCH_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function getTemporalBlock() {
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = FRENCH_DAYS[paris.getDay()];
  const date = paris.getDate();
  const month = FRENCH_MONTHS[paris.getMonth()];
  const year = paris.getFullYear();
  const hh = String(paris.getHours()).padStart(2, '0');
  const mm = String(paris.getMinutes()).padStart(2, '0');
  return `📅 Contexte temporel (usage INTERNE uniquement) : ${day} ${date} ${month} ${year}, ${hh}h${mm} Paris. Sers-toi de cette info pour interpréter les messages (ex : "ce matin", "hier soir") MAIS NE LA CITE JAMAIS dans ta réponse. Ne dis JAMAIS "il est Xh", "on est lundi", "c'est samedi matin" — les gens le savent déjà.`;
}

module.exports = {
  WEEKDAY_SLOTS, SATURDAY_SLOTS, SUNDAY_SLOTS,
  getParisHour, getParisDay, getCurrentSlot,
  getRandomMode, getMentionDelayMs, getSlotIntervalMs,
  setForcedSlot, getForcedSlot, getAllSlots,
  getTemporalBlock,
};
