const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID } = require('../config');
const { callClaude } = require('../ai/claude');
const { getBotState, setBotState } = require('../db/botState');
const { BOT_PERSONA } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { saveConfig } = require('../botConfig');
const { sanitizeForJson } = require('../utils');

const ANECDOTE_HISTORY_MAX = 30;

let anecdoteCron = null;

async function getAnecdoteHistory() {
  const state = await getBotState();
  return state.anecdoteHistory || [];
}

async function recordAnecdote(text) {
  const history = await getAnecdoteHistory();
  // Stocke un fingerprint court (premiers 120 chars) pour éviter de repasser le même sujet
  const fingerprint = text.slice(0, 120).replace(/\s+/g, ' ').trim();
  const updated = [fingerprint, ...history].slice(0, ANECDOTE_HISTORY_MAX);
  await setBotState({ anecdoteHistory: updated });
}

async function generateAnecdote(ch) {
  const mood = refreshDailyMood();
  const history = await getAnecdoteHistory();
  const historyBlock = history.length
    ? `\nAnecdotes déjà racontées (à NE PAS répéter, même thème ou même jeu) :\n${history.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';
  const { text } = await callClaude(
    `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nTu génères des anecdotes gaming courtes, vraies, surprenantes. Chaque anecdote doit être sur un jeu ou sujet DIFFÉRENT des précédentes.${historyBlock}`,
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
    await channel.send({ content: '**🧠 Le saviez-vous ?**', embeds: [embed] });
    await recordAnecdote(text);
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
