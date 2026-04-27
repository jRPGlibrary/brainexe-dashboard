const { Router } = require('express');
const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { getCurrentSlot, getParisHour, getParisDay, getForcedSlot } = require('../../bot/scheduling');
const { getDailyMood } = require('../../bot/mood');
const { getInternalState, getEmotionStack, getTemperament } = require('../../bot/emotions');
const { getMemberBond } = require('../../db/memberBonds');
const { getChannelMemory } = require('../../db/channelMem');
const { getDmHistory } = require('../../db/dmHistory');
const { getFundingData, addDonation, calculateTotalCosts, updateBotStatus } = require('../../project/funding');
const { getAuditEntries, auditLog } = require('../../audit');

const router = Router();

// Santé globale (Discord / Mongo / Claude)
router.get('/health', async (req, res) => {
  try {
    const d = shared.discord;
    const discordReady = !!(d && d.isReady && d.isReady());
    const discordPing = d?.ws?.ping ?? null;
    const mongoReady = !!shared.mongoDb;
    const memBytes = process.memoryUsage().rss;
    const claude = shared.claudeHealth || {};
    const uptimeMs = Date.now() - (shared.syncStats?.startTime || Date.now());
    res.json({
      ok: true,
      uptimeMs,
      memoryMb: Math.round(memBytes / 1024 / 1024),
      discord: { ready: discordReady, ping: discordPing, tag: d?.user?.tag || null },
      mongo: { ready: mongoReady },
      claude: {
        totalCalls: claude.totalCalls || 0,
        totalErrors: claude.totalErrors || 0,
        consecutiveErrors: claude.consecutiveErrors || 0,
        lastCall: claude.lastCall,
        lastSuccess: claude.lastSuccess,
        lastError: claude.lastError,
        lastErrorMsg: claude.lastErrorMsg,
        lastLatencyMs: claude.lastLatencyMs,
      },
      tiktokLive: shared.tiktokLiveActive === true,
      logsCount: (shared.changeLog || []).length,
      auditCount: (shared.auditLog || []).length,
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Slot actuel
router.get('/slot', (req, res) => {
  const slot = getCurrentSlot();
  const d = getParisDay();
  res.json({
    ok: true,
    slot,
    hour: Math.round(getParisHour() * 100) / 100,
    day: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][d],
    mood: getDailyMood(),
  });
});

// Grille hebdomadaire des slots
router.get('/schedule', (req, res) => {
  try {
    const { WEEKDAY_SLOTS: wd, SATURDAY_SLOTS: sa, SUNDAY_SLOTS: su } = require('../../bot/scheduling');
    const map = s => ({ start: s.start, end: s.end, status: s.status, label: s.label, maxConv: s.maxConv });
    const current = getCurrentSlot();
    res.json({
      ok: true,
      weekday: wd.map(map),
      saturday: sa.map(map),
      sunday: su.map(map),
      now: { status: current.status, label: current.label, forced: getForcedSlot(), hour: Math.round(getParisHour() * 100) / 100, day: getParisDay() },
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Mémoire des salons
router.get('/channel-memory/:id', async (req, res) => {
  try { const mem = await getChannelMemory(req.params.id); res.json({ ok: true, memory: mem }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/channel-memory', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' });
  try { const all = await shared.mongoDb.collection('channelMemory').find({}).toArray(); res.json({ ok: true, memories: all }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Historique DM
router.get('/dm-history/:userId', async (req, res) => {
  try { const h = await getDmHistory(req.params.userId); res.json({ ok: true, history: h }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Répertoire des salons
router.get('/channel-directory', async (req, res) => {
  if (!shared.mongoDb) return res.json([]);
  try { const docs = await shared.mongoDb.collection('channelDirectory').find({}).toArray(); res.json(docs); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// État émotionnel
router.get('/emotions/state', (req, res) => {
  res.json({ ok: true, internalState: getInternalState(), temperament: getTemperament(), emotionStack: getEmotionStack() });
});
router.get('/emotions/bonds', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' });
  try {
    const bonds = await shared.mongoDb.collection('memberBonds').find({}).sort({ baseAttachment: -1 }).limit(50).toArray();
    res.json({ ok: true, bonds });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/emotions/bonds/:userId', async (req, res) => {
  try {
    const bond = await getMemberBond(req.params.userId);
    if (!bond) return res.status(404).json({ ok: false, error: 'Aucun lien trouvé' });
    res.json({ ok: true, bond });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Journal d'audit
router.get('/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  res.json({ ok: true, entries: getAuditEntries(limit) });
});

// Financement du projet
router.get('/project/funding', async (req, res) => {
  try {
    const data = await getFundingData();
    const totalCosts = calculateTotalCosts(data);
    res.json({ ok: true, costs: data.costs, totalCosts, totalDonated: data.totalDonated || 0, remaining: Math.max(0, totalCosts - (data.totalDonated || 0)) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/project/donation', async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ ok: false, error: 'amount requis (nombre positif)' });
    const updated = await addDonation(amount);
    const totalCosts = calculateTotalCosts(updated);
    pushLog('SYS', `Contribution +${amount}€ enregistrée`, 'success');
    const response = { ok: true, costs: updated.costs, totalCosts, totalDonated: updated.totalDonated || 0, remaining: Math.max(0, totalCosts - (updated.totalDonated || 0)) };
    broadcast('fundingUpdate', response);
    updateBotStatus(response.totalDonated, totalCosts).catch(err => pushLog('ERR', `updateBotStatus: ${err.message}`, 'error'));
    auditLog('funding.donation', { amount });
    res.json(response);
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/project/funding/history', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: true, history: [] });
  try {
    const docs = await shared.mongoDb.collection('projectFunding').find({}).sort({ _id: -1 }).limit(12).toArray();
    const history = docs.map(d => ({ month: d._id, totalDonated: d.totalDonated || 0, totalCosts: calculateTotalCosts(d), costs: d.costs || {} }));
    res.json({ ok: true, history });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
