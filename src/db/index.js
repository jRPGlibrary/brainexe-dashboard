const { MongoClient } = require('mongodb');
const { MONGODB_URI } = require('../config');
const shared = require('../shared');
const { pushLog } = require('../logger');

async function connectMongoDB() {
  if (!MONGODB_URI) { pushLog('SYS', '⚠️ MONGODB_URI non défini', 'error'); return; }
  try {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    shared.mongoDb = client.db('brainexe');

    // Dédupliquer conversationSummaries avant de créer l'index unique
    // (des doublons {userId, type} peuvent exister suite à une race condition)
    try {
      const dupes = await shared.mongoDb.collection('conversationSummaries').aggregate([
        { $group: { _id: { userId: '$userId', type: '$type' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ]).toArray();
      for (const dupe of dupes) {
        await shared.mongoDb.collection('conversationSummaries').deleteMany({ _id: { $in: dupe.ids.slice(1) } });
      }
      if (dupes.length) pushLog('SYS', `🔧 ${dupes.length} doublon(s) conversationSummaries dédupliqués`, 'success');
    } catch (_) {}

    // Création des index — chacun isolé pour qu'une erreur n'avorte pas l'init
    const indexes = [
      () => shared.mongoDb.collection('memberProfiles').createIndex({ userId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('botState').createIndex({ _id: 1 }),
      () => shared.mongoDb.collection('channelMemory').createIndex({ channelId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('dmHistory').createIndex({ userId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('channelDirectory').createIndex({ channelId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('memberBonds').createIndex({ userId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('messageLog').createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800, name: 'messageLog_ttl' }),
      () => shared.mongoDb.collection('messageLog').createIndex({ authorId: 1, source: 1, createdAt: -1 }, { name: 'messageLog_author_source_date' }),
      () => shared.mongoDb.collection('smartMemory').createIndex({ entityId: 1, entityType: 1 }, { unique: true, name: 'smartMemory_entity' }),
      () => shared.mongoDb.collection('dmUserFlags').createIndex({ userId: 1 }, { unique: true }),
      () => shared.mongoDb.collection('conversationSummaries').createIndex({ userId: 1, type: 1 }, { unique: true, name: 'convSummaries_user_type' }),
    ];

    for (const fn of indexes) {
      try { await fn(); } catch (idxErr) {
        pushLog('ERR', `Index build warning (non-bloquant) : ${idxErr.message?.slice(0, 120)}`, 'error');
      }
    }

    pushLog('SYS', '✅ MongoDB Atlas connecté — indexes vérifiés', 'success');
    try {
      const { loadEmotionalState } = require('../bot/emotions');
      await loadEmotionalState();
    } catch (e) { pushLog('ERR', `loadEmotionalState boot: ${e.message}`, 'error'); }
    try {
      const { getNarrativeContext } = require('./narrativeMemory');
      getNarrativeContext().catch(() => {});
    } catch (_) {}
  } catch (err) { pushLog('ERR', `MongoDB connexion échouée : ${err.message}`, 'error'); }
}

module.exports = { connectMongoDB };
