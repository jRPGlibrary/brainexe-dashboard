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
    pushLog('SYS', '✅ MongoDB Atlas connecté — memberProfiles + botState + channelMemory + dmHistory + channelDirectory', 'success');
  } catch (err) { pushLog('ERR', `MongoDB connexion échouée : ${err.message}`, 'error'); }
}

module.exports = { connectMongoDB };
