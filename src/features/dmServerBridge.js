const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { sanitizeForJson } = require('../utils');
const { getSmartMemory, formatSmartMemory } = require('../db/intelligentMemory');
const { getCurrentSlot } = require('../bot/scheduling');
const { GUILD_ID } = require('../config');

// Récupérer le contexte récent du serveur pour une personne
// Filtre source='server' pour ne pas mélanger DM et serveur dans le contexte
async function getServerContextForUser(userId, userName, limit = 12) {
  if (!shared.mongoDb) return '';

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Limite dynamique : user très actif (5+ messages en 48h) = contexte frais, moins d'historique
    const recentCount = await shared.mongoDb.collection('messageLog')
      .countDocuments({ authorId: userId, source: 'server', createdAt: { $gte: since48h } });
    const dynamicLimit = recentCount >= 5 ? 5 : recentCount >= 2 ? 8 : limit;

    const recentMessages = await shared.mongoDb
      .collection('messageLog')
      .find({ authorId: userId, source: 'server', createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(dynamicLimit)
      .toArray();

    if (!recentMessages.length) return '';

    return recentMessages
      .map(m => {
        const ago = humanizeAgo(m.createdAt);
        return `[#${m.channelName} • ${ago}] ${(m.content || '').slice(0, 120)}`;
      })
      .join('\n');
  } catch {
    return '';
  }
}

// Récupère les derniers DMs (côté logMessageForBridge) — utile pour le lien serveur → DM
async function getDmContextForUser(userId, limit = 8) {
  if (!shared.mongoDb) return '';
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Limite dynamique côté DM aussi
    const recentCount = await shared.mongoDb.collection('messageLog')
      .countDocuments({ authorId: userId, source: 'dm', createdAt: { $gte: since48h } });
    const dynamicLimit = recentCount >= 4 ? 4 : recentCount >= 2 ? 6 : limit;

    const recent = await shared.mongoDb
      .collection('messageLog')
      .find({ authorId: userId, source: 'dm', createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(dynamicLimit)
      .toArray();
    if (!recent.length) return '';
    return recent
      .map(m => `[DM • ${humanizeAgo(m.createdAt)}] ${(m.content || '').slice(0, 120)}`)
      .join('\n');
  } catch {
    return '';
  }
}

function humanizeAgo(date) {
  if (!date) return 'récent';
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.round(hours / 24);
  return `il y a ${days}j`;
}

// Enrichir un contexte DM avec le contexte serveur — version directe sans appel LLM
// On injecte le contexte brut, Claude fera le lien naturellement.
// Évite un appel LLM par DM (économie de tokens significative).
async function enrichDMWithServerContext(userId, userName, dmContent) {
  try {
    const serverContext = await getServerContextForUser(userId, userName, 10);
    if (!serverContext) return dmContent;

    // Mémoire intelligente utilisateur
    const userMemory = await getSmartMemory(userId, 'user');
    const memoryBlock = formatSmartMemory(userMemory);

    const linkBlock = [
      `\n\n[🔗 PONT SERVEUR→DM — Ce que ${userName} a dit récemment sur le serveur, utilise ce contexte pour faire la liaison naturellement sans le mentionner explicitement] :`,
      serverContext,
      memoryBlock ? `\n[Notes mémoire cross-canal]\n${memoryBlock}` : '',
    ].filter(Boolean).join('\n');

    return `${dmContent}${linkBlock}`;
  } catch {
    return dmContent;
  }
}

// Enrichit un message serveur avec le contexte DM — pour que Brainee fasse le lien dans l'autre sens
async function enrichServerWithDmContext(userId, userName) {
  try {
    const dmContext = await getDmContextForUser(userId, 6);
    if (!dmContext) return '';
    return `\n[🔗 PONT DM→SERVEUR — Échanges privés récents avec ${userName} à prendre en compte si pertinent, sans le mentionner explicitement] :\n${dmContext}`;
  } catch {
    return '';
  }
}

// Récupérer les sujets du serveur qu'une personne a mentionnés
async function getRecentTopicsForUser(userId) {
  if (!shared.mongoDb) return [];

  try {
    const messages = await shared.mongoDb
      .collection('messageLog')
      .find({ authorId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Extraire les sujets/topics mentionnés
    const topics = [];
    messages.forEach(m => {
      // Simple heuristic: chercher les noms propres, jeux, sujets
      if (m.topics) topics.push(...m.topics);
    });

    return [...new Set(topics)];
  } catch {
    return [];
  }
}

// Logger un message pour la liaison DM/Serveur
async function logMessageForBridge(authorId, authorName, content, channelId, channelName, source = 'server') {
  if (!shared.mongoDb) return;

  try {
    // Extraire les topics/sujets principaux
    const topics = [];
    if (content.includes('jeu') || content.includes('gaming')) topics.push('gaming');
    if (content.includes('force') || content.includes('faible')) topics.push('personnalité');
    if (content.match(/\b[A-Z][a-z]+/g)) {
      content.match(/\b[A-Z][a-z]+/g).slice(0, 2).forEach(t => topics.push(t));
    }

    const slot = getCurrentSlot();
    await shared.mongoDb.collection('messageLog').insertOne({
      authorId,
      authorName,
      content: content.slice(0, 300),
      channelId,
      channelName,
      source,
      topics,
      timeSlot: slot?.status || 'active',
      createdAt: new Date(),
    });
  } catch (err) {
    pushLog('ERR', `logMessageForBridge échoué: ${err.message}`, 'error');
  }
}

module.exports = {
  enrichDMWithServerContext,
  enrichServerWithDmContext,
  getServerContextForUser,
  getDmContextForUser,
  getRecentTopicsForUser,
  logMessageForBridge,
};
