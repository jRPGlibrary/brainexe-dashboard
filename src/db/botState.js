const shared = require('../shared');
const { pushLog } = require('../logger');

async function getBotState() {
  if (!shared.mongoDb) return {};
  try { return await shared.mongoDb.collection('botState').findOne({ _id: 'main' }) || {}; } catch { return {}; }
}

async function setBotState(patch) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('botState').updateOne(
      { _id: 'main' },
      { $set: { ...patch, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `setBotState échoué : ${err.message}`, 'error'); }
}

module.exports = { getBotState, setBotState };
