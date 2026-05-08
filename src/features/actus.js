const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, GNEWS_API_KEY, NEWSAPI_API_KEY, RAWG_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { getBotState, setBotState } = require('../db/botState');
const { BOT_PERSONA } = require('../bot/persona');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { saveConfig } = require('../botConfig');
const { sanitizeForJson } = require('../utils');

let actusCron = null;

function withTimeout(ms, signal) {
  const controller = signal || new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, cleanup: () => clearTimeout(timeout) };
}

async function fetchGNewsArticles(topic, postedUrls = []) {
  if (!GNEWS_API_KEY) return [];

  try {
    const query = encodeURIComponent(`gaming ${topic}`);
    const from = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { controller, cleanup } = withTimeout(8000);

    pushLog('DBG', `GNews: fetching "${topic}" (FR)`, 'debug');
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${query}&max=25&sortby=publishedAt&from=${from}&lang=fr&token=${GNEWS_API_KEY}`,
      { signal: controller.signal }
    );
    cleanup();

    if (!res.ok) throw new Error(`GNews ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const articles = (data.articles || [])
      .filter(a => a?.url && a?.title && !postedUrls.includes(a.url))
      .map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'GNews',
        source_id: 'gnews'
      }))
      .slice(0, 8);

    pushLog('DBG', `GNews: ${articles.length} articles trouvés`, 'debug');
    return articles;
  } catch (err) {
    pushLog('DBG', `GNews: ${err.message}`, 'debug');
    return [];
  }
}

async function fetchNewsAPIArticles(topic, postedUrls = []) {
  if (!NEWSAPI_API_KEY) return [];

  try {
    const query = encodeURIComponent(`${topic} gaming video game`);
    const { controller, cleanup } = withTimeout(8000);

    pushLog('DBG', `NewsAPI: fetching "${topic}"`, 'debug');
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=25&apiKey=${NEWSAPI_API_KEY}`,
      { signal: controller.signal }
    );
    cleanup();

    if (!res.ok) throw new Error(`NewsAPI ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const articles = (data.articles || [])
      .filter(a => a?.url && a?.title && !postedUrls.includes(a.url))
      .map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'NewsAPI',
        source_id: 'newsapi'
      }))
      .slice(0, 8);

    pushLog('DBG', `NewsAPI: ${articles.length} articles trouvés`, 'debug');
    return articles;
  } catch (err) {
    pushLog('DBG', `NewsAPI: ${err.message}`, 'debug');
    return [];
  }
}

async function fetchGamingNews(topic, postedUrls = []) {
  const cleanTopic = topic
    .replace(/[,;:()—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .slice(0, 50);

  pushLog('DBG', `Actus: agrégation multi-sources pour "${cleanTopic}"`, 'debug');

  const [gnewsArticles, newsapiArticles] = await Promise.all([
    fetchGNewsArticles(cleanTopic, postedUrls),
    fetchNewsAPIArticles(cleanTopic, postedUrls)
  ]);

  const allArticles = [...gnewsArticles, ...newsapiArticles];

  const uniqueArticles = Array.from(
    new Map(allArticles.map(a => [a.url, a])).values()
  ).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return uniqueArticles.slice(0, 8);
}

async function postActuForChannel(ch) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return false;

    const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const state = await getBotState();
    const postedUrls = Array.isArray(state.postedNewsUrls) ? state.postedNewsUrls : [];

    const articles = await fetchGamingNews(ch.topic, postedUrls);
    let content;
    pushLog('DBG', `Actus pour "${ch.topic}" → ${articles.length} articles trouvés`, 'debug');

    if (articles.length >= 2) {
      const selected = articles.slice(0, 6);
      const newsContext = selected.map((a, i) => {
        const date = new Date(a.publishedAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
        const sourceEmoji = a.source_id === 'gnews' ? '📰' : a.source_id === 'newsapi' ? '📺' : '🎮';
        return `${i + 1}. ${a.title}\n   ${a.description || ''}\n   ${sourceEmoji} ${a.source} (${date})\n   Lien : ${a.url}`;
      }).join('\n\n');

      ({ text: content } = await callClaude(
        '\nTu résumes des actualités gaming basées sur des sources réelles. IMPORTANT : chaque actu DOIT avoir son lien exact au format Markdown [titre](url).',
        `Actus gaming ${month} pour : ${sanitizeForJson(ch.topic)}\n\nSources : ${[...new Set(selected.map(a => a.source))].join(', ')}\n\n${newsContext}\n\n4-6 actus avec emojis. Style Brainee. Commence direct. CHAQUE ACTU DOIT AVOIR [son lien](url) EXACT.`,
        500,
        BOT_PERSONA,
        'claude-haiku-4-5-20251001'
      ));

      const newPostedUrls = [...postedUrls, ...selected.map(a => a.url)].slice(-100);
      try {
        await setBotState({ postedNewsUrls: newPostedUrls });
      } catch (cacheErr) {
        pushLog('WARN', `Actus : mise en cache échouée (non critique) : ${cacheErr.message}`, 'warn');
      }
    } else {
      pushLog('SYS', `⚠️ APIs insuffisantes pour ${ch.channelName} → fallback Claude`, 'warn');
      ({ text: content } = await callClaude(
        '\nTu résumes les actualités gaming récentes avec ton expertise.',
        `Récap actus ${month} pour : ${sanitizeForJson(ch.topic)}. 4-6 actus avec emojis. Ton style Brainee. Commence direct.`,
        350,
        BOT_PERSONA,
        'claude-haiku-4-5-20251001'
      ));
    }

    const embed = new EmbedBuilder()
      .setColor(0x5b7fff)
      .setTitle(`📅 Actus ${month.charAt(0).toUpperCase() + month.slice(1)}`)
      .setDescription(content)
      .setFooter({ text: `${ch.channelName} • Brainee (multi-sources)` })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `✅ Actus → ${ch.channelName}`, 'success');
    broadcast('actuPosted', { channel: ch.channelName });
    return true;
  } catch (err) {
    pushLog('ERR', `Actus échouées ${ch.channelName} : ${err.message}`, 'error');
    return false;
  }
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
