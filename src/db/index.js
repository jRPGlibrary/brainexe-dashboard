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
    await shared.mongoDb.collection('memberProfiles').createIndex({ userId: 1 }, { unique: true });
    await shared.mongoDb.collection('botState').createIndex({ _id: 1 });
    await shared.mongoDb.collection('channelMemory').createIndex({ channelId: 1 }, { unique: true });
    await shared.mongoDb.collection('dmHistory').createIndex({ userId: 1 }, { unique: true });
    await shared.mongoDb.collection('channelDirectory').createIndex({ channelId: 1 }, { unique: true });
    await shared.mongoDb.collection('memberBonds').createIndex({ userId: 1 }, { unique: true });
    // messageLog: TTL 7 jours + index composé pour requêtes bridge DM/serveur
    await shared.mongoDb.collection('messageLog').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 604800, name: 'messageLog_ttl' }
    );
    await shared.mongoDb.collection('messageLog').createIndex(
      { authorId: 1, source: 1, createdAt: -1 },
      { name: 'messageLog_author_source_date' }
    );
    // smartMemory: index unique pour compaction intelligente
    await shared.mongoDb.collection('smartMemory').createIndex(
      { entityId: 1, entityType: 1 },
      { unique: true, name: 'smartMemory_entity' }
    );
    pushLog('SYS', '✅ MongoDB Atlas connecté — memberProfiles + botState + channelMemory + dmHistory + channelDirectory + memberBonds + messageLog TTL + smartMemory', 'success');
    try {
      const { loadEmotionalState } = require('../bot/emotions');
      await loadEmotionalState();
    } catch (e) { pushLog('ERR', `loadEmotionalState boot: ${e.message}`, 'error'); }
  } catch (err) { pushLog('ERR', `MongoDB connexion échouée : ${err.message}`, 'error'); }
}

module.exports = { connectMongoDB };
