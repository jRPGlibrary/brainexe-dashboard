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
  const time = new Date().toLocaleTimeString('fr-FR');
  const entry = { time, dir, msg, level };
  shared.changeLog.push(entry);
  if (shared.changeLog.length > 200) shared.changeLog.shift();
  broadcast('log', entry);
  console.log(`[${time}] [${dir}] ${msg}`);
}

module.exports = { broadcast, pushLog };
