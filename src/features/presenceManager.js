/**
 * ================================================
 * 🔴 PRESENCE MANAGER v2.0.0
 * ================================================
 * Gère le statut Discord de Brainee en temps réel.
 * - Busy excuse → override DND/Idle avec activité générée par Haiku
 * - Slot horaire → Online/Idle/DND/Invisible + activité générée par Haiku
 * - Cache par slot : Haiku appelé uniquement au changement de slot
 * ================================================
 */

const discord_js = require('discord.js');
const ActivityType = discord_js.ActivityType;
const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');

// Statut Discord (dnd/idle/online/invisible) — ne change pas
const REASON_STATUS = {
  eating:   'dnd',
  resting:  'idle',
  gaming:   'dnd',
  browsing: 'idle',
  outside:  'idle',
};

const SLOT_STATUS = {
  sleep:      'invisible',
  wakeup:     'idle',
  active:     'online',
  lunch:      'dnd',
  productive: 'online',
  transition: 'idle',
  gaming:     'dnd',
  latenight:  'idle',
};

// Emojis par contexte
const REASON_EMOJI = { eating: '🍕', resting: '😴', gaming: '🎮', browsing: '🌐', outside: '🚶' };
const SLOT_EMOJI   = { wakeup: '☕', lunch: '🍕', transition: '🚶', gaming: '🎮', latenight: '🌙' };

// Contexte Haiku — ce que Brainee fait réellement
const REASON_CONTEXT = {
  eating:   'tu es en train de manger',
  resting:  'tu te reposes un moment',
  gaming:   'tu es en pleine session de jeu et tu peux pas lâcher',
  browsing: 'tu es tombée dans un rabbit hole sur le web',
  outside:  'tu sors rapidement faire un truc',
};

const SLOT_CONTEXT = {
  wakeup:     'tu viens de te réveiller et tu es encore zombie',
  lunch:      'tu fais une pause déjeuner',
  transition: 'tu sors rapidement',
  gaming:     'tu es en pleine session de jeu',
  latenight:  'il est tard, tu traînes ou tu es en hyperfocus',
};

let _busyActive = false;
let _lastSlotKey = '';
let _cachedSlotActivity = '';

async function _generateActivity(emoji, context) {
  try {
    const { text } = await callClaude(
      '',
      `Génère une activité Discord ultra courte (max 28 caractères, sans guillemets, en minuscules, style naturel Brainee) pour dire que ${context}. Format : phrase nominale courte comme "s'acharne sur un boss", "kebab du mercredi", "dans youtube depuis 2h", "essaie de dormir". Texte brut uniquement, pas de ponctuation finale.`,
      18,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const clean = text.trim().replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]$/, '').slice(0, 35);
    return emoji ? `${emoji} ${clean}` : clean;
  } catch (_) {
    return null;
  }
}

async function setOccupied(reason) {
  const status = REASON_STATUS[reason] || 'idle';
  const emoji  = REASON_EMOJI[reason] || '🌐';
  const ctx    = REASON_CONTEXT[reason] || 'tu es occupée';
  _busyActive  = true;
  const name   = await _generateActivity(emoji, ctx);
  try {
    shared.discord.user.setPresence({
      status,
      activities: name ? [{ name, type: ActivityType.Playing }] : [],
    });
    pushLog('SYS', `🔴 Présence → ${status} · ${name || '(occupation)'}`);
  } catch (_) {}
}

function setAvailable() {
  _busyActive = false;
  try {
    shared.discord.user.setPresence({ status: 'online', activities: [] });
    pushLog('SYS', '🟢 Présence → online');
  } catch (_) {}
}

async function setSlotPresence(slotStatus) {
  if (_busyActive) return;
  const status = SLOT_STATUS[slotStatus] || 'online';
  const emoji  = SLOT_EMOJI[slotStatus];
  const ctx    = SLOT_CONTEXT[slotStatus];

  // Slots sans activité affichée (active, productive, sleep)
  if (!ctx) {
    if (_lastSlotKey !== slotStatus) {
      _lastSlotKey = slotStatus;
      _cachedSlotActivity = '';
    }
    try { shared.discord.user.setPresence({ status, activities: [] }); } catch (_) {}
    return;
  }

  // Régénère uniquement au changement de slot
  if (_lastSlotKey !== slotStatus) {
    _lastSlotKey = slotStatus;
    const generated = await _generateActivity(emoji, ctx);
    _cachedSlotActivity = generated || '';
    pushLog('SYS', `🔵 Présence slot → ${status}${_cachedSlotActivity ? ' · ' + _cachedSlotActivity : ''}`);
  }

  try {
    const activities = _cachedSlotActivity
      ? [{ name: _cachedSlotActivity, type: ActivityType.Playing }]
      : [];
    shared.discord.user.setPresence({ status, activities });
  } catch (_) {}
}

module.exports = { setOccupied, setAvailable, setSlotPresence };
