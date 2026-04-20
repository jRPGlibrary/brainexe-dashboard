const WebSocket = require('ws');
const shared = require('./shared');

function broadcast(type, data) {
  if (!shared.wss) return;
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  shared.wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

function pushLog(dir, msg, level = 'info') {
  const ts = Date.now();
  const entry = { ts, time: new Date(ts).toISOString(), dir, type: dir, msg, level };
  shared.changeLog.push(entry);
  if (shared.changeLog.length > 300) shared.changeLog.shift();
  broadcast('logUpdate', entry);
  const timeStr = new Date(ts).toLocaleTimeString('fr-FR');
  console.log(`[${timeStr}] [${dir}] ${msg}`);
}

module.exports = { broadcast, pushLog };
