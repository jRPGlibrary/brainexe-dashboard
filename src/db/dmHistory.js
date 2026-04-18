const shared = require('../shared');
const { pushLog } = require('../logger');

const DM_HISTORY_MAX = 30;

async function getDmHistory(userId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('dmHistory').findOne({ userId }); } catch { return null; }
}

async function appendDmMessage(userId, username, role, content) {
  if (!shared.mongoDb) return;
  try {
    const existing = await getDmHistory(userId);
    const messages = existing?.messages ?? [];
    messages.push({ role, content: content.slice(0, 300), timestamp: new Date() });
    const trimmed = messages.slice(-DM_HISTORY_MAX);
    await shared.mongoDb.collection('dmHistory').updateOne(
      { userId },
      { $set: { userId, username, messages: trimmed, lastSeen: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `appendDmMessage échoué : ${err.message}`, 'error'); }
}

function formatDmHistory(history) {
  if (!history?.messages?.length) return '';
  return history.messages
    .slice(-15)
    .map(m => `[${m.role === 'user' ? history.username : 'Brainee'}]: ${m.content}`)
    .join('\n');
}

module.exports = { getDmHistory, appendDmMessage, formatDmHistory };
