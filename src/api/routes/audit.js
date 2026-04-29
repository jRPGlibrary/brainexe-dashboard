/* Audit Advanced - Routes */

const router = require('express').Router();
const { pushLog } = require('../../logger');
const advancedAudit = require('../audit-advanced');

router.get('/audit', (req, res) => {
  try {
    const filters = {
      action: req.query.action || '',
      success: req.query.success === 'true' ? true : req.query.success === 'false' ? false : null,
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null
    };

    const auditLog = advancedAudit.getAuditLog(filters);
    res.json({ ok: true, audit: auditLog, total: auditLog.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/audit/security-alerts', (req, res) => {
  try {
    const alerts = advancedAudit.getSecurityAlerts();
    res.json({ ok: true, alerts, total: alerts.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/audit/export', (req, res) => {
  try {
    const csv = advancedAudit.exportAuditLog();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
