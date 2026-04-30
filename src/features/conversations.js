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
const { getDailyVibe, shouldSkipConvCron } = require('../bot/adaptiveSchedule');
const { getChannelIntentBlock, getModeInjectionForChannel } = require('../bot/channelIntel');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { sanitizeForJson } = require('../utils');
const { getRandomReaction, shouldCreateThread } = require('../bot/reactions');
const {
  getEmotionalInjection, getTemperamentInjection, detectEmotionFromMessage,
  updateInternalStatesForSlot, applyNaturalDecay, adjustMaxTokens, getInternalState,
} = require('../bot/emotions');
const { ensureMemberBond, applyInteractionToBond, describeBond } = require('../db/memberBonds');
const { NO_TAG_CLAUSE, LIGHT_TAG_CLAUSE } = require('./greetings');
const { formatContext } = require('./context');
const { scheduleDelayedSpontaneousReply } = require('./delayedReply');
const {
  getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded,
  updateConvStats, getQuietestChannel, hasUnansweredLastPost, isDeepTopicChannel,
  isChannelDeadThisWeek, resetWeeklyPostCount,
} = require('./convStats');
const { shouldRespond, recordMessageTopic } = require('./decisionLogic');
const { getNarrativeContext } = require('../db/narrativeMemory');
const { getCachedBlocks, setCacheBlocks } = require('../bot/dailyCache');
const { logMessageForBridge } = require('./dmServerBridge');

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

    // No-insist : si Brainee a posté dans ce salon et que personne n'a répondu depuis,
    // on ne relance PAS dessus (évite le monologue).
    const channelResolver = async (id) => {
      const g = await shared.discord.guilds.fetch(GUILD_ID);
      await g.channels.fetch();
      return g.channels.cache.get(id);
    };
    const alone = await hasUnansweredLastPost(ch.channelId, channelResolver);
    if (alone) {
      pushLog('SYS', `🔇 Skip ${ch.channelName} — dernier post sans réponse humaine (no-insist)`);
      return;
    }
    // Calme plat : si aucune activité humaine depuis 72h et déjà 2 posts cette semaine → pause
    if (await isChannelDeadThisWeek(ch.channelId, channelResolver)) {
      pushLog('SYS', `🔇 Skip ${ch.channelName} — calme plat (limite 2 posts/semaine sans interaction)`);
      return;
    }
    const isDeep = isDeepTopicChannel(ch.channelName);
    const mode = getRandomMode(slot);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    const vibe = getDailyVibe();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryC = await getChannelDirectory(ch.channelId);
    const intentBlockC = getChannelIntentBlock(channel.name, ch.topic, dirEntryC?.officialDescription || '');
    const modeBlock = getModeInjectionForChannel(mode, channel.name, ch.topic);
    // Utiliser le cache pour émotions/narratives (change rarement pendant la journée)
    let emotionBlock, temperamentBlock, narrativeBlock;
    const cached = getCachedBlocks();
    if (cached) {
      emotionBlock = cached.emotionalBlock;
      temperamentBlock = cached.temperamentBlock;
      narrativeBlock = cached.narrativeBlock;
    } else {
      emotionBlock = getEmotionalInjection();
      temperamentBlock = getTemperamentInjection();
      narrativeBlock = await getNarrativeContext();
      setCacheBlocks(emotionBlock, temperamentBlock, narrativeBlock);
    }
    let contextBlock = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 40 });
      const ctx = formatContext(msgs, null, 40);
      if (ctx.length > 20) contextBlock = `\nContexte récent:\n${ctx}`;
    } catch (_) {}
    const deepInject = isDeep
      ? `\nCONTEXTE SALON : c'est un salon de thématique profonde (${channel.name}). Lance un angle vraiment fouillé, qui donne envie de creuser. Pas de question générique. Tu peux être plus précise, citer un détail, un souvenir, un mécanisme, une référence. Laisse l'entrée ouverte mais pas vague. Si personne ne rebondit, c'est ok — tu n'insistes pas.`
      : '';
    const content = await callClaude(
      `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name} — ${vibe.desc}.\n${temperamentBlock}\n${emotionBlock}\n${memoryBlock}\n${narrativeBlock}\n${intentBlockC}\n${modeBlock}${deepInject}\n${NO_TAG_CLAUSE}` + contextBlock,
      `Max 3 phrases. Direct. Adapte-toi au salon. Pas de @ à quelqu'un — c'est un lance-conv ambiant.`,
      adjustMaxTokens(isDeep ? 200 : 150),
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    const sentMsg = await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    // Threads désactivés par défaut (personne ne les utilise)
    // Peuvent être activés sur demande explicite seulement
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

    // v2.2.4 : Check if Brainee should respond (autonomy logic)
    const vibe = getDailyVibe();
    const internalState = getInternalState();
    const decision = await shouldRespond(slot, vibe, internalState.mentalLoad, msgContent, false);

    if (!decision.should) {
      pushLog('SYS', `🙅 Skip reply (${decision.reason}): ${decision.message ? decision.message : ''}`);
      if (decision.message && Math.random() < 0.3) {
        try {
          await lastMsg.react('😴').catch(() => {});
        } catch (_) {}
      }
      return;
    }

    // Record topic for fatigue tracking
    await recordMessageTopic(msgContent);

    const profile = await getMemberProfile(lastMsg.author.id);
    const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    detectEmotionFromMessage(msgContent, { userId: lastMsg.author.id });
    const bond = await ensureMemberBond(lastMsg.author.id, lastMsg.author.username);
    const bondBlock = describeBond(bond, lastMsg.author.username);
    const emotionBlock = getEmotionalInjection();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryR = await getChannelDirectory(ch.channelId);
    const intentBlockR = getChannelIntentBlock(channel.name, ch.topic, dirEntryR?.officialDescription || '');
    const context = formatContext(msgs, null, 80);
    const dynamicPrompt = `${toneInstruction}\n💞 LIEN : ${bondBlock}\nHumeur : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name}.\n${emotionBlock}\n${memoryBlock}\n${intentBlockR}\nContexte #${channel.name} :\n${context}\nTu réponds à ${lastMsg.author.username} via reply (pas besoin de tag).\n${LIGHT_TAG_CLAUSE}`;
    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(msgContent);
      await lastMsg.react(emoji);
      shared.lastAnyBotPostTime = Date.now();
      await updateConvStats(ch.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
      await applyInteractionToBond(lastMsg.author.id, lastMsg.author.username, msgContent);
      pushLog('SYS', `😏 Réaction seule → ${lastMsg.author.username} (retour tardif planifié)`);
      scheduleDelayedSpontaneousReply(lastMsg, ch, slot, mood, emoji);
      return;
    }
    const reply = await callClaude(dynamicPrompt, `${lastMsg.author.username} dit : "${msgContent}"\n1-2 phrases.`, adjustMaxTokens(150), BOT_PERSONA_CONVERSATION);
    const replyResolved = resolveMentionsInText(reply, guild);
    if (reactionRoll < 0.30) await lastMsg.react(getRandomReaction(msgContent + reply)).catch(() => {});
    // Si le message parle d'un jeu et qu'un fil existe déjà → répondre dans le fil plutôt que le channel
    const { THREAD_TRIGGERS } = require('../bot/keywords');
    const lowerReply = replyResolved.toLowerCase();
    const lowerMsg = msgContent.toLowerCase();
    let postedInThread = false;
    try {
      const matchedTopic = THREAD_TRIGGERS.find(kw => lowerReply.includes(kw) || lowerMsg.includes(kw));
      if (matchedTopic) {
        const activeThreads = await channel.threads.fetchActive();
        const existingThread = activeThreads.threads.find(t =>
          THREAD_TRIGGERS.some(kw => t.name.toLowerCase().includes(kw) && (lowerReply.includes(kw) || lowerMsg.includes(kw)))
        );
        if (existingThread) {
          await existingThread.send(`<@${lastMsg.author.id}> ${replyResolved}`);
          pushLog('SYS', `🧵 Reply dans fil existant "${existingThread.name}"`, 'success');
          broadcast('conversation', { channel: ch.channelName, type: 'thread-reply' });
          postedInThread = true;
        }
      }
    } catch (_) {}
    if (!postedInThread) {
      await sendHuman(channel, replyResolved, lastMsg, { bond });
      pushLog('SYS', `💬 Reply → ${lastMsg.author.username} (mood: ${mood})`, 'success');
      broadcast('conversation', { channel: ch.channelName, type: 'reply' });
    }
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
    await applyInteractionToBond(lastMsg.author.id, lastMsg.author.username, msgContent);
  } catch (err) {
    if (!err.message.includes('Missing Permissions') && !err.message.includes('Unknown Message')) {
      pushLog('ERR', `Reply échouée : ${err.message}`, 'error');
    }
  }
}

module.exports = { postRandomConversation, replyToConversations };
