const shared = require('../shared');
const { pushLog } = require('../logger');

/**
 * Enregistrer l'utilisation des tokens pour un membre
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {number} inputTokens - Nombre de tokens d'entrée
 * @param {number} outputTokens - Nombre de tokens de sortie
 * @param {string} context - Contexte de l'utilisation (ex: "mention_reply", "dm", "conversation")
 */
async function recordTokenUsage(userId, username, inputTokens, outputTokens, context = 'unknown') {
  if (!shared.mongoDb || !userId) return;
  try {
    const now = new Date();
    const todayDate = now.toLocaleDateString('fr-CA'); // YYYY-MM-DD format

    await shared.mongoDb.collection('tokenUsage').insertOne({
      userId,
      username,
      inputTokens: Math.max(0, inputTokens || 0),
      outputTokens: Math.max(0, outputTokens || 0),
      totalTokens: Math.max(0, (inputTokens || 0) + (outputTokens || 0)),
      context,
      createdAt: now,
      date: todayDate,
    });
  } catch (err) {
    pushLog('ERR', `Token usage recording failed: ${err.message}`, 'error');
  }
}

/**
 * Obtenir les statistiques de tokens pour un utilisateur
 */
async function getMemberTokenStats(userId) {
  if (!shared.mongoDb || !userId) return null;
  try {
    const stats = await shared.mongoDb.collection('tokenUsage').aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$userId',
          totalInput: { $sum: '$inputTokens' },
          totalOutput: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          messageCount: { $sum: 1 },
          username: { $first: '$username' },
          lastUsage: { $max: '$createdAt' },
        },
      },
    ]).toArray();

    return stats.length > 0 ? stats[0] : null;
  } catch (err) {
    pushLog('ERR', `Failed to get member token stats: ${err.message}`, 'error');
    return null;
  }
}

/**
 * Obtenir les statistiques de tokens pour tous les utilisateurs
 */
async function getAllTokenStats(limit = 50) {
  if (!shared.mongoDb) return [];
  try {
    const stats = await shared.mongoDb.collection('tokenUsage').aggregate([
      {
        $group: {
          _id: '$userId',
          totalInput: { $sum: '$inputTokens' },
          totalOutput: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          messageCount: { $sum: 1 },
          username: { $first: '$username' },
          lastUsage: { $max: '$createdAt' },
        },
      },
      { $sort: { totalTokens: -1 } },
      { $limit: limit },
    ]).toArray();

    return stats;
  } catch (err) {
    pushLog('ERR', `Failed to get all token stats: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Obtenir les statistiques de tokens par jour pour un utilisateur
 */
async function getMemberTokenStatsByDay(userId, days = 30) {
  if (!shared.mongoDb || !userId) return [];
  try {
    const stats = await shared.mongoDb.collection('tokenUsage').aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$date',
          totalInput: { $sum: '$inputTokens' },
          totalOutput: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: days },
    ]).toArray();

    return stats;
  } catch (err) {
    pushLog('ERR', `Failed to get member daily token stats: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Obtenir les statistiques de tokens par contexte (mention, DM, etc.)
 */
async function getMemberTokenStatsByContext(userId) {
  if (!shared.mongoDb || !userId) return {};
  try {
    const stats = await shared.mongoDb.collection('tokenUsage').aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$context',
          totalInput: { $sum: '$inputTokens' },
          totalOutput: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const result = {};
    stats.forEach(stat => {
      result[stat._id] = {
        inputTokens: stat.totalInput,
        outputTokens: stat.totalOutput,
        totalTokens: stat.totalTokens,
        count: stat.count,
      };
    });

    return result;
  } catch (err) {
    pushLog('ERR', `Failed to get member context token stats: ${err.message}`, 'error');
    return {};
  }
}

/**
 * Réinitialiser les statistiques de tokens (admin only)
 */
async function resetTokenStats(userId) {
  if (!shared.mongoDb) return false;
  try {
    const result = await shared.mongoDb.collection('tokenUsage').deleteMany({ userId });
    pushLog('SYS', `Reset token stats for user ${userId}: ${result.deletedCount} records deleted`);
    return true;
  } catch (err) {
    pushLog('ERR', `Failed to reset token stats: ${err.message}`, 'error');
    return false;
  }
}

module.exports = {
  recordTokenUsage,
  getMemberTokenStats,
  getAllTokenStats,
  getMemberTokenStatsByDay,
  getMemberTokenStatsByContext,
  resetTokenStats,
};
