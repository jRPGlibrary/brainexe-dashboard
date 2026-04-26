const { Router } = require('express');
const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { GUILD_ID } = require('../../config');
const { getCurrentSlot, setForcedSlot, getForcedSlot, getAllSlots } = require('../../bot/scheduling');
const { getDailyMood, setDailyMood, MOODS, refreshDailyMood } = require('../../bot/mood');
const { getInternalState, setInternalStateValue } = require('../../bot/emotions');
const { updateSidebarChannels } = require('../../features/sidebar');
const { auditLog } = require('../../audit');

const router = Router();

function refreshSidebar() {
  updateSidebarChannels().catch(err => pushLog('ERR', `Sidebar refresh: ${err.message}`, 'error'));
}

// État complet pour le panneau admin
router.get('/admin/status', async (req, res) => {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID).catch(() => null);
    const slot = getCurrentSlot();
    const mood = getDailyMood();
    const internalState = getInternalState();
    res.json({
      ok: true,
      memberCount: guild?.memberCount ?? 0,
      slot: { label: slot.label, status: slot.status, maxConv: slot.maxConv, forced: getForcedSlot() },
      mood,
      moods: MOODS,
      slots: getAllSlots().map(s => ({ status: s.status, label: s.label })),
      internalState,
      tiktokLive: shared.tiktokLiveActive === true,
      guildName: guild?.name || 'Discord',
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Humeur du jour
router.post('/admin/mood', (req, res) => {
  const { mood } = req.body;
  if (!MOODS.includes(mood)) return res.status(400).json({ ok: false, error: 'Humeur invalide' });
  setDailyMood(mood, true);
  refreshSidebar();
  auditLog('admin.mood', { mood });
  broadcast('adminUpdate', { type: 'mood', value: mood });
  res.json({ ok: true, mood });
});

router.post('/admin/mood/reroll', (req, res) => {
  const { resetDailyMoodDate } = require('../../bot/mood');
  resetDailyMoodDate();
  const newMood = refreshDailyMood();
  refreshSidebar();
  broadcast('adminUpdate', { type: 'mood', value: newMood });
  res.json({ ok: true, mood: newMood });
});

// Slot (état courant)
router.post('/admin/slot', (req, res) => {
  const { status } = req.body;
  setForcedSlot(status || null);
  refreshSidebar();
  const slot = getCurrentSlot();
  auditLog('admin.slot', { forced: status || null, label: slot.label });
  broadcast('adminUpdate', { type: 'slot', value: slot });
  res.json({ ok: true, slot, forced: status || null });
});

// États internes (sliders énergie, charge mentale…)
router.post('/admin/state', (req, res) => {
  const { key, value } = req.body;
  const valid = ['energy', 'socialNeed', 'calmNeed', 'stimulation', 'mentalLoad', 'recognitionNeed'];
  if (!valid.includes(key)) return res.status(400).json({ ok: false, error: 'Clé invalide' });
  const n = Math.max(0, Math.min(100, parseInt(value) || 0));
  setInternalStateValue(key, n);
  refreshSidebar();
  auditLog('admin.state', { key, value: n });
  broadcast('adminUpdate', { type: 'state', key, value: n });
  res.json({ ok: true, key, value: n });
});

// Override TikTok Live
router.post('/admin/tiktok', (req, res) => {
  const { live } = req.body;
  shared.tiktokLiveActive = live === true;
  refreshSidebar();
  auditLog('admin.tiktok', { live: shared.tiktokLiveActive });
  broadcast('adminUpdate', { type: 'tiktok', value: shared.tiktokLiveActive });
  res.json({ ok: true, tiktokLive: shared.tiktokLiveActive });
});

// Refresh sidebar manuel
router.post('/admin/sidebar/refresh', async (req, res) => {
  try { await updateSidebarChannels(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
