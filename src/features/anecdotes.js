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

let anecdoteCron = null;

async function generateAnecdote(ch) {
  const mood = refreshDailyMood();
  return callClaude(
    `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nTu génères des anecdotes gaming courtes, vraies, surprenantes.`,
    `Anecdote gaming sur : ${ch.topic}. 2-3 phrases max. Direct. Fin : 🕹️ *[Jeu concerné]*`,
    400,
    BOT_PERSONA
  );
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
      const tName = await callClaude('Génères un nom de fil Discord court (max 60 car, pas de guillemets, emoji gaming).', `Nom de fil pour : ${text.slice(0, 200)}`, 60);
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

function startAnecdoteCron() {
  if (anecdoteCron) { try { anecdoteCron.stop(); } catch {} }
  const h = shared.botConfig.anecdote.hour || 10;
  anecdoteCron = cron.schedule(`0 ${h} * * *`, () => {
    const d = Math.floor(Math.random() * (shared.botConfig.anecdote.randomDelayMax || 30) * 60 * 1000);
    setTimeout(postDailyAnecdote, d);
  }, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron anecdote → ${h}h`);
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

module.exports = { generateAnecdote, postDailyAnecdote, startAnecdoteCron, checkAnecdoteMissed };
