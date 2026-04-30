const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { sanitizeForJson } = require('../utils');
const { getSmartMemory, formatSmartMemory } = require('../db/intelligentMemory');
const { GUILD_ID } = require('../config');

// Récupérer le contexte récent du serveur pour une personne
async function getServerContextForUser(userId, userName, limit = 5) {
  if (!shared.mongoDb) return '';

  try {
    // Chercher les messages du serveur où cette personne a participé récemment
    const recentMessages = await shared.mongoDb
      .collection('messageLog')
      .find({ authorId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (!recentMessages.length) return '';

    return recentMessages
      .map(m => `[${m.channelName}] ${m.content.slice(0, 100)}`)
      .join('\n');
  } catch {
    return '';
  }
}

// Enrichir un contexte DM avec le contexte serveur
async function enrichDMWithServerContext(userId, userName, dmContent) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    if (!guild) return dmContent;

    // Chercher les messages récents du serveur de cet utilisateur
    const serverContext = await getServerContextForUser(userId, userName);
    if (!serverContext) return dmContent;

    // Récupérer la mémoire utilisateur
    const userMemory = await getSmartMemory(userId, 'user');
    const memoryBlock = formatSmartMemory(userMemory);

    // Analyser le lien entre DM et serveur (ultra-court, 150 tokens max)
    const { text: linkAnalysis } = await callClaude(
      'Tu lis un DM et trouves le lien avec ce qui s\'est passé sur le serveur.',
      `Utilisateur: ${sanitizeForJson(userName)}\n\nDM: "${sanitizeForJson(dmContent)}"\n\nRécent sur le serveur:\n${sanitizeForJson(serverContext)}\n\nMémoire:\n${memoryBlock}\n\nDécris en 1-2 phrases si le DM fait référence à quelque chose du serveur.`,
      150
    );

    return `${dmContent}\n\n[Contexte serveur: ${linkAnalysis.slice(0, 200)}]`;
  } catch {
    return dmContent;
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

    await shared.mongoDb.collection('messageLog').insertOne({
      authorId,
      authorName,
      content: content.slice(0, 300),
      channelId,
      channelName,
      source,
      topics,
      createdAt: new Date(),
    });
  } catch (err) {
    pushLog('ERR', `logMessageForBridge échoué: ${err.message}`, 'error');
  }
}

module.exports = {
  enrichDMWithServerContext,
  getServerContextForUser,
  getRecentTopicsForUser,
  logMessageForBridge,
};
