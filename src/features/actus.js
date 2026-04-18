const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { getBotState, setBotState } = require('../db/botState');
const { BOT_PERSONA } = require('../bot/persona');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { saveConfig } = require('../botConfig');

let actusCron = null;

async function postActuForChannel(ch) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return false;
    const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const content = await callClaude(
      BOT_PERSONA + "\nTu résumes les actus gaming récentes.",
      `Récap actus pour : ${ch.topic}. 4-6 actus avec emojis. Ton Brainee. Commence direct.`,
      600
    );
    const embed = new EmbedBuilder()
      .setColor(0x5b7fff)
      .setTitle(`📅 Actus ${month.charAt(0).toUpperCase() + month.slice(1)}`)
      .setDescription(content)
      .setFooter({ text: `${ch.channelName} • Brainee` })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `✅ Actus → ${ch.channelName}`, 'success');
    broadcast('actuPosted', { channel: ch.channelName });
    return true;
  } catch (err) { pushLog('ERR', `Actus échouées ${ch.channelName} : ${err.message}`, 'error'); return false; }
}

function getCurrentActusSlot() {
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${p.getDate() < 15 ? '1' : '15'}`;
}

function postBiMonthlyActus(force) {
  const cfg = shared.botConfig.actus;
  if (!cfg.enabled) return;
  const slotKey = getCurrentActusSlot();
  const posted = Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [];
  if (!force && posted.includes(slotKey)) { pushLog('SYS', `Actus déjà postées (${slotKey})`); return; }
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return;
  if (!force) {
    shared.botConfig.actus.lastPostedSlots = [...posted, slotKey].slice(-20);
    saveConfig();
    setBotState({ actusLastPostedSlots: shared.botConfig.actus.lastPostedSlots }).catch(() => {});
  }
  const windowMs = 12 * 60 * 60 * 1000;
  pushLog('SYS', `📅 Actus bi-mensuelles — ${active.length} salons sur 12h`);
  active.forEach(ch => setTimeout(() => postActuForChannel(ch), Math.floor(Math.random() * windowMs)));
}

function startActusCron() {
  if (actusCron) { try { actusCron.stop(); } catch {} }
  actusCron = cron.schedule('0 10 1,15 * *', () => postBiMonthlyActus(false), { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron actus → 1er et 15 du mois`);
}

async function checkActusMissed() {
  const cfg = shared.botConfig.actus;
  if (!cfg.enabled) return;
  const state = await getBotState();
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  if ((p.getDate() !== 1 && p.getDate() !== 15) || p.getHours() < 10 || p.getHours() >= 22) return;
  const slotKey = getCurrentActusSlot();
  const allSlots = [...new Set([...(state.actusLastPostedSlots || []), ...(Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [])])];
  if (allSlots.includes(slotKey)) return;
  pushLog('SYS', `⚠️ Actus manquées — rattrapage 60s`);
  setTimeout(() => postBiMonthlyActus(false), 60000);
}

module.exports = { postActuForChannel, getCurrentActusSlot, postBiMonthlyActus, startActusCron, checkActusMissed };
