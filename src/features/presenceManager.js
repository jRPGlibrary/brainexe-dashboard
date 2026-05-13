/**
 * ================================================
 * 🔴 PRESENCE MANAGER v1.0.0
 * ================================================
 * Gère le statut Discord de Brainee en temps réel.
 * - Busy excuse → override DND/Idle
 * - Slot horaire → Online/Idle/DND/Invisible automatique
 * ================================================
 */

const discord_js = require('discord.js');
const ActivityType = discord_js.ActivityType;
const shared = require('../shared');
const { pushLog } = require('../logger');

// Statut par raison d'absence (busy excuse override)
const REASON_MAP = {
  eating:   { status: 'dnd',  name: '🍕 déjeuner',     type: ActivityType.Playing },
  resting:  { status: 'idle', name: '😴 au repos',      type: ActivityType.Playing },
  gaming:   { status: 'dnd',  name: '🎮 joue à NTE',    type: ActivityType.Playing },
  browsing: { status: 'idle', name: '🌐 sur le web',     type: ActivityType.Playing },
  outside:  { status: 'idle', name: '🚶 dehors',         type: ActivityType.Playing },
};

// Statut par slot horaire (présence passive naturelle)
const SLOT_PRESENCE = {
  sleep:      { status: 'invisible', activity: null },
  wakeup:     { status: 'idle',      activity: '☕ réveil' },
  active:     { status: 'online',    activity: null },
  lunch:      { status: 'dnd',       activity: '🍕 pause déj' },
  productive: { status: 'online',    activity: null },
  transition: { status: 'idle',      activity: '🚶 dehors' },
  gaming:     { status: 'dnd',       activity: '🎮 gaming' },
  latenight:  { status: 'idle',      activity: '🌙 hyperfocus' },
};

// Garde une trace si un busy excuse est actif pour ne pas écraser l'override
let _busyActive = false;

function setOccupied(reason) {
  const cfg = REASON_MAP[reason] || REASON_MAP.browsing;
  _busyActive = true;
  try {
    shared.discord.user.setPresence({
      status: cfg.status,
      activities: [{ name: cfg.name, type: cfg.type }],
    });
    pushLog('SYS', `🔴 Présence → ${cfg.status} · ${cfg.name}`);
  } catch (_) {}
}

function setAvailable() {
  _busyActive = false;
  try {
    shared.discord.user.setPresence({ status: 'online', activities: [] });
    pushLog('SYS', '🟢 Présence → online');
  } catch (_) {}
}

/**
 * Met à jour le statut Discord selon le slot horaire actif.
 * Ignoré si un busy excuse est en cours (override prioritaire).
 */
function setSlotPresence(slotStatus) {
  if (_busyActive) return; // busy excuse override prioritaire
  const cfg = SLOT_PRESENCE[slotStatus] || SLOT_PRESENCE.active;
  try {
    const activities = cfg.activity
      ? [{ name: cfg.activity, type: ActivityType.Playing }]
      : [];
    shared.discord.user.setPresence({ status: cfg.status, activities });
    if (slotStatus !== 'active' && slotStatus !== 'productive') {
      pushLog('SYS', `🔵 Présence slot → ${cfg.status}${cfg.activity ? ' · ' + cfg.activity : ''}`);
    }
  } catch (_) {}
}

module.exports = { setOccupied, setAvailable, setSlotPresence };
