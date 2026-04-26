const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { saveConfig } = require('../../botConfig');
const { readGuildState } = require('../../discord/sync');
const { auditLog } = require('../../audit');
const { backupLimiter } = require('../rateLimits');

const router = Router();

function safeBackupName(name) {
  if (typeof name !== 'string') return null;
  if (!name.startsWith('backup_') || !name.endsWith('.json')) return null;
  if (name.includes('/') || name.includes('..') || name.includes('\\')) return null;
  return name;
}

router.post('/backup', backupLimiter, async (req, res) => {
  try {
    const state = await readGuildState();
    const snapshot = { state, botConfig: shared.botConfig, createdAt: new Date().toISOString() };
    const fn = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(fn, JSON.stringify(snapshot, null, 2), 'utf8');
    pushLog('SYS', `Backup : ${fn}`, 'success');
    auditLog('backup.create', { name: fn });
    res.json({ ok: true, filename: fn });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/backups', (req, res) => {
  try {
    const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json')).sort().reverse()
      .map(f => { const s = fs.statSync(f); return { name: f, date: s.mtime.toLocaleString('fr-FR'), size: s.size }; });
    res.json({ ok: true, backups: files });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/backups/:name/download', (req, res) => {
  const name = safeBackupName(req.params.name);
  if (!name) return res.status(400).json({ ok: false, error: 'Nom invalide' });
  const full = path.join(process.cwd(), name);
  if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'Introuvable' });
  res.download(full, name);
});

router.delete('/backups/:name', (req, res) => {
  const name = safeBackupName(req.params.name);
  if (!name) return res.status(400).json({ ok: false, error: 'Nom invalide' });
  try {
    const full = path.join(process.cwd(), name);
    if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'Introuvable' });
    fs.unlinkSync(full);
    pushLog('SYS', `Backup supprimé : ${name}`, 'success');
    auditLog('backup.delete', { name });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/backups/:name/restore-config', (req, res) => {
  const name = safeBackupName(req.params.name);
  if (!name) return res.status(400).json({ ok: false, error: 'Nom invalide' });
  try {
    const full = path.join(process.cwd(), name);
    if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'Introuvable' });
    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    const restorable = raw.botConfig;
    if (!restorable || typeof restorable !== 'object') return res.status(400).json({ ok: false, error: 'Backup sans section botConfig' });
    let applied = 0;
    Object.keys(restorable).forEach(k => {
      if (shared.botConfig[k]) { shared.botConfig[k] = { ...shared.botConfig[k], ...restorable[k] }; applied++; }
    });
    saveConfig();
    pushLog('SYS', `Config restaurée depuis ${name} (${applied} sections)`, 'success');
    auditLog('backup.restore-config', { name, sections: applied });
    broadcast('configUpdate', { section: '*', data: shared.botConfig });
    res.json({ ok: true, sections: applied });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
