const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { saveConfig } = require('../../botConfig');
const { readGuildState } = require('../../discord/sync');
const { startAnecdoteCron } = require('../../features/anecdotes');
const { startActusCron } = require('../../features/actus');
const { auditLog } = require('../../audit');
const { generalLimiter } = require('../rateLimits');

function registerRoutes(app) {
  // Limiteur général appliqué sur toute l'API en filet de sécurité
  app.use('/api/', generalLimiter);

  // ── Routes générales ────────────────────────────────────────
  app.get('/api/state', async (req, res) => {
    try {
      const state = await readGuildState();
      res.json({ ok: true, state, stats: shared.syncStats, uptime: Date.now() - shared.syncStats.startTime });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.get('/api/logs', (req, res) => res.json({ ok: true, logs: shared.changeLog }));
  app.get('/api/config', (req, res) => res.json({ ok: true, config: shared.botConfig }));

  app.post('/api/config', (req, res) => {
    try {
      const { section, data } = req.body;
      if (!section || !data) return res.status(400).json({ ok: false, error: 'section + data requis' });
      if (!shared.botConfig[section]) return res.status(400).json({ ok: false, error: 'Section inconnue' });
      shared.botConfig[section] = { ...shared.botConfig[section], ...data };
      saveConfig();
      const { startConvCron } = require('../../crons');
      if (section === 'anecdote') startAnecdoteCron();
      if (section === 'actus') startActusCron();
      if (section === 'conversations') startConvCron();
      pushLog('SYS', `Config "${section}" mise à jour`, 'success');
      auditLog('config.update', { section, keys: Object.keys(data) });
      broadcast('configUpdate', { section, data: shared.botConfig[section] });
      res.json({ ok: true, config: shared.botConfig[section] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ── Sous-routeurs par thème ─────────────────────────────────
  app.use('/api', require('./discord'));
  app.use('/api', require('./bot'));
  app.use('/api', require('./members'));
  app.use('/api', require('./admin'));
  app.use('/api', require('./data'));
  app.use('/api', require('./backups'));
}

module.exports = { registerRoutes };
