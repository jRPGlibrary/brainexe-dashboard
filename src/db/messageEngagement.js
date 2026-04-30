/**
 * ================================================
 * 📊 SUIVI D'ENGAGEMENT DES MESSAGES v1.0
 * ================================================
 * Suivre l'engagement réel sur les sujets.
 * Si un sujet ne génère aucune interaction, ne pas insister.
 *
 * Philosophie: Pragmatisme, pas punition
 * - On essaie un sujet
 * - Si zéro engagement → on en reparle pas cette semaine
 * - Économise les conversations inutiles, tokens précieux
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
 * Pragmatisme: vérifie si on devrait ÉVITER ce sujet cette semaine.
 * Logique: si les 2 derniers messages ont 0 engagement, pas besoin d'insister.
 *
 * @param {string} topic - Sujet à vérifier
 * @returns {boolean} true si on devrait éviter ce sujet (ça n'a pas marché)
 */
async function shouldAvoidTopic(topic) {
  if (!shared.mongoDb) return false;
  try {
    const topicLower = topic.toLowerCase().trim();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Récupère les messages récents sur ce sujet
    const recentMessages = await shared.mongoDb
      .collection('messageEngagement')
      .find({
        topic: topicLower,
        createdAt: { $gte: weekAgo },
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    if (recentMessages.length === 0) return false;

    // Si les derniers messages n'ont eu aucun engagement → éviter le sujet
    // C'est pragmatique: pourquoi insister sur quelque chose qui ne marche pas?
    const noEngagement = recentMessages.every(msg => msg.engagementScore === 0);
    return noEngagement;
  } catch (err) {
    pushLog('ERR', `shouldAvoidTopic: ${err.message}`, 'error');
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
  shouldAvoidTopic,
  getTopicEngagementScore,
  cleanupOldMessages,
};
