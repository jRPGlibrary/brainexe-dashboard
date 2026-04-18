const cron = require('node-cron');
const shared = require('./shared');
const { pushLog } = require('./logger');
const { getCurrentSlot, getParisHour } = require('./bot/scheduling');
const { resetDailyMoodDate, refreshDailyMood } = require('./bot/mood');
const {
  getDailyVibe, resetDailyVibe, getDailyFloatingSchedule,
  shouldSkipConvCron, rollImpulse, popAllPendingRelances,
} = require('./bot/adaptiveSchedule');
const { postRandomConversation, replyToConversations } = require('./features/conversations');
const { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup, postRelanceMention } = require('./features/greetings');
const { runDriftCheck } = require('./features/drift');
const { getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded } = require('./features/convStats');
const { readGuildState } = require('./discord/sync');
const fs = require('fs');

let convCron = null, replyCron = null, floatingEventsCron = null;
let moodResetCron = null, driftCron = null, relanceCron = null;

// Flags "déjà tiré aujourd'hui" pour les events flottants (reset à minuit)
const firedToday = { morning: '', lunch: '', goodnight: '', nightWakeup: '', relance: '' };

function parisDateISO() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function startConvCron() {
  [convCron, replyCron, floatingEventsCron, moodResetCron, driftCron, relanceCron]
    .forEach(c => { if (c) { try { c.stop(); } catch {} } });

  // Initialise la vibe et le planning flottant dès le boot
  getDailyVibe();
  getDailyFloatingSchedule();

  // Conv ambiante — probabiliste + vibe-aware
  convCron = cron.schedule('0 * * * *', () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled) return;
    const slot = getCurrentSlot();
    if (slot.maxConv === 0) return;
    if (shouldSkipConvCron()) { pushLog('SYS', `😶 Skip conv (vibe ${getDailyVibe().name})`); return; }
    resetDailyCountIfNeeded().catch(() => {});
    const count = getConvDailyCount();
    const max = getConvMaxPerDay();
    if (count >= max) return;
    const prob = Math.min(0.85, (max - count) / Math.max(1, 24 - getParisHour()));
    if (Math.random() < prob) { pushLog('SYS', `💬 Conv [${slot.label}] (${count}/${max}, ${Math.round(prob * 100)}%)`); postRandomConversation(); }
  }, { timezone: 'Europe/Paris' });

  // Reply — vibe-aware
  replyCron = cron.schedule('0 */2 * * *', () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled || !cfg.canReply) return;
    if (getCurrentSlot().maxConv === 0) return;
    const vibe = getDailyVibe();
    const baseProba = 0.4 * vibe.responsiveness;
    if (Math.random() < baseProba) replyToConversations();
  }, { timezone: 'Europe/Paris' });

  // Events flottants : morning/lunch/goodnight/nightWakeup déclenchés autour d'une heure aléatoire du jour
  floatingEventsCron = cron.schedule('*/2 * * * *', () => {
    const today = parisDateISO();
    const sched = getDailyFloatingSchedule();
    const h = getParisHour();
    const day = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getDay();
    const vibe = getDailyVibe();

    // Morning — lun-dim avec jitter de jour
    if (firedToday.morning !== today && h >= sched.morning && h < sched.morning + 1) {
      firedToday.morning = today;
      // Probabilité vibe-aware : 85% base, modulée par chattiness
      const proba = Math.min(0.95, 0.60 + vibe.chattiness * 0.35);
      if (Math.random() < proba) {
        pushLog('SYS', `☕ Morning flottant → ${h.toFixed(2)}h (vibe ${vibe.name}, ${Math.round(proba * 100)}%)`);
        postMorningGreeting();
      } else {
        pushLog('SYS', `💤 Morning skip aujourd'hui (vibe ${vibe.name})`);
      }
    }

    // Lunch back
    if (firedToday.lunch !== today && h >= sched.lunchBack && h < sched.lunchBack + 1) {
      firedToday.lunch = today;
      const proba = 0.33 * vibe.chattiness * 2;
      if (Math.random() < Math.min(0.66, proba)) {
        pushLog('SYS', `🍕 Lunch back flottant → ${h.toFixed(2)}h`);
        postLunchBack();
      }
    }

    // Goodnight
    if (firedToday.goodnight !== today && h >= sched.goodnight && h < sched.goodnight + 1) {
      firedToday.goodnight = today;
      const proba = 0.33 * vibe.chattiness * 1.6;
      if (Math.random() < Math.min(0.66, proba)) {
        pushLog('SYS', `🌙 Goodnight flottant → ${h.toFixed(2)}h`);
        postGoodnight();
      }
    }

    // Night wakeup (rare)
    if (firedToday.nightWakeup !== today && h >= sched.nightWakeup && h < sched.nightWakeup + 1) {
      firedToday.nightWakeup = today;
      if (Math.random() < 0.10) {
        pushLog('SYS', `👁️ Night wakeup flottant → ${h.toFixed(2)}h`);
        postNightWakeup();
      }
    }

    // Impulsion : post spontané hors-cron
    if (slot_is_active(h) && rollImpulse()) {
      pushLog('SYS', `⚡ Impulsion spontanée (vibe ${vibe.name})`);
      postRandomConversation();
    }
  }, { timezone: 'Europe/Paris' });

  // Reset quotidien mood + vibe + flags
  moodResetCron = cron.schedule('1 0 * * *', () => {
    resetDailyMoodDate();
    refreshDailyMood();
    resetDailyVibe();
    Object.keys(firedToday).forEach(k => { firedToday[k] = ''; });
    pushLog('SYS', `🌅 Nouvelle journée — vibe & planning régénérés`, 'success');
  }, { timezone: 'Europe/Paris' });

  // Drift check toutes les 3h (inchangé)
  driftCron = cron.schedule('0 */3 * * *', () => {
    const slot = getCurrentSlot();
    if (slot.maxConv > 0) { pushLog('SYS', `🔍 Drift check déclenché [${slot.label}]`); runDriftCheck(); }
  }, { timezone: 'Europe/Paris' });

  // Relance des mentions différées : tous les jours vers 10-11h (avec jitter)
  relanceCron = cron.schedule('*/10 * * * *', () => {
    const today = parisDateISO();
    if (firedToday.relance === today) return;
    const h = getParisHour();
    const slot = getCurrentSlot();
    // Fenêtre de relance : entre 10h et 12h, slot actif
    if (h < 10 || h > 12) return;
    if (slot.maxConv === 0) return;

    const pending = popAllPendingRelances();
    if (pending.length === 0) { firedToday.relance = today; return; }

    firedToday.relance = today;
    pushLog('SYS', `📬 Relance de ${pending.length} mention(s) du jour d'avant`);
    pending.forEach((p, idx) => {
      setTimeout(() => postRelanceMention(p), idx * (45 + Math.random() * 90) * 1000);
    });
  }, { timezone: 'Europe/Paris' });

  pushLog('SYS', `✅ Crons v2.0.7 — vibe adaptative + planning flottant + relances`, 'success');
}

function slot_is_active(h) {
  // Simple : entre 10h et 23h
  return h >= 10 && h < 23.5;
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
