const cron = require('node-cron');
const shared = require('./shared');
const { pushLog } = require('./logger');
const { getCurrentSlot, getParisHour } = require('./bot/scheduling');
const { resetDailyMoodDate, refreshDailyMood } = require('./bot/mood');
const { postRandomConversation, replyToConversations } = require('./features/conversations');
const { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup } = require('./features/greetings');
const { runDriftCheck } = require('./features/drift');
const { getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded } = require('./features/convStats');
const {
  updateInternalStatesForSlot, applyNaturalDecay, applyDailyDrift,
  decayEmotions, saveEmotionalState,
} = require('./bot/emotions');
const { runDailyBondEvolution } = require('./db/memberBonds');
const { readGuildState } = require('./discord/sync');
const fs = require('fs');

let convCron = null, replyCron = null, morningCron = null, morningCronWE = null, morningCronSun = null;
let lunchBackCron = null, goodnightCron = null, nightWakeupCron = null, moodResetCron = null, driftCron = null;
let emotionHourlyCron = null, emotionDailyCron = null;

function startConvCron() {
  [convCron, replyCron, morningCron, morningCronWE, morningCronSun, lunchBackCron, goodnightCron, nightWakeupCron, moodResetCron, driftCron, emotionHourlyCron, emotionDailyCron]
    .forEach(c => { if (c) { try { c.stop(); } catch {} } });

  convCron = cron.schedule('0 * * * *', () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled) return;
    const slot = getCurrentSlot();
    if (slot.maxConv === 0) return;
    resetDailyCountIfNeeded().catch(() => {});
    const count = getConvDailyCount();
    const max = getConvMaxPerDay();
    if (count >= max) return;
    const prob = Math.min(0.85, (max - count) / Math.max(1, 24 - getParisHour()));
    if (Math.random() < prob) { pushLog('SYS', `💬 Conv [${slot.label}] (${count}/${max}, ${Math.round(prob * 100)}%)`); postRandomConversation(); }
  }, { timezone: 'Europe/Paris' });

  replyCron = cron.schedule('0 */2 * * *', () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled || !cfg.canReply) return;
    if (getCurrentSlot().maxConv === 0) return;
    if (Math.random() < 0.4) replyToConversations();
  }, { timezone: 'Europe/Paris' });

  morningCron    = cron.schedule('0 9 * * 1-5', () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  morningCronWE  = cron.schedule('30 9 * * 6',  () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  morningCronSun = cron.schedule('0 10 * * 0',  () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  lunchBackCron  = cron.schedule('0 14 * * *',  () => { if (Math.random() < 0.33) setTimeout(postLunchBack, Math.floor(Math.random() * 15 * 60 * 1000)); }, { timezone: 'Europe/Paris' });
  goodnightCron  = cron.schedule('0 23 * * *',  () => { if (Math.random() < 0.33) setTimeout(postGoodnight, Math.floor(Math.random() * 30 * 60 * 1000)); }, { timezone: 'Europe/Paris' });
  nightWakeupCron = cron.schedule('30 3 * * *', () => { if (Math.random() < 0.10) postNightWakeup(); }, { timezone: 'Europe/Paris' });
  moodResetCron  = cron.schedule('1 0 * * *',   () => { resetDailyMoodDate(); refreshDailyMood(); }, { timezone: 'Europe/Paris' });

  driftCron = cron.schedule('0 */3 * * *', () => {
    const slot = getCurrentSlot();
    if (slot.maxConv > 0) { pushLog('SYS', `🔍 Drift check déclenché [${slot.label}]`); runDriftCheck(); }
  }, { timezone: 'Europe/Paris' });

  // Decay des émotions + update des états internes selon le slot toutes les heures
  emotionHourlyCron = cron.schedule('30 * * * *', () => {
    try {
      const slot = getCurrentSlot();
      updateInternalStatesForSlot(slot);
      applyNaturalDecay();
      decayEmotions();
      saveEmotionalState().catch(() => {});
      pushLog('SYS', `💗 Évolution émotionnelle horaire [${slot.label}]`);
    } catch (err) { pushLog('ERR', `emotionHourlyCron: ${err.message}`, 'error'); }
  }, { timezone: 'Europe/Paris' });

  // Évolution journalière des bonds + drift des états internes à 00h05
  emotionDailyCron = cron.schedule('5 0 * * *', async () => {
    try {
      applyDailyDrift();
      await runDailyBondEvolution();
      await saveEmotionalState();
      pushLog('SYS', `💞 Évolution journalière bonds + états internes`, 'success');
    } catch (err) { pushLog('ERR', `emotionDailyCron: ${err.message}`, 'error'); }
  }, { timezone: 'Europe/Paris' });

  pushLog('SYS', `✅ Crons v2.0.9 — conv + drift + émotions horaires + bonds journaliers`, 'success');
}

function startBackupInterval() {
  setInterval(async () => {
    try {
      const state = await readGuildState();
      const fn = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(fn, JSON.stringify(state, null, 2), 'utf8');
      pushLog('SYS', `📦 Backup : ${fn}`, 'success');
      const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json'));
      if (files.length > 10) files.sort().slice(0, files.length - 10).forEach(f => { try { fs.unlinkSync(f); } catch {} });
    } catch (err) { pushLog('ERR', `Backup échoué : ${err.message}`, 'error'); }
  }, 6 * 60 * 60 * 1000);
}

module.exports = { startConvCron, startBackupInterval };
