/**
 * ================================================
 * 🔀 CROSS-CHANNEL MEMORY v1.0.0
 * ================================================
 * Stocke un résumé des derniers posts de Brainee dans chaque salon.
 * Permet d'injecter dans le prompt ce qu'elle a dit ailleurs récemment
 * pour créer une cohérence et continuité naturelle inter-salon.
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

const COLLECTION = 'crossChannelMem';
const MAX_ENTRIES = 15;           // nombre max d'entrées gardées
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h — au-delà, trop vieux pour être pertinent

/**
 * Enregistre un post de Brainee pour la mémoire inter-salon.
 */
async function recordCrossChannelPost(channelId, channelName, text) {
  if (!shared.mongoDb) return;
  try {
    const fingerprint = text.slice(0, 100).replace(/\s+/g, ' ').trim();
    await shared.mongoDb.collection(COLLECTION).insertOne({
      channelId,
      channelName: channelName || channelId,
      text: fingerprint,
      ts: new Date(),
    });
    // Garder seulement les MAX_ENTRIES les plus récents
    const count = await shared.mongoDb.collection(COLLECTION).countDocuments();
    if (count > MAX_ENTRIES) {
      const oldest = await shared.mongoDb.collection(COLLECTION)
        .find().sort({ ts: 1 }).limit(count - MAX_ENTRIES).toArray();
      const ids = oldest.map(d => d._id);
      await shared.mongoDb.collection(COLLECTION).deleteMany({ _id: { $in: ids } });
    }
  } catch (err) {
    pushLog('ERR', `crossChannelMem.record: ${err.message}`, 'error');
  }
}

/**
 * Récupère les posts récents dans les AUTRES salons (hors excludeChannelId).
 * Retourne un bloc texte injecté dans le prompt.
 */
async function getCrossChannelContext(excludeChannelId) {
  if (!shared.mongoDb) return '';
  try {
    const since = new Date(Date.now() - MAX_AGE_MS);
    const entries = await shared.mongoDb.collection(COLLECTION)
      .find({ channelId: { $ne: excludeChannelId }, ts: { $gte: since } })
      .sort({ ts: -1 })
      .limit(4)
      .toArray();
    if (!entries.length) return '';
    const lines = entries.map(e => `• #${e.channelName} : "${e.text}"`);
    return `🔀 CE QUE T'AS DIT AILLEURS (ces dernières heures, pour la continuité) :\n${lines.join('\n')}`;
  } catch (err) {
    pushLog('ERR', `crossChannelMem.get: ${err.message}`, 'error');
    return '';
  }
}

module.exports = { recordCrossChannelPost, getCrossChannelContext };
