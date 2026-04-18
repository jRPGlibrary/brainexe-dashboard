const shared = require('../shared');
const { pushLog } = require('../logger');
const { getBotState, setBotState } = require('../db/botState');
const { refreshDailyMood } = require('../bot/mood');

function getTodayStr() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

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
  saveConfig();
  setBotState({
    convDailyCount: shared.botConfig.conversations.dailyCount,
    convLastPostDate: todayStr,
    convLastPostByChannel: shared.botConfig.conversations.lastPostByChannel,
  }).catch(() => {});
}

function getQuietestChannel() {
  const active = shared.botConfig.conversations.channels.filter(c => c.enabled);
  if (!active.length) return null;
  const last = shared.botConfig.conversations.lastPostByChannel || {};
  return [...active].sort((a, b) => (last[a.channelId] || 0) - (last[b.channelId] || 0))[0];
}

module.exports = { getTodayStr, getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded, updateConvStats, getQuietestChannel };
