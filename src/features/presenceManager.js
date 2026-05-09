/**
 * ================================================
 * 🔴 PRESENCE MANAGER v0.16.0
 * ================================================
 * Gère le statut Discord de Brainee en temps réel.
 * Quand elle prétexte une absence, son statut change.
 * Quand elle revient, il repasse en ligne automatiquement.
 * ================================================
 */

const discord_js = require('discord.js');
const ActivityType = discord_js.ActivityType;
const shared = require('../shared');
const { pushLog } = require('../logger');

const REASON_MAP = {
  eating:   { status: 'dnd',  name: '🍕 déjeuner',     type: ActivityType.Playing },
  resting:  { status: 'idle', name: '😴 au repos',      type: ActivityType.Playing },
  gaming:   { status: 'dnd',  name: '🎮 joue à NTE',    type: ActivityType.Playing },
  browsing: { status: 'idle', name: '🌐 sur le web',     type: ActivityType.Playing },
  outside:  { status: 'idle', name: '🚶 dehors',         type: ActivityType.Playing },
};

function setOccupied(reason) {
  const cfg = REASON_MAP[reason] || REASON_MAP.browsing;
  try {
    shared.discord.user.setPresence({
      status: cfg.status,
      activities: [{ name: cfg.name, type: cfg.type }],
    });
    pushLog('SYS', `🔴 Présence → ${cfg.status} · ${cfg.name}`);
  } catch (_) {}
}

function setAvailable() {
  try {
    shared.discord.user.setPresence({ status: 'online', activities: [] });
    pushLog('SYS', '🟢 Présence → online');
  } catch (_) {}
}

module.exports = { setOccupied, setAvailable };
