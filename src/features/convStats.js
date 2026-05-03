const shared = require('../shared');
const { pushLog } = require('../logger');
const { getBotState, setBotState } = require('../db/botState');
const { refreshDailyMood } = require('../bot/mood');

function getTodayStr() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function getWeekStr() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeeklyPostMap() {
  if (!shared.botConfig.conversations.weeklyPostsByChannel) shared.botConfig.conversations.weeklyPostsByChannel = {};
  return shared.botConfig.conversations.weeklyPostsByChannel;
}

function resetWeeklyPostsIfNeeded() {
  const { saveConfig } = require('../botConfig');
  const weekStr = getWeekStr();
  const map = getWeeklyPostMap();
  if (map._week !== weekStr) {
    shared.botConfig.conversations.weeklyPostsByChannel = { _week: weekStr };
    saveConfig();
  }
}

function incrementWeeklyPostCount(channelId) {
  resetWeeklyPostsIfNeeded();
  const map = getWeeklyPostMap();
  map[channelId] = (map[channelId] || 0) + 1;
}

function resetWeeklyPostCount(channelId) {
  resetWeeklyPostsIfNeeded();
  const map = getWeeklyPostMap();
  map[channelId] = 0;
}

const WEEKLY_DEAD_LIMIT = 1;
const MONOLOGUE_BOT_RATIO_THRESHOLD = 0.5;
const MONOLOGUE_LOOKBACK = 15;
const NO_INSIST_WINDOW_MS = 24 * 60 * 60 * 1000;

function getConvDailyCount() {
  return shared.botConfig.conversations.dailyCount || 0;
}

function getConvMaxPerDay() {
  return shared.botConfig.conversations.maxPerDay || 16;
}

async function resetDailyCountIfNeeded() {
  const { saveConfig } = require('../botConfig');
  const todayStr = getTodayStr();
  if (shared.botConfig.conversations.lastPostDate !== todayStr) {
    const state = await getBotState();
    if (state.convLastPostDate === todayStr) {
      shared.botConfig.conversations.lastPostDate = todayStr;
      shared.botConfig.conversations.dailyCount = state.convDailyCount || 0;
      return;
    }
    shared.botConfig.conversations.dailyCount = 0;
    shared.botConfig.conversations.lastPostDate = todayStr;
    saveConfig();
    await setBotState({ convDailyCount: 0, convLastPostDate: todayStr });
    refreshDailyMood();
    pushLog('SYS', `🔄 Reset quota — nouveau jour`);
  }
}

async function updateConvStats(channelId) {
  const { saveConfig } = require('../botConfig');
  if (!shared.botConfig.conversations.lastPostByChannel) shared.botConfig.conversations.lastPostByChannel = {};
  shared.botConfig.conversations.lastPostByChannel[channelId] = Date.now();
  const todayStr = getTodayStr();
  if (shared.botConfig.conversations.lastPostDate !== todayStr) {
    shared.botConfig.conversations.dailyCount = 0;
    shared.botConfig.conversations.lastPostDate = todayStr;
  }
  shared.botConfig.conversations.dailyCount = (shared.botConfig.conversations.dailyCount || 0) + 1;
  incrementWeeklyPostCount(channelId);
  saveConfig();
  setBotState({
    convDailyCount: shared.botConfig.conversations.dailyCount,
    convLastPostDate: todayStr,
    convLastPostByChannel: shared.botConfig.conversations.lastPostByChannel,
  }).catch(err => pushLog('ERR', `setBotState convStats: ${err.message}`, 'error'));
}

/**
 * Vérifie si le canal est "calme plat" : aucune activité humaine depuis 72h
 * ET le bot a déjà posté WEEKLY_DEAD_LIMIT fois cette semaine sans réponse.
 * Si oui, Brainee s'abstient pour le reste de la semaine.
 */
