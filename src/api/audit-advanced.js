/* Audit Trail Avancé - Journal de TOUTES les actions */

const auditLog = [];
const MAX_LOGS = 5000; // Garder les 5000 dernières actions

function logAction(action, details, req) {
  const entry = {
    timestamp: new Date(),
    action: action, // "login", "config_change", "export", etc
    ip: req?.ip || 'unknown',
    userAgent: req?.get('user-agent') || 'unknown',
    details: details,
    success: details.success !== false
  };

  auditLog.push(entry);

  // Garder que les N derniers
  if (auditLog.length > MAX_LOGS) {
    auditLog.shift();
  }

  return entry;
}

function getAuditLog(filters = {}) {
  let results = [...auditLog];

  // Filtrer par action
  if (filters.action) {
    results = results.filter(l => l.action === filters.action);
  }

  // Filtrer par plage de temps
  if (filters.since) {
    const sinceTime = new Date(filters.since).getTime();
    results = results.filter(l => l.timestamp.getTime() > sinceTime);
  }

  // Filtrer par succès/échec
  if (filters.success !== undefined) {
    results = results.filter(l => l.success === filters.success);
  }

  // Trier par date (recent first)
  results.sort((a, b) => b.timestamp - a.timestamp);

  return results;
}

function getSecurityAlerts() {
  // Détecter les comportements suspects
  const alerts = [];
  const last1Hour = new Date(Date.now() - 3600000);

  // Trop de tentatives échouées
  const failedLogins = auditLog.filter(l =>
    l.action === 'login' && !l.success && l.timestamp > last1Hour
  );

  const failByIP = {};
  failedLogins.forEach(l => {
    failByIP[l.ip] = (failByIP[l.ip] || 0) + 1;
  });

  Object.entries(failByIP).forEach(([ip, count]) => {
    if (count >= 5) {
      alerts.push({
        type: 'BRUTE_FORCE',
        severity: 'HIGH',
        message: `${count} tentatives login échouées de ${ip}`,
        ip: ip,
        count: count
      });
    }
  });

  return alerts;
}

function exportAuditLog() {
  return {
    exported: new Date(),
    total: auditLog.length,
    logs: auditLog
  };
}

module.exports = {
  logAction,
  getAuditLog,
  getSecurityAlerts,
  exportAuditLog
};
