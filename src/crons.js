const cron = require('node-cron');
const shared = require('./shared');
const { pushLog } = require('./logger');
const { getCurrentSlot, getParisHour } = require('./bot/scheduling');
const { resetDailyMoodDate, refreshDailyMood } = require('./bot/mood');
const {
  getDailyVibe, resetDailyVibe, getDailyFloatingSchedule,
  shouldSkipConvCron, rollImpulse, popAllPendingRelances,
} = require('./bot/adaptiveSchedule');
const { GUILD_ID } = require('./config');
const { getRandomReaction } = require('./bot/reactions');
const { postRandomConversation, replyToConversations } = require('./features/conversations');
const { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup, postRelanceMention } = require('./features/greetings');
const { runDriftCheck } = require('./features/drift');
const { getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded } = require('./features/convStats');
const {
  updateInternalStatesForSlot, applyNaturalDecay, applyDailyDrift,
  decayEmotions, saveEmotionalState,
} = require('./bot/emotions');
const { runDailyBondEvolution } = require('./db/memberBonds');
const { addNarrativeArc } = require('./db/narrativeMemory');
const { runStoriesDecay } = require('./db/memberStories');
const { rollOutreach, fireOutreach } = require('./features/proactiveOutreach');
const { processDueObsessions } = require('./features/hyperFocusRevisit');
const { runHyperFocusDecay } = require('./bot/hyperFocus');
const { tickVulnerabilityCheck } = require('./bot/vulnerability');
const { scanForPinCandidates } = require('./features/extendedPermissions');
const { readGuildState } = require('./discord/sync');
const { callClaude } = require('./ai/claude');
const fs = require('fs');

let convCron = null, replyCron = null, floatingEventsCron = null;
let moodResetCron = null, driftCron = null, relanceCron = null;
let emotionHourlyCron = null, emotionDailyCron = null, narrativeCron = null;
let reactionScanCron = null, outreachCron = null, hyperFocusCron = null;
let vulnerabilityCron = null, pinScanCron = null;

// Flags "déjà tiré aujourd'hui" pour les events flottants (reset à minuit)
const firedToday = { morning: '', lunch: '', goodnight: '', nightWakeup: '', relance: '' };

