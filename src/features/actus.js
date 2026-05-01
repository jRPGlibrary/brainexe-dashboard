const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, GNEWS_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { getBotState, setBotState } = require('../db/botState');
const { BOT_PERSONA } = require('../bot/persona');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { saveConfig } = require('../botConfig');
const { sanitizeForJson } = require('../utils');

let actusCron = null;

async function fetchGamingNews(topic, postedUrls = []) {
  if (!GNEWS_API_KEY) {
    pushLog('ERR', `GNews : API key manquante`, 'error');
    return [];
  }
  const cleanTopic = topic.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const query = encodeURIComponent(`gaming ${cleanTopic}`);
  const from = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const base = `https://gnews.io/api/v4/search?q=${query}&max=10&sortby=publishedAt&from=${from}&apikey=${GNEWS_API_KEY}`;
  try {
    const resFr = await fetch(`${base}&lang=fr`);
    if (!resFr.ok) throw new Error(`GNews FR ${resFr.status}: ${resFr.statusText}`);
    const dataFr = await resFr.json();
    if (!dataFr.articles) throw new Error(`GNews réponse invalide (pas de articles)`);
    let articles = dataFr.articles.filter(a => !postedUrls.includes(a.url));
    pushLog('DBG', `GNews FR "${topic}" → ${dataFr.articles.length} articles (${articles.length} neufs)`, 'debug');
    if (articles.length < 3) {
      const resEn = await fetch(`${base}&lang=en`);
      if (resEn.ok) {
        const dataEn = await resEn.json();
        if (dataEn.articles) {
          const extra = dataEn.articles.filter(a => !postedUrls.includes(a.url) && !articles.find(b => b.url === a.url));
          pushLog('DBG', `GNews EN "${topic}" → ${dataEn.articles.length} articles (${extra.length} ajoutés)`, 'debug');
          articles.push(...extra);
        }
      }
    }
    return articles;
  } catch (err) {
    pushLog('ERR', `GNews échouée pour "${topic}" : ${err.message}`, 'error');
    return [];
  }
}

async function postActuForChannel(ch) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return false;

    const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const state = await getBotState();
    const postedUrls = state.postedNewsUrls || [];

    const articles = await fetchGamingNews(ch.topic, postedUrls);
    let content;
    pushLog('DBG', `Actus pour "${ch.topic}" → ${articles.length} articles trouvés`, 'debug');

    if (articles.length >= 2) {
      const selected = articles.slice(0, 6);
      const newsContext = selected.map((a, i) =>
        `${i + 1}. ${a.title}\n   ${a.description || ''}\n   Lien : ${a.url}`
      ).join('\n\n');
      ({ text: content } = await callClaude(
        '\nTu résumes des actualités gaming récentes fournies. Inclus chaque lien en format Markdown [titre](url) dans le résumé.',
        `Actus gaming ${month} pour : ${sanitizeForJson(ch.topic)}\n\n${newsContext}\n\n4-6 actus avec emojis. Style Brainee. Commence direct. Intègre les liens.`,
        900,
        BOT_PERSONA
      ));
      const newPostedUrls = [...postedUrls, ...selected.map(a => a.url)].slice(-100);
      await setBotState({ postedNewsUrls: newPostedUrls });
    } else {
      pushLog('SYS', `⚠️ GNews sans résultats pour ${ch.channelName} → fallback Claude`, 'warn');
      ({ text: content } = await callClaude(
        '\nTu résumes les actus gaming récentes.',
        `Récap actus pour : ${sanitizeForJson(ch.topic)}. 4-6 actus avec emojis. Ton Brainee. Commence direct.`,
        600,
        BOT_PERSONA
      ));
    }

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
    setBotState({ actusLastPostedSlots: shared.botConfig.actus.lastPostedSlots }).catch(err => pushLog('ERR', `setBotState actus: ${err.message}`, 'error'));
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