async function isChannelDeadThisWeek(channelId, guildChannelResolver) {
  resetWeeklyPostsIfNeeded();
  const map = getWeeklyPostMap();
  if ((map[channelId] || 0) < WEEKLY_DEAD_LIMIT) return false;
  try {
    const channel = await guildChannelResolver(channelId);
    if (!channel?.messages) return false;
    const msgs = await channel.messages.fetch({ limit: 30 });
    const botId = shared.discord?.user?.id;
    const cutoff = Date.now() - 72 * 60 * 60 * 1000;
    const hasRecentHuman = [...msgs.values()].some(m => !m.author?.bot && m.author?.id !== botId && m.createdTimestamp > cutoff);
    if (hasRecentHuman) {
      resetWeeklyPostCount(channelId);
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

// Salons "topic profonds" où Brainee doit être plus entreprenante (hors QG/général/off-topic).
// Ces slugs sont matchés via le channelName (insensible aux emojis + tirets).
const DEEP_TOPIC_HINTS = [
  'jrpg', 'rpg', 'retro', 'indie', 'next-gen', 'hidden-gems',
  'lore', 'pixel-art', 'nostalgie', 'open-world',
  'code-talk', 'ia-et-tools', 'tips-focus', 'playlist-focus',
  'cerveau-en-feu', 'hyperfocus', '3h-du-mat',
  'game-of-the-moment', 'à-découvrir', 'a-decouvrir',
];

function isDeepTopicChannel(channelName = '') {
  const name = channelName.toLowerCase();
  return DEEP_TOPIC_HINTS.some(h => name.includes(h));
}

/**
 * Détermine si Brainee doit s'abstenir de reposter dans un salon où elle a parlé
 * la dernière fois sans qu'aucun humain n'ait répondu après elle.
 * Évite le "50× la même chose" et le monologue.
 * Fenêtre élargie à 24h pour vraiment couper l'insistance.
 */
async function hasUnansweredLastPost(channelId, guildChannelResolver) {
  try {
    const last = shared.botConfig.conversations.lastPostByChannel || {};
    const lastTs = last[channelId] || 0;
    if (!lastTs) return false;
    if (Date.now() - lastTs > NO_INSIST_WINDOW_MS) return false;
    const channel = await guildChannelResolver(channelId);
    if (!channel?.messages) return false;
    const msgs = await channel.messages.fetch({ limit: 20 });
    const arr = [...msgs.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    const botId = shared.discord?.user?.id;
    const lastBotIdx = arr.findIndex(m => m.author?.id === botId);
    if (lastBotIdx === -1) return false;
    const humanAfter = arr.slice(0, lastBotIdx).some(m => !m.author?.bot);
    return !humanAfter;
  } catch (_) {
    return false;
  }
}

/**
 * Détecte un salon "monologue" : Brainee y parle dans le vide.
 * Regarde les MONOLOGUE_LOOKBACK derniers messages et calcule le ratio bot/humain.
 * Si ratio bot >= MONOLOGUE_BOT_RATIO_THRESHOLD ET aucun humain depuis le dernier post du bot,
 * on considère que c'est un salon mort où elle parle seule.
 */
async function isMonologueChannel(channelId, guildChannelResolver) {
  try {
    const channel = await guildChannelResolver(channelId);
    if (!channel?.messages) return false;
    const msgs = await channel.messages.fetch({ limit: MONOLOGUE_LOOKBACK });
    const arr = [...msgs.values()];
    if (arr.length < 4) return false;
    const botId = shared.discord?.user?.id;
    const botCount = arr.filter(m => m.author?.id === botId).length;
    const humanCount = arr.filter(m => !m.author?.bot && m.author?.id !== botId).length;
    if (botCount === 0) return false;
    const ratio = botCount / Math.max(1, botCount + humanCount);
    if (ratio < MONOLOGUE_BOT_RATIO_THRESHOLD) return false;
    const sorted = arr.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    const lastBotIdx = sorted.findIndex(m => m.author?.id === botId);
    if (lastBotIdx === -1) return false;
    const humanAfter = sorted.slice(0, lastBotIdx).some(m => !m.author?.bot);
    return !humanAfter;
  } catch (_) {
    return false;
  }
}

/**
 * Compte combien de posts consécutifs Brainee a faits en haut du salon
 * sans qu'un humain ne réponde entre.
 */
async function countConsecutiveBotPosts(channelId, guildChannelResolver) {
  try {
    const channel = await guildChannelResolver(channelId);
    if (!channel?.messages) return 0;
    const msgs = await channel.messages.fetch({ limit: 20 });
    const arr = [...msgs.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    const botId = shared.discord?.user?.id;
    let count = 0;
    for (const m of arr) {
      if (m.author?.id === botId) count++;
      else if (!m.author?.bot) break;
    }
    return count;
  } catch (_) {
    return 0;
  }
}

function getQuietestChannel() {
  const ranked = getRankedChannels({ excludeGeneral: false });
  return ranked[0] || null;
}

/**
 * Retourne la liste des salons triés par priorité (plus prioritaire en premier).
 * Permet de boucler dessus pour tenter plusieurs fallbacks.
 * - Deep-topic stale (jamais visité ou > 2h) → boostés en tête
 * - Sinon tri par ancienneté du dernier post (plus vieux en premier)
 * Si excludeGeneral=true, retire le #général de la liste pour pouvoir l'utiliser
 * comme ultime fallback séparé.
 */
function getRankedChannels({ excludeGeneral = false } = {}) {
  const active = shared.botConfig.conversations.channels.filter(c => c.enabled);
  if (!active.length) return [];
  const filtered = excludeGeneral
    ? active.filter(c => !/general|général/i.test(c.channelName))
    : active;
  const last = shared.botConfig.conversations.lastPostByChannel || {};
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  return [...filtered]
    .map(c => {
      const lastTs = last[c.channelId] || 0;
      const isStale = !lastTs || (Date.now() - lastTs) > TWO_HOURS;
      const deepBonus = (isDeepTopicChannel(c.channelName) && isStale) ? -1_000_000_000 : 0;
      return { c, sortKey: lastTs + deepBonus };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(x => x.c);
}

/**
 * Retourne la config du salon #général (safety net pour les fallbacks).
 */
function getGeneralChannel() {
  const active = shared.botConfig.conversations.channels.filter(c => c.enabled);
  return active.find(c => /general|général/i.test(c.channelName)) || null;
}

module.exports = {
  getTodayStr, getConvDailyCount, getConvMaxPerDay,
  resetDailyCountIfNeeded, updateConvStats, getQuietestChannel,
  getRankedChannels, getGeneralChannel,
  isDeepTopicChannel, hasUnansweredLastPost, DEEP_TOPIC_HINTS,
  isChannelDeadThisWeek, resetWeeklyPostCount,
  isMonologueChannel, countConsecutiveBotPosts,
};
