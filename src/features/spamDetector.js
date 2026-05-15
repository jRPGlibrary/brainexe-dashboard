/**
 * ================================================
 * 🚨 SPAM DETECTOR v1.0.0
 * ================================================
 * Détecte et modère automatiquement les spammeurs sur le serveur.
 *
 * Règles de détection :
 *   flood       — 5+ messages en 5 secondes
 *   duplicate   — 3+ messages identiques en 10 secondes
 *   mention_spam — 4+ utilisateurs/rôles mentionnés dans un seul message
 *   link_spam   — 3+ messages avec liens en 8 secondes
 *
 * Actions :
 *   1ère offense  → timeout (10 min pour link_spam, 30 min sinon)
 *   2ème offense (24h) → kick
 *   flood extrême (10+ en 3s) → kick direct
 *
 * Les admins et membres avec ManageMessages sont exemptés.
 * Message de modération entièrement généré par Claude (Haiku).
 * ================================================
 */

const { PermissionFlagsBits } = require('discord.js');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const shared = require('../shared');

// Tracking en mémoire : userId → [{ ts, content, mentionCount }]
const msgTracker = new Map();
// Infractions : userId → { count, lastAt }
const offenseTracker = new Map();

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const cutoff = Date.now() - 30000;
  for (const [userId, msgs] of msgTracker) {
    const filtered = msgs.filter(m => m.ts > cutoff);
    if (filtered.length === 0) msgTracker.delete(userId);
    else msgTracker.set(userId, filtered);
  }
}, 60 * 1000);

function getRecent(userId, windowMs) {
  const msgs = msgTracker.get(userId) || [];
  const cutoff = Date.now() - windowMs;
  return msgs.filter(m => m.ts > cutoff);
}

function trackMsg(userId, content, mentionCount) {
  if (!msgTracker.has(userId)) msgTracker.set(userId, []);
  msgTracker.get(userId).push({ ts: Date.now(), content: content.slice(0, 300), mentionCount });
}

function detectSpam(userId, content) {
  // Flood : 5+ messages en 5 secondes (10+ en 3s = extrême)
  const recent5s = getRecent(userId, 5000);
  if (recent5s.length >= 5) {
    const recent3s = getRecent(userId, 3000);
    return { type: 'flood', severity: recent3s.length >= 10 ? 'extreme' : 'high' };
  }

  // Duplicate : 3+ messages identiques en 10 secondes
  const recent10s = getRecent(userId, 10000);
  const norm = content.toLowerCase().trim().slice(0, 100);
  const dupes = recent10s.filter(m => m.content.toLowerCase().trim().slice(0, 100) === norm);
  if (dupes.length >= 3) {
    return { type: 'duplicate', severity: 'high' };
  }

  // Link spam : 3+ messages avec liens en 8 secondes
  const hasLink = /https?:\/\/|discord\.gg\//i.test(content);
  if (hasLink) {
    const recentLinks = getRecent(userId, 8000).filter(m => /https?:\/\/|discord\.gg\//i.test(m.content));
    if (recentLinks.length >= 3) {
      return { type: 'link_spam', severity: 'medium' };
    }
  }

  return null;
}

function detectMentionSpam(mentionCount) {
  if (mentionCount >= 4) {
    return { type: 'mention_spam', severity: 'high' };
  }
  return null;
}

function getOffenseCount(userId) {
  const o = offenseTracker.get(userId);
  if (!o) return 0;
  if (Date.now() - o.lastAt > 24 * 60 * 60 * 1000) {
    offenseTracker.delete(userId);
    return 0;
  }
  return o.count;
}

function addOffense(userId) {
  const o = offenseTracker.get(userId) || { count: 0, lastAt: 0 };
  offenseTracker.set(userId, { count: o.count + 1, lastAt: Date.now() });
}

async function generateModMessage(userId, username, spamType, action) {
  const spamDescs = {
    flood:        `${username} a spammé des messages en rafale`,
    duplicate:    `${username} a répété le même message en boucle`,
    mention_spam: `${username} a mentionné une masse de gens d'un coup`,
    link_spam:    `${username} a posté des liens en rafale`,
  };
  const actionDescs = {
    timeout: 'tu viens de le/la mettre en timeout',
    kick:    "tu viens de l'exclure du serveur",
  };

  try {
    const { text } = await callClaude(
      `${spamDescs[spamType] || `${username} a spammé`}. ${actionDescs[action] || 'tu as pris une action'}.`,
      `UNE phrase max, style Brainee, naturel et direct, en français. Mentionne <@${userId}>. Pas d'emoji sauf si vraiment adapté. Juste la phrase brute.`,
      80,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return null;
  }
}

async function applyModeration(message, spamResult) {
  const { type, severity } = spamResult;
  const userId = message.author.id;
  const username = message.author.username;

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    // Exemption : admins et modérateurs
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) return;

    // Suppression des messages récents du spammeur
    try {
      const recentMsgs = await message.channel.messages.fetch({ limit: 15 });
      const toDelete = [...recentMsgs.values()].filter(m => m.author.id === userId);
      if (toDelete.length > 0) {
        await message.channel.bulkDelete(toDelete).catch(async () => {
          for (const m of toDelete) await m.delete().catch(() => {});
        });
      }
    } catch (_) {}

    addOffense(userId);
    const offenseCount = getOffenseCount(userId);

    let action;
    let timeoutMin;

    if (severity === 'extreme' || offenseCount >= 2) {
      action = 'kick';
    } else {
      action = 'timeout';
      timeoutMin = type === 'link_spam' ? 10 : 30;
    }

    if (action === 'timeout') {
      await member.timeout(timeoutMin * 60 * 1000, `Spam [${type}] — détecté automatiquement par Brainee`);
      pushLog('SYS', `⏱️ Spam timeout [${type}] → ${username} (${timeoutMin} min)`, 'warning');
    } else {
      await member.kick(`Spam [${type}] — détecté automatiquement par Brainee`);
      pushLog('SYS', `👢 Spam kick [${type}] → ${username}`, 'warning');
    }

    const modMsg = await generateModMessage(userId, username, type, action);
    if (modMsg) {
      await message.channel.send(modMsg).catch(() => {});
    }

  } catch (err) {
    pushLog('ERR', `Spam modération échouée : ${err.message}`, 'error');
  }
}

/**
 * Point d'entrée principal — à appeler sur chaque MessageCreate serveur.
 * Retourne true si du spam a été détecté (et l'action lancée).
 *
 * @param {import('discord.js').Message} message
 * @returns {Promise<boolean>}
 */
async function checkAndHandleSpam(message) {
  if (!message.guild || message.guild.id !== GUILD_ID) return false;
  if (message.author.bot) return false;

  const content = message.content || '';
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;

  // Mention spam : vérification avant tracking (pas besoin d'historique)
  const mentionSpam = detectMentionSpam(mentionCount);
  if (mentionSpam) {
    pushLog('SYS', `🚨 Mention spam [${mentionSpam.severity}] → ${message.author.username}`);
    await applyModeration(message, mentionSpam);
    return true;
  }

  trackMsg(message.author.id, content, mentionCount);
  const spamResult = detectSpam(message.author.id, content);

  if (!spamResult) return false;

  pushLog('SYS', `🚨 Spam détecté [${spamResult.type}/${spamResult.severity}] → ${message.author.username}`);
  await applyModeration(message, spamResult);
  return true;
}

module.exports = { checkAndHandleSpam };
