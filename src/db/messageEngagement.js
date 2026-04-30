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
 * Enregistre qu'un message du bot a été posté (avec longueur)
 * @param {string} messageId - ID du message Discord
 * @param {string} channelId - ID du salon Discord
 * @param {string} topic - Sujet du message
 * @param {number} messageLength - Longueur du message en caractères
 */
async function recordBotMessage(messageId, channelId, topic, messageLength = 0) {
  if (!shared.mongoDb) return;
  try {
    const now = new Date();
    const isPavé = messageLength > 300; // Pavé = message très long
    await shared.mongoDb.collection('messageEngagement').insertOne({
      messageId,
      channelId,
      topic: topic.toLowerCase().trim(),
      createdAt: now,
      messageLength,
      isPavé,
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
 * Calcule si on devrait faire des pavés dans ce salon
 * Logique: si les gens répondent peu, faire des messages plus courts
 *
 * @param {string} channelId - ID du salon
 * @returns {object} {shouldBePavé: bool, avgEngagement: number}
 */
async function getChannelVerbosity(channelId) {
  if (!shared.mongoDb) return { shouldBePavé: false, avgEngagement: 0 };
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const messages = await shared.mongoDb
      .collection('messageEngagement')
      .find({
        channelId,
        createdAt: { $gte: weekAgo },
      })
      .toArray();

    if (messages.length === 0) return { shouldBePavé: false, avgEngagement: 0 };

    // Calcul du taux d'engagement moyen
    const totalEngagement = messages.reduce((sum, msg) => sum + msg.engagementScore, 0);
    const avgEngagement = Math.round(totalEngagement / messages.length);

    // Compter les pavés qui ont eu engagement vs pas
    const pavés = messages.filter(m => m.isPavé);
    const pavésWithEngagement = pavés.filter(m => m.engagementScore > 0);

    // Si >50% des pavés ont 0 engagement → salons qui n'aiment pas les pavés
    const pavéSuccessRate = pavés.length > 0
      ? pavésWithEngagement.length / pavés.length
      : 0.5;

    // Decision: faire des pavés SEULEMENT si:
    // 1. Engagement moyen >2 ET
    // 2. Pavés fonctionnent bien (>60% ont engagement)
    const shouldBePavé = avgEngagement >= 2 && pavéSuccessRate > 0.6;

    return { shouldBePavé, avgEngagement, pavéSuccessRate: Math.round(pavéSuccessRate * 100) };
  } catch (err) {
    pushLog('ERR', `getChannelVerbosity: ${err.message}`, 'error');
    return { shouldBePavé: false, avgEngagement: 0 };
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
  getChannelVerbosity,
  cleanupOldMessages,
};