function parisDateISO() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function startConvCron() {
  [convCron, replyCron, floatingEventsCron, moodResetCron, driftCron, relanceCron, emotionHourlyCron, emotionDailyCron, narrativeCron, reactionScanCron, outreachCron, hyperFocusCron, vulnerabilityCron, pinScanCron]
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
    resetDailyCountIfNeeded().catch(err => pushLog('ERR', `Reset quota journalier: ${err.message}`, 'error'));
    const count = getConvDailyCount();
    const max = getConvMaxPerDay();
    if (count >= max) return;
    const prob = Math.min(0.85, (max - count) / Math.max(1, 24 - getParisHour()));
    if (Math.random() < prob) { pushLog('SYS', `💬 Conv [${slot.label}] (${count}/${max}, ${Math.round(prob * 100)}%)`); postRandomConversation(); }
  }, { timezone: 'Europe/Paris' });

  // Reply — vibe-aware, toutes les 45 min pour une présence plus régulière
  replyCron = cron.schedule('*/45 * * * *', () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled || !cfg.canReply) return;
    if (getCurrentSlot().maxConv === 0) return;
    if (!slot_is_active(getParisHour())) return;
    const vibe = getDailyVibe();
    // Probabilité ajustée (45 min = ~2x plus de ticks qu'avant, on garde fréquence globale similaire mais un peu plus active)
    const baseProba = 0.25 * vibe.responsiveness;
    if (Math.random() < baseProba) replyToConversations();
  }, { timezone: 'Europe/Paris' });

  // Scan réactif — lit les conversations récentes et réagit avec des emojis (presence passive)
  reactionScanCron = cron.schedule('*/20 * * * *', async () => {
    const cfg = shared.botConfig.conversations;
    if (!cfg.enabled) return;
    const slot = getCurrentSlot();
    if (slot.maxConv === 0 || !slot_is_active(getParisHour())) return;
    const vibe = getDailyVibe();
    // Moins actif si vibe introvert/lazy, plus si chatty/excited
    if (Math.random() > vibe.chattiness * 0.45) return;
    try {
      const active = cfg.channels.filter(c => c.enabled);
      if (!active.length) return;
      const ch = active[Math.floor(Math.random() * active.length)];
      const guild = await shared.discord.guilds.fetch(GUILD_ID);
      await guild.channels.fetch();
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) return;
      const msgs = await channel.messages.fetch({ limit: 30 });
      const botId = shared.discord.user?.id;
      const now = Date.now();
      const WINDOW = 25 * 60 * 1000; // messages des 25 dernières minutes
      const candidates = [...msgs.values()].filter(m =>
        !m.author.bot &&
        (now - m.createdTimestamp) < WINDOW &&
        m.content?.length > 15 &&
        !m.reactions?.cache?.some(r => r.me)
      );
      if (!candidates.length) return;
      // Réagit à 1 message (parfois 2 si vibe excited/chatty)
      const maxReact = (vibe.name === 'excited' || vibe.name === 'chatty') && Math.random() < 0.35 ? 2 : 1;
      const toReact = candidates.slice(0, maxReact);
      for (const msg of toReact) {
        await msg.react(getRandomReaction(msg.content)).catch(() => {});
      }
      if (toReact.length) {
        pushLog('SYS', `👁️ Scan réactif : ${toReact.length} réaction(s) → #${ch.channelName}`);
        shared.lastAnyBotPostTime = Date.now();
      }
    } catch (_) {}
  }, { timezone: 'Europe/Paris' });

  // Events flottants : morning/lunch/goodnight/nightWakeup déclenchés autour d'une heure aléatoire du jour
  floatingEventsCron = cron.schedule('*/2 * * * *', () => {
    const today = parisDateISO();
    const sched = getDailyFloatingSchedule();
    const h = getParisHour();
    const vibe = getDailyVibe();

    // Morning — lun-dim avec jitter de jour
    if (firedToday.morning !== today && h >= sched.morning && h < sched.morning + 1) {
      firedToday.morning = today;
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

  // Relance des mentions différées : tous les jours vers 10-12h (avec jitter)
  relanceCron = cron.schedule('*/10 * * * *', () => {
    const today = parisDateISO();
    if (firedToday.relance === today) return;
    const h = getParisHour();
    const slot = getCurrentSlot();
    if (h < 10 || h > 12) return;
    if (slot.maxConv === 0) return;

    const pending = popAllPendingRelances();
    if (pending.length === 0) { return; } // ne pas bloquer les futures relances du jour

    firedToday.relance = today;
    pushLog('SYS', `📬 Relance de ${pending.length} mention(s) du jour d'avant`);
    pending.forEach((p, idx) => {
      setTimeout(() => postRelanceMention(p), idx * (45 + Math.random() * 90) * 1000);
    });
  }, { timezone: 'Europe/Paris' });

  // Decay des émotions + update des états internes selon le slot toutes les heures
  emotionHourlyCron = cron.schedule('30 * * * *', () => {
    try {
      const slot = getCurrentSlot();
      updateInternalStatesForSlot(slot);
      applyNaturalDecay();
      decayEmotions();
      saveEmotionalState().catch(err => pushLog('ERR', `Sauvegarde état émotionnel: ${err.message}`, 'error'));
      pushLog('SYS', `💗 Évolution émotionnelle horaire [${slot.label}]`);
    } catch (err) { pushLog('ERR', `emotionHourlyCron: ${err.message}`, 'error'); }
  }, { timezone: 'Europe/Paris' });

  // Évolution journalière des bonds + drift des états internes à 00h05
  emotionDailyCron = cron.schedule('5 0 * * *', async () => {
    try {
      applyDailyDrift();
      await runDailyBondEvolution();
      await runStoriesDecay();
      await runHyperFocusDecay();
      await saveEmotionalState();
      pushLog('SYS', `💞 Évolution journalière bonds + stories + hyper-focus + états internes`, 'success');
    } catch (err) { pushLog('ERR', `emotionDailyCron: ${err.message}`, 'error'); }
  }, { timezone: 'Europe/Paris' });

  // Analyse narrative des derniers messages — une fois par jour à 02h
  narrativeCron = cron.schedule('0 2 * * *', async () => {
    try {
      if (!shared.discord?.isReady()) return;
      const guild = await shared.discord.guilds.fetch(shared.botConfig.guildId);
      if (!guild) return;
      await guild.channels.fetch();

      const allMessages = [];
      const channels = guild.channels.cache.filter(c => c.isTextBased());

      for (const ch of channels.values()) {
        try {
          const msgs = await ch.messages.fetch({ limit: 50 });
          allMessages.push(...msgs.values());
        } catch (err) { pushLog('SYS', `Narrative: impossible de lire #${ch.name} — ${err.message}`); }
      }

      if (allMessages.length < 10) return;

      const sortedMsgs = allMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp).slice(0, 50);
      const msgSummary = sortedMsgs
        .map(m => `[${m.author.username}] ${m.content.slice(0, 100)}`)
        .join('\n');

      const prompt = `Analyse ces 50 derniers messages Discord et identifie 3-4 "faits marquants" ou arcs narratifs intéressants — des éléments qui définissent la dynamique du groupe ou les tendances émergentes.\n\nMessages:\n${msgSummary}\n\nRetourne un JSON array avec objets {title, description, importance (1-5)}. Sois bref, ne repère que les vrais patterns.`;

      let { text: arcsJson } = await callClaude('', prompt, 300);
      arcsJson = arcsJson.replace(/```json|```/g, '').trim();

      try {
        const arcs = JSON.parse(arcsJson);
        if (Array.isArray(arcs)) {
          for (const arc of arcs) {
            if (arc.title && arc.description) {
              await addNarrativeArc({
                title: arc.title,
                description: arc.description,
                importance: arc.importance || 3,
              });
            }
          }
          pushLog('SYS', `📖 Arcs narratifs mis à jour (${arcs.filter(a => a.title).length} identifiés)`, 'success');
        }
      } catch (parseErr) {
        pushLog('ERR', `Narrative arc parsing: ${parseErr.message}`, 'error');
      }
    } catch (err) {
      pushLog('ERR', `narrativeCron: ${err.message}`, 'error');
    }
  }, { timezone: 'Europe/Paris' });

  // Proactive outreach — toutes les 35 min, déclenchement probabiliste
  outreachCron = cron.schedule('*/35 * * * *', () => {
    if (!slot_is_active(getParisHour())) return;
    if (!rollOutreach()) return;
    pushLog('SYS', `⚡ Tick outreach déclenché`);
    fireOutreach().catch(err => pushLog('ERR', `outreach: ${err.message}`, 'error'));
  }, { timezone: 'Europe/Paris' });

  // Hyper-focus revisit — toutes les 25 min, traite UNE obsession arrivée à terme
  hyperFocusCron = cron.schedule('*/25 * * * *', () => {
    if (!slot_is_active(getParisHour())) return;
    processDueObsessions().catch(err => pushLog('ERR', `hyperFocusRevisit: ${err.message}`, 'error'));
  }, { timezone: 'Europe/Paris' });

  // Vulnerability — tick toutes les heures, ouvre rarement (~6%/tick si conditions remplies)
  vulnerabilityCron = cron.schedule('15 * * * *', () => {
    tickVulnerabilityCheck().catch(err => pushLog('ERR', `vulnerability: ${err.message}`, 'error'));
  }, { timezone: 'Europe/Paris' });

  // Pin scan — toutes les 2h, repère un message vraiment marquant à épingler
  pinScanCron = cron.schedule('15 */2 * * *', () => {
    if (!slot_is_active(getParisHour())) return;
    scanForPinCandidates().catch(err => pushLog('ERR', `pinScan: ${err.message}`, 'error'));
  }, { timezone: 'Europe/Paris' });

  pushLog('SYS', `✅ Crons v2.6.0 — reply 45min + scan 20min + relances + émotions + bonds + narrative + outreach 35min (proba 8%) + hyperFocus 25min + vuln 1h + pin 90min`, 'success');
}

function slot_is_active(h) {
  // Simple : entre 10h et 23h30
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
