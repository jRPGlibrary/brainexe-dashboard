/**
 * ─── Audit log ─────────────────────────────────────────────
 * Trace des actions admin effectuées depuis le dashboard.
 * Ring buffer en mémoire (500 entrées) + broadcast WebSocket.
 * ──────────────────────────────────────────────────────────
 */

const shared = require('./shared');
const { broadcast } = require('./logger');

const MAX_ENTRIES = 500;
if (!Array.isArray(shared.auditLog)) shared.auditLog = [];

function auditLog(action, details = {}) {
  const entry = {
    ts: Date.now(),
    time: new Date().toISOString(),
    action,
    details,
  };
  shared.auditLog.push(entry);
  if (shared.auditLog.length > MAX_ENTRIES) shared.auditLog.shift();
  broadcast('auditUpdate', entry);
  return entry;
}

function getAuditEntries(limit = 200) {
  const list = shared.auditLog || [];
  return list.slice(-limit).reverse();
}

module.exports = { auditLog, getAuditEntries };
