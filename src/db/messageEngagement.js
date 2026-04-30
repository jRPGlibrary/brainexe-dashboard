/**
 * ================================================
 * 📊 SUIVI D'ENGAGEMENT DES MESSAGES v1.0
 * ================================================
 * Suivre les réactions et réponses aux messages du bot.
 * Si un message reçoit peu d'engagement, le sujet devient "tabou" temporairement.
 *
 * Logique:
 * - Chaque message du bot enregistre les réactions/réponses
 * - Si 3 messages consécutifs sur un sujet = 0 engagement → skip ce sujet
 * - Nettoyage automatique des données après 2 semaines
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

/**
 * Enregistre qu'un message du bot a été posté
 * @param {string} messageId - ID du message Discord
 * @param {string} channelId - ID du salon Discord
 * @param {string} topic - Sujet du message (ex: "elden ring", "eternights")
 */
async function recordBotMessage(messageId, channelId, topic) {
  if (!shared.mongoDb) return;
  try {
    const now = new Date();
    await shared.mongoDb.collection('messageEngagement').insertOne({
      messageId,
      channelId,
      topic: topic.toLowerCase().trim(),
      createdAt: now,
      reactions: 0,
      replies: 0,
      engagementScore: 0,
    });
  } catch (err) {
    pushLog('ERR', `recordBotMessage: ${err.message}`, 'error');
  }
}

/**
 * Enregistre une réaction ou réponse à un message du bot
 * @param {string} messageId - ID du message réagi
 * @param {string} type - Type d'engagement: 'reaction' ou 'reply'
 */
async function recordEngagement(messageId, type = 'reaction') {
  if (!shared.mongoDb) return;
  try {
    const updateField = type === 'reply' ? 'replies' : 'reactions';
    await shared.mongoDb.collection('messageEngagement').updateOne(
      { messageId },
      {
        $inc: { [updateField]: 1, engagementScore: 1 },
      }
    );
  } catch (err) {
    pushLog('ERR', `recordEngagement: ${err.message}`, 'error');
  }
}

/**
 * Vérifie si un sujet a reçu peu d'engagement récemment.
 * C'est le cœur du système : si les gens ne réagissent pas au sujet,
 * Brainee arrête de le relancer.
 *
 * @param {string} topic - Sujet à vérifier
 * @returns {boolean} true si les 3 derniers messages sur ce sujet ont 0 engagement
 */
async function isTopicUnengaged(topic) {
  if (!shared.mongoDb) return false;
  try {
    const topicLower = topic.toLowerCase().trim();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Récupère les 3 derniers messages sur ce sujet (derniers 3 jours)
    const recentMessages = await shared.mongoDb
      .collection('messageEngagement')
      .find({
        topic: topicLower,
        createdAt: { $gte: threeDaysAgo },
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    if (recentMessages.length === 0) return false;

    // Si tous les 3 derniers ont 0 engagement → sujet "tabou" temporairement
    const allLowEngagement = recentMessages.every(msg => msg.engagementScore < 1);
    return allLowEngagement;
  } catch (err) {
    pushLog('ERR', `isTopicUnengaged: ${err.message}`, 'error');
    return false;
  }
}

/**
 * Calcule le score d'engagement moyen pour une topic sur la semaine
 * @param {string} topic - Sujet à analyser
 * @returns {number} Score d'engagement moyen
 */
async function getTopicEngagementScore(topic) {
  if (!shared.mongoDb) return 0;
  try {
    const topicLower = topic.toLowerCase().trim();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const messages = await shared.mongoDb
      .collection('messageEngagement')
      .find({
        topic: topicLower,
        createdAt: { $gte: weekAgo },
      })
      .toArray();

    if (messages.length === 0) return 0;

    const totalEngagement = messages.reduce((sum, msg) => sum + msg.engagementScore, 0);
    return Math.round(totalEngagement / messages.length);
  } catch (err) {
    pushLog('ERR', `getTopicEngagementScore: ${err.message}`, 'error');
    return 0;
  }
}

/**
 * Nettoie les données anciennes (>2 semaines) pour éviter les accumulations
 */
async function cleanupOldMessages() {
  if (!shared.mongoDb) return;
  try {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = await shared.mongoDb
      .collection('messageEngagement')
      .deleteMany({
        createdAt: { $lt: twoWeeksAgo },
      });
    if (result.deletedCount > 0) {
      pushLog('SYS', `🧹 Nettoyé ${result.deletedCount} anciens messages d'engagement`, 'info');
    }
  } catch (err) {
    pushLog('ERR', `cleanupOldMessages: ${err.message}`, 'error');
  }
}

module.exports = {
  recordBotMessage,
  recordEngagement,
  isTopicUnengaged,
  getTopicEngagementScore,
  cleanupOldMessages,
};
