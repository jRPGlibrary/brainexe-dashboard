const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude } = require('../ai/claude');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { BOT_PERSONA, BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot, getRandomMode, getSlotIntervalMs } = require('../bot/scheduling');
const { getChannelIntentBlock, getModeInjectionForChannel } = require('../bot/channelIntel');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { getRandomReaction, shouldCreateThread } = require('../bot/reactions');
const { formatContext } = require('./context');
const { scheduleDelayedSpontaneousReply } = require('./delayedReply');
const {
  getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded,
  updateConvStats, getQuietestChannel,
} = require('./convStats');

async function postRandomConversation() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  await resetDailyCountIfNeeded();
  if (getConvDailyCount() >= getConvMaxPerDay()) return;
  if (Date.now() - shared.lastAnyBotPostTime < getSlotIntervalMs(slot)) return;
  const ch = getQuietestChannel();
  if (!ch) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return;
    const mode = getRandomMode(slot);
    const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryC = await getChannelDirectory(ch.channelId);
    const intentBlockC = getChannelIntentBlock(channel.name, ch.topic, dirEntryC?.officialDescription || '');
    const modeBlock = getModeInjectionForChannel(mode, channel.name, ch.topic);
    let contextBlock = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 100 });
      const ctx = formatContext(msgs, null, 80);
      if (ctx.length > 20) contextBlock = `\nContexte récent (évite de répéter) :\n${ctx}`;
    } catch (_) {}
    const content = await callClaude(
      `\nHumeur : ${mood}. ${getMoodInjection(mood)}\n${memoryBlock}\n${intentBlockC}\n${modeBlock}` + contextBlock,
      `Max 3 phrases. Direct. Adapte-toi au salon.`,
      150,
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    const sentMsg = await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    if (shouldCreateThread(content, channel.name, false)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${content}"`, 60);
        await sentMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil conv Brainee' });
        pushLog('SYS', `🧵 Fil conv créé`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Conv [${mode.name}] ${ch.channelName} [${slot.label}] (${getConvDailyCount()}/${getConvMaxPerDay()})`, 'success');
    broadcast('conversation', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR'), mode: mode.name, slot: slot.label, dayCount: getConvDailyCount() });
  } catch (err) { pushLog('ERR', `Lance-conv échouée : ${err.message}`, 'error'); }
}

async function replyToConversations() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !cfg.canReply || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  if (Math.random() < 0.05) { pushLog('SYS', `💬 Ignore spontané 5%`); return; }
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 100 });
    const msgArray = [...msgs.values()];
    if (!msgArray.length) return;
    const lastMsg = msgArray[0];
    if (lastMsg.author.bot) return;
    const age = Date.now() - lastMsg.createdTimestamp;
    if (age < 20 * 60 * 1000 || age > 3 * 60 * 60 * 1000) return;
    if (Date.now() - (cfg.lastPostByChannel?.[ch.channelId] || 0) < Math.max(getSlotIntervalMs(slot), 90 * 60 * 1000)) return;
    if (Date.now() - shared.lastAnyBotPostTime < MIN_GAP_ANY_POST) return;
    const msgContent = lastMsg.content;
    if (!msgContent || msgContent.length < 5) return;
    const profile = await getMemberProfile(lastMsg.author.id);
    const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
    const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryR = await getChannelDirectory(ch.channelId);
    const intentBlockR = getChannelIntentBlock(channel.name, ch.topic, dirEntryR?.officialDescription || '');
    const context = formatContext(msgs, null, 80);
    const dynamicPrompt = `${toneInstruction}\nHumeur : ${mood}. ${getMoodInjection(mood)}\n${memoryBlock}\n${intentBlockR}\nContexte #${channel.name} :\n${context}\nTu réponds uniquement à ${lastMsg.author.username}.`;
    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(msgContent);
      await lastMsg.react(emoji);
      shared.lastAnyBotPostTime = Date.now();
      await updateConvStats(ch.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
      pushLog('SYS', `😏 Réaction seule → ${lastMsg.author.username} (retour tardif planifié)`);
      scheduleDelayedSpontaneousReply(lastMsg, ch, slot, mood, emoji);
      return;
    }
    const reply = await callClaude(dynamicPrompt, `${lastMsg.author.username} dit : "${msgContent}"\n1-2 phrases.`, 150, BOT_PERSONA_CONVERSATION);
    const replyResolved = resolveMentionsInText(reply, guild);
    if (reactionRoll < 0.30) await lastMsg.react(getRandomReaction(msgContent + reply)).catch(() => {});
    await sendHuman(channel, replyResolved, lastMsg);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
    const hasEngagement = (lastMsg.reactions?.cache?.size > 0) ||
      ([...msgs.values()].filter(m => m.reference?.messageId === lastMsg.id).length > 0);
    if (shouldCreateThread(reply, channel.name, hasEngagement)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${reply}"`, 60);
        await lastMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil reply Brainee' });
        pushLog('SYS', `🧵 Fil reply créé (avec engagement)`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Reply → ${lastMsg.author.username} (mood: ${mood})`, 'success');
    broadcast('conversation', { channel: ch.channelName, type: 'reply' });
  } catch (err) {
    if (!err.message.includes('Missing Permissions') && !err.message.includes('Unknown Message')) {
      pushLog('ERR', `Reply échouée : ${err.message}`, 'error');
    }
  }
}

module.exports = { postRandomConversation, replyToConversations };
