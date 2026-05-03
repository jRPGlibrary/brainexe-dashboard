const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { saveConfig } = require('../../botConfig');
const { readGuildState } = require('../../discord/sync');
const { startAnecdoteCron } = require('../../features/anecdotes');
const { startActusCron } = require('../../features/actus');
const { startConvCron } = require('../../crons');
const { auditLog } = require('../../audit');
const { generalLimiter } = require('../rateLimits');
const { ADMIN_PASSWORD } = require('../../config');
const { requireAuth, createSession, destroySession } = require('../auth');
const totp = require('../totp');

function registerRoutes(app) {
  // Routes d'auth (sans protection)
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (!ADMIN_PASSWORD) {
      return res.status(500).json({ ok: false, error: 'Auth non configurée' });
    }
    if (password !== ADMIN_PASSWORD) {
      auditLog('auth.fail', { ip: req.ip, timestamp: new Date() });
      return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
    }
    createSession(res);
    auditLog('auth.login', { ip: req.ip, timestamp: new Date() });
    res.json({ ok: true, message: 'Connecté' });
  });

  app.post('/api/auth/logout', (req, res) => {
    destroySession(req);
    res.clearCookie('admin_session');
    res.json({ ok: true, message: 'Déconnecté' });
  });

  // Routes 2FA (sans protection)
  app.post('/api/auth/2fa/setup', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await totp.generateSecret(email || 'admin@brainexe');
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/auth/2fa/verify', (req, res) => {
    try {
      const { secret, token } = req.body;
      if (!secret || !token) {
        return res.status(400).json({ ok: false, error: 'secret et token requis' });
      }
      const verified = totp.verifyToken(secret, token);
      if (verified) {
        res.json({ ok: true, message: 'Code valide' });
      } else {
        res.status(401).json({ ok: false, error: 'Code invalide' });
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Middleware d'auth sur toutes les routes /api
  app.use('/api/', requireAuth);

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
  // ── v0.9.6 Routes ─────────────────────────────────────────────
  app.use('/api', require('./audit'));
  app.use('/api', require('./monitoring'));
  app.use('/api', require('./analytics'));
}

module.exports = { registerRoutes };
