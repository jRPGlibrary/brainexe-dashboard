const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { getBotState, setBotState } = require('../db/botState');
const { BOT_PERSONA } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { saveConfig } = require('../botConfig');
const { sanitizeForJson } = require('../utils');

let anecdoteCron = null;

async function generateAnecdote(ch) {
  const mood = refreshDailyMood();
  const { text } = await callClaude(
    `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nTu génères des anecdotes gaming courtes, vraies, surprenantes.`,
    `Anecdote gaming sur : ${sanitizeForJson(ch.topic)}. 2-3 phrases max. Direct. Fin : 🕹️ *[Jeu concerné]*`,
    400,
    BOT_PERSONA
  );
  return text;
}

async function postDailyAnecdote() {
  const cfg = shared.botConfig.anecdote;
  if (!cfg.enabled) return;
  const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  if (cfg.lastPostedDate === todayStr) return;
  const active = (cfg.channels || []).filter(c => c.enabled);
  if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const text = await generateAnecdote(ch);
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    const embed = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle('🎮 Anecdote Gaming du jour')
      .setDescription(text)
      .setFooter({ text: `${today.charAt(0).toUpperCase() + today.slice(1)} • Brainee` })
      .setTimestamp();
    const sentMsg = await channel.send({ content: '**🧠 Le saviez-vous ?**', embeds: [embed] });
    try {
      const { text: tName } = await callClaude('Génères un nom de fil Discord court (max 60 car, pas de guillemets, emoji gaming).', `Nom de fil pour : ${sanitizeForJson(text.slice(0, 200))}`, 60);
      await sentMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil anecdote Brainee' });
      pushLog('SYS', `🧵 Fil anecdote créé`, 'success');
    } catch (_) {}
    shared.botConfig.anecdote.lastPostedDate = todayStr;
    saveConfig();
    await setBotState({ anecdoteLastPostedDate: todayStr });
    pushLog('SYS', `✅ Anecdote → #${ch.channelName}`, 'success');
    broadcast('anecdote', { status: 'posted', channel: ch.channelName });
  } catch (err) { pushLog('ERR', `Anecdote échouée : ${err.message}`, 'error'); }
}

async function checkAnecdoteThreads() {
  const cfg = shared.botConfig.anecdote;
  if (!cfg?.enabled) return;
  const active = (cfg.channels || []).filter(c => c.enabled);
  if (!active.length) return;

  const DEAD_MS = 4 * 60 * 60 * 1000;    // thread mort si pas d'activité depuis 4h
  const TOO_FRESH_MS = 20 * 60 * 1000;   // pas de réponse si message il y a < 20min

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    for (const ch of active) {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) continue;

      const fetched = await channel.threads.fetchActive();
      for (const [, thread] of fetched.threads) {
        // Seulement les threads créés par le bot
        if (thread.ownerId !== shared.discord.user?.id) continue;

        const msgs = await thread.messages.fetch({ limit: 15 });
        if (!msgs.size) continue;

        const lastMsg = msgs.first();
        const ageMs = Date.now() - lastMsg.createdTimestamp;

        // Thread mort ou trop frais → skip
        if (ageMs > DEAD_MS) continue;
        if (ageMs < TOO_FRESH_MS) continue;
        // Brainee a déjà parlé en dernier → skip
        if (lastMsg.author.id === shared.discord.user?.id) continue;

        // 35% de chance de rejoindre spontanément
        if (Math.random() > 0.35) continue;

        const threadContext = [...msgs.values()]
          .reverse()
          .slice(-8)
          .map(m => `[${m.author.username}] ${m.content.slice(0, 120)}`)
          .join('\n');

        const { text } = await callClaude(
          `Tu rejoins spontanément un fil de discussion gaming sur Discord. Quelqu'un a répondu à ton anecdote du jour. Rentre direct dans la conversation, 1-2 phrases max, style Brainee. Pas de "bonjour", pas de présentation.`,
          `Fil : ${thread.name}\nÉchanges récents :\n${threadContext}`,
          180,
          BOT_PERSONA
        );

        await thread.send(text);
        pushLog('SYS', `🧵 Retour spontané dans le fil "${thread.name}"`, 'success');
      }
    }
  } catch (err) {
    pushLog('ERR', `checkAnecdoteThreads: ${err.message}`, 'error');
  }
}

function startAnecdoteCron() {
  if (anecdoteCron) { try { anecdoteCron.stop(); } catch {} }
  const h = shared.botConfig.anecdote.hour || 10;
  anecdoteCron = cron.schedule(`0 ${h} * * *`, () => {
    const d = Math.floor(Math.random() * (shared.botConfig.anecdote.randomDelayMax || 30) * 60 * 1000);
    setTimeout(postDailyAnecdote, d);
  }, { timezone: 'Europe/Paris' });

  // Vérification spontanée des fils anecdote — 3 fois par jour en heures actives
  cron.schedule('0 14,17,20 * * *', () => {
    if (!shared.discord?.isReady()) return;
    checkAnecdoteThreads();
  }, { timezone: 'Europe/Paris' });

  pushLog('SYS', `✅ Cron anecdote → ${h}h + vérif threads 14h/17h/20h`);
}

async function checkAnecdoteMissed() {
  const cfg = shared.botConfig.anecdote;
  if (!cfg.enabled) return;
  const state = await getBotState();
  const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  if ((state.anecdoteLastPostedDate || cfg.lastPostedDate) === parisNow.toLocaleDateString('fr-CA')) return;
  if (parisNow.getHours() >= (cfg.hour || 10)) {
    pushLog('SYS', `⚠️ Anecdote manquée — rattrapage 30s`);
    setTimeout(postDailyAnecdote, 30000);
  }
}

module.exports = { generateAnecdote, postDailyAnecdote, startAnecdoteCron, checkAnecdoteMissed, checkAnecdoteThreads };
